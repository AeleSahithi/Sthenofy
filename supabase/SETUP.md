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

### PayU payment (payment link)

Customers pay through the static PayU payment link `https://u.payu.in/8rW2Lhb18XZD` (set in `PAYU_PAYMENT_LINK` in `src/lib/appointments.ts`). No merchant key or salt is used by the website.

1. The customer picks a service (price from Supabase), a slot, and fills in their details.
2. **Reserve Slot** calls `create_booking`, which holds the slot for 60 minutes and saves the service price from the database in `bookings.amount`.
3. **Pay Now** opens the PayU link in a new tab. Clicking it never changes payment status.
4. After paying, the customer can submit their PayU transaction ID. This only records the reference and keeps the slot held for 24 hours; it does not mark anything paid.
5. The admin checks the payment in the PayU dashboard (amount, email, phone, transaction ID) and clicks **Confirm payment** in Admin → Bookings. Only then is the booking `confirmed / paid`.

Limitation: a static payment link cannot receive the booking ID or the amount from the website, and PayU does not tell the website which booking a link payment belongs to. If the link has a fixed amount, every customer pays that amount whatever the service price is; if it lets the customer enter an amount, the customer could enter the wrong amount. That is why the admin compares the PayU payment with `bookings.amount` before confirming.

The older merchant-key checkout (`supabase/functions/payu-payment`) is no longer called by the website. Its secrets stay only in Supabase Edge Function secrets. It can be removed with `supabase functions delete payu-payment` once you no longer need it.

## 3. Create the first admin

In **Authentication → Users**, create an email/password user manually. Public sign-up should remain disabled.

Copy that user's UUID and run in SQL Editor:

```sql
insert into public.admin_users (user_id)
values ('AUTH_USER_UUID');
```

The user can then sign in at `/admin`. To add another administrator, create another Auth user and insert their UUID into `admin_users`.

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

## 6. Migrating legacy posts

The original sample posts remain in `src/data/legacyBlogPosts.ts`. Create equivalent rows through the admin dashboard or import them with a trusted one-time script using a server-side service-role key. Never put that service-role key in the frontend or repository.
