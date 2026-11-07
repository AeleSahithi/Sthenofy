# Supabase setup

## 1. Create the project

Create a Supabase project, then copy its project URL and publishable anon key from **Project settings → API**.

Create a local `.env` file in the repository root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-anon-key
```

The publishable/anon key is safe to expose in a browser when Row Level Security is enabled. Never put a service-role key in `.env`, the frontend, or GitHub variables.

## 2. Run the database migration

Open **SQL Editor** in Supabase and run:

```text
supabase/migrations/20261013000000_create_blog_system.sql
```

The migration creates `blog_posts`, `admin_users`, the `blog-media` storage bucket, and policies that expose only published posts publicly.

For appointments, also run:

```text
supabase/migrations/20261013010000_create_appointment_booking_system.sql
```

This creates `service_types`, `working_hours`, `schedule_exceptions`, and `bookings`. It also creates the `create_booking`, `cancel_booking`, and `get_booked_intervals` functions. The booking function uses a database exclusion constraint, so two customers cannot hold overlapping slots.

After running the appointment migration:

1. Add the services and prices that should be bookable in `service_types`, or use **Services & Pricing** in the admin dashboard.
2. Add regular opening hours in `working_hours`, or use **Schedule** in the admin dashboard.
3. Add holidays or special hours to `schedule_exceptions`.
4. Confirm the public Services page shows the configured services and times.

Prices are read from Supabase and are not hardcoded in the frontend. Appointment times are stored as UTC instants and displayed in `Asia/Kolkata`.

Run the payment-fields migration after the original appointment migration:

```text
supabase/migrations/20261014000000_add_payu_payment_fields.sql
```

Then run the admin-slots and payment-link migration:

```text
supabase/migrations/20261030000000_admin_slots_and_hourly_blocks.sql
```

Then `supabase/migrations/20261031000000_restrict_internal_functions.sql`, which stops anonymous visitors calling internal helper functions.

The admin-slots migration adds `blocked` bookings (time the admin is unavailable), admin-created bookings, PayU payment-link bookings, a `bookings.amount` price snapshot that the database fills from `service_types`, and one-hour appointment blocks. Blocked time and confirmed/held bookings all show as **Booked** on the public calendar, and the database prevents any overlap between them.

### Customer booking and PayU payment (verified on the server)

Migration `20261107000000_paid_checkout_and_dual_calendar.sql` (run after `20261101…` and `20261105…`).

1. Services page → **Get Started** scrolls to **Book your consultation** with that service preselected (`/services/?service=diabetes` also works). The fee is shown under the heading: one price when every visible service costs the same, otherwise "from" the lowest price.
2. The customer picks a service card, a date (times are checked live against both Google Calendars) and a time, and fills in their details.
3. **Pay & Book** calls the `booking-checkout` Edge Function. It re-checks both calendars, holds the slot for 10 minutes (`create_checkout_hold`; the price comes from `service_types`, never from the browser) and returns a signed PayU form. The browser goes to PayU's checkout page.
4. PayU posts the result to `payu-payment`, which checks the response hash, asks PayU's `verify_payment` API, and compares the amount with `bookings.amount`. Only then does `record_verified_payment` mark the booking paid. A failed or cancelled payment frees the slot at once.
5. The `booking-worker` creates the event in every connected Google Calendar (one Meet link), stores both event IDs, and only then sets the booking to `confirmed`. That sends exactly one confirmation email (Meet link, .ics invitation, questionnaire link) and one "New booking (paid)" email to the admin.
6. The customer's page waits for the confirmation, then redirects to the service's questionnaire.

If Google Calendar does not respond, the worker retries for about an hour; the booking shows under **Needs attention** in Admin → Bookings with **Confirm now**. A payment that arrives after the slot was retaken, or with the wrong amount, also shows there.

PayU secrets (Supabase → Edge Functions → Secrets): `PAYU_MERCHANT_KEY`, `PAYU_MERCHANT_SALT`, and `PAYU_ENVIRONMENT=production` for real payments (any other value uses PayU's test system). In the PayU dashboard, add the webhook URL `https://fmexlqqgdrdkboefeguk.supabase.co/functions/v1/payu-payment?source=webhook` for successful and failed payments, so a customer who closes the tab after paying is still confirmed.

