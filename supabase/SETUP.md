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

### PayU payment setup

The PayU adapter is in `supabase/functions/payu-payment/index.ts`. Deploy it as a Supabase Edge Function:

```powershell
supabase functions deploy payu-payment
```

Configure these Edge Function secrets. Never put them in Vite variables or GitHub Pages variables:

```text
PAYU_MERCHANT_KEY=your-payU-key
PAYU_MERCHANT_SALT=your-payU-salt
PAYU_ENVIRONMENT=test
PUBLIC_SITE_ORIGIN=https://your-domain.example
PUBLIC_SITE_PATH=/Sthenofy/
```

Use `production` only after PayU has approved the merchant account. The function creates the PayU hosted-checkout hash server-side, receives PayU's success/failure callback, verifies the response hash, and only then changes a booking from `hold/pending` to `confirmed/paid`. The browser redirect is never treated as proof of payment.

Run the payment-fields migration after the original appointment migration:

```text
supabase/migrations/20261014000000_add_payu_payment_fields.sql
```

In the PayU dashboard, configure the success and failure callback URL to:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/payu-payment
```

Run PayU test payments first. Configure the correct PayU test/production merchant endpoints according to the PayU account product enabled for Sthenofy.

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
http://127.0.0.1:5173/Sthenofy/
```

Admin dashboard:

```text
http://127.0.0.1:5173/Sthenofy/admin
```

## 5. GitHub Pages variables

Add both values as GitHub Actions **repository variables**:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-publishable-anon-key
```

You may use **Settings → Secrets and variables → Actions → Variables → New repository variable**. If you prefer, repository Actions secrets with the same names also work. The deployment workflow checks that both values exist before building, injects them at build time, and stops without publishing if either is missing. Publishing a post changes Supabase data and does not require a website redeployment.

## 6. Migrating legacy posts

The original sample posts remain in `src/data/legacyBlogPosts.ts`. Create equivalent rows through the admin dashboard or import them with a trusted one-time script using a server-side service-role key. Never put that service-role key in the frontend or repository.