### Questionnaires (Google Forms)

Admin → **Services & Pricing** → paste each service's Google Form link (`https://docs.google.com/forms/…` or `https://forms.gle/…`) and **Save**. It is stored in `service_types.questionnaire_url`. It is used for the redirect after confirmation, the confirmation email and the 24-hour reminder. A service without a link simply has no redirect.

The old static payment link flow (`submit_payment_reference`, `release_booking_hold`) stays in the database for older bookings but the website no longer uses it.

## 3. Create the first admin

In **Authentication → Users**, create an email/password user manually. Public sign-up should remain disabled.

Copy that user's UUID and run in SQL Editor:

```sql
insert into public.admin_users (user_id)
values ('AUTH_USER_UUID');
```

The user can then sign in at `/admin`.

### Inviting another administrator

1. Supabase → **Authentication → URL Configuration**: Site URL `https://sthenofy.com/admin`, and `https://sthenofy.com/admin` in Redirect URLs (one-time setup; invite and reset links land there).
2. **Authentication → Users → Add user → Send invitation** with their email. Supabase emails them a link.
3. Authorise them in **SQL Editor** (they can do step 4 before or after this):

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'their.email@example.com';
   ```

4. They open the email link, choose a password on the **Set your password** screen, and land in the dashboard. Afterwards they sign in at `https://sthenofy.com/admin`.

To remove access: `delete from public.admin_users where user_id = (select id from auth.users where email = 'their.email@example.com');` (or delete the user under Authentication → Users).

## 4. Run locally

From the repository root:

```powershell
npm.cmd run dev -- --host 127.0.0.1
```

Public website:

```text
http://127.0.0.1:5173/
```

Admin dashboard:

```text
http://127.0.0.1:5173/admin
```

## 5. Hosting on Hostinger (https://sthenofy.com)

The site is a static build uploaded to Hostinger's `public_html` by `.github/workflows/deploy.yml` on every push to `main`. DNS stays on Hostinger; email (Google Workspace MX/TXT records) is not affected.

`public/.htaccess` handles HTTPS + non-www redirects, 301 redirects from the old WordPress URLs, routing for app pages, and a real 404 status for unknown URLs.

GitHub Actions configuration (**Settings → Secrets and variables → Actions**):

```text
Variables (or Secrets): SUPABASE_URL, SUPABASE_ANON_KEY
Secrets:                FTP_SERVER, FTP_USERNAME, FTP_PASSWORD
Optional variable:      FTP_PROTOCOL = ftp   (only if FTPS fails; default is ftps)
```

Create the FTP account in hPanel → **Files → FTP Accounts** with its directory set to `public_html`, so the account's root is the website folder. The workflow stops before building if any value is missing. It only uploads changed files and never deletes files it did not upload.

In Supabase → **Authentication → URL Configuration**, set **Site URL** to `https://sthenofy.com` and add `https://sthenofy.com/admin` to **Redirect URLs** so admin password-reset links work.

Publishing a blog post or changing prices changes Supabase data and does not require a redeploy.

## 6. Booking emails, reminders, Google Calendar and Meet

How it works: every booking change is queued in `booking_events` by a database trigger. The `booking-worker` Edge Function is called right away (pg_net) and every minute (pg_cron). It sends emails through Resend, creates/moves/deletes Google Calendar events with Meet links, sends reminders 24 hours and 1 hour before confirmed sessions, and every 10 minutes copies busy times from Google Calendar into `calendar_busy`, which hides those times from customers.

| Event | Customer gets | Admin gets |
|---|---|---|
| Customer reserves a slot | "Slot reserved" with PayU link | "New reservation" |
| Customer submits PayU reference | — | "Payment to verify" |
| Admin confirms payment / books for a customer | "Confirmed" + Meet link + calendar file, and a Google Calendar invite | Event in Google Calendar |
| Admin reschedules | "Rescheduled" + updated invite | Event moved |
| Admin cancels | "Cancelled" | Event removed |
| 24 h and 1 h before | Reminder with Meet link | — |

Setup order:

1. **Deploy the functions** (from the repository root):

   ```powershell
   supabase functions deploy booking-worker --no-verify-jwt
   supabase functions deploy google-oauth --no-verify-jwt
   supabase functions deploy google-calendar-webhook --no-verify-jwt
   supabase functions deploy booking-checkout --no-verify-jwt
   supabase functions deploy payu-payment --no-verify-jwt
   ```

   Each checks authorisation itself (a database-generated secret, the admin's session, the Google channel token, or the PayU hash), and PayU and Google cannot send a Supabase JWT, which is why JWT verification is off.

2. **Email (Resend):** create an account at resend.com, add the domain `sthenofy.com`, and add the DNS records Resend shows in Hostinger → DNS / Nameservers. Resend uses the `send` subdomain and a `resend._domainkey` record, so the Google Workspace MX and SPF records on the main domain are untouched. Create an API key.
3. **Google Calendar:** signed in to Google Cloud Console with the Workspace account whose calendar should receive bookings:
   1. Create a project, then enable **Google Calendar API**.
   2. Google Auth Platform → **Audience: Internal** (no Google review needed), app name "Sthenofy Bookings".
   3. **Clients → Create client → Web application**, Authorised redirect URI: `https://fmexlqqgdrdkboefeguk.supabase.co/functions/v1/google-oauth`. Copy the Client ID and Client secret.
4. **Supabase → Edge Functions → Secrets** (never commit these):

   ```text
   RESEND_API_KEY        from Resend
   EMAIL_FROM            STHENOFY <bookings@sthenofy.com>
   ADMIN_EMAIL           support@sthenofy.com
   GOOGLE_CLIENT_ID      from Google Cloud
   GOOGLE_CLIENT_SECRET  from Google Cloud
   ```

5. **Run the migration** in SQL Editor: `supabase/migrations/20261101000000_booking_notifications_and_google_calendar.sql`. It enables `pg_net` and `pg_cron` and schedules the worker. Bookings made before `RESEND_API_KEY` is set stay queued and are sent once it is.
6. **Connect both calendars:** Admin → Bookings → **Connect calendar 1**, sign in with the first account; then **Connect calendar 2** and sign in with the second account (the same account cannot be used twice). If the second account is not in the same Google Workspace, set the Google Auth Platform **Audience** to *External* and publish the app (In production); otherwise Google refuses the sign-in.

**Two calendars:** a time is offered only when both calendars are free. Busy times are copied per calendar every 5 minutes and immediately when Google sends a push notification (`google-calendar-webhook`; channels are renewed automatically before their 7-day expiry). Right before a booking, and when a customer picks a date, both calendars are also checked live with the FreeBusy API. Events created by the website have IDs derived from the booking ID, so retries never create duplicates; their IDs are stored in `bookings.google_event_id` (calendar 1) and `google_event_id_2` (calendar 2). Rescheduling or cancelling in Admin moves or deletes both events. The website database is the source of truth for website bookings: editing a website event by hand in Google does not move the booking.

Troubleshooting: Supabase → Edge Functions → `booking-worker` → Logs; failed events keep their error in `booking_events.last_error` (retried up to 5 times); Google problems are shown in the admin Bookings panel.

## 7. Migrating legacy posts

The original sample posts remain in `src/data/legacyBlogPosts.ts`. Create equivalent rows through the admin dashboard or import them with a trusted one-time script using a server-side service-role key. Never put that service-role key in the frontend or repository.
