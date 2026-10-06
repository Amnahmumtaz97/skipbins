# SkipBins

This is a Next.js skip bin booking site using the App Router and Supabase.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Project structure

```text
app/                  Next.js routes, layouts, and API route handlers
components/home/      Home page sections and feature-specific components
components/ui/        Reusable interactive UI primitives
hooks/                Client-side React hooks
lib/data/             Static domain data and configuration
lib/supabase/         Supabase browser and server clients
types/                Shared TypeScript domain types
public/               Static assets
```

Keep route files thin. Put reusable visual pieces in `components`, browser state and effects in `hooks`, pure helpers and data access in `lib`, and shared contracts in `types`.

## Supabase setup

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. In **Project Settings > API**, copy the project URL, publishable key, and a
   server-only secret key.
3. Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-secret-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

4. Never expose `SUPABASE_SECRET_KEY`, a legacy `service_role` key, or Stripe
   secret keys in a `NEXT_PUBLIC_` variable or browser code.
5. Run `supabase/schema.sql` from the Supabase SQL Editor. It creates the customer and booking tables, links each booking to a customer, and enables Row Level Security. Run it again when updating an existing project; the migration statements are idempotent.
6. Restart the dev server after changing environment variables.

Use `lib/supabase/client.ts` for browser interactions and `lib/supabase/server.ts` for Server Components, Server Actions, or Route Handlers. For booking submission, validate the form in a server action or `app/api/bookings/route.ts`, then insert through the server client. Keep public reads and user-owned writes protected by explicit RLS policies.

## Vercel checkout configuration

Add the following variables in **Vercel > Project Settings > Environment
Variables** for Production (and Preview if preview deployments should accept
payments), then redeploy:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (preferred) or `SUPABASE_SERVICE_ROLE_KEY` (legacy)
- `STRIPE_SECRET_KEY`
- `STRIPE_TEST_SECRET_KEY` (test-mode secret used only by the admin diagnostic)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ADMIN_EMAILS` (comma-separated Supabase Auth users allowed into `/admin`)
- `GET_ADDRESS_API_KEY`

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is embedded into the browser bundle at
build time, so a new deployment is required after adding or changing it.
`GET_ADDRESS_API_KEY` is read by `/api/addresses` at request time and is never
sent to the browser. Create an Australian address API key in getAddress.io.
`GETADDRESS_API_KEY` is also accepted for deployments already using that name.

The server secret is required because checkout creates or reuses a private
customer record, stores its Stripe Customer ID, and updates the booking with
its Stripe Checkout session ID. The public key can insert bookings under the
included RLS policy, but it intentionally cannot read customer records or
update bookings.

Configure the Stripe webhook endpoint as
`https://your-domain.example/api/stripe/webhook` and subscribe it to
`checkout.session.completed`.

## Admin payment test

Create the admin user in **Supabase > Authentication > Users**, add the same
email to the server-only `ADMIN_EMAILS` environment variable, and visit
`/admin`. The Stripe test tool uses an A$1.00 test-mode charge, safely above the
account's converted settlement-currency minimum, and does not create a row in
the bookings table. A user with `app_metadata.role` set to `admin` is also
accepted. Set `STRIPE_TEST_SECRET_KEY` to an `sk_test_` key; when omitted, the
tool only falls back to `STRIPE_SECRET_KEY` if that key is also in test mode.

## Admin portal upgrade

Run these SQL files in the Supabase SQL Editor, in order, before deploying:

1. `supabase/schema.sql`
2. `supabase/operations-migration.sql`
3. `supabase/supplier-applications-migration.sql`
4. `supabase/admin-portal-migration.sql`

The last migration adds private business settings, per-waste bin rates, verified VIC locality coverage, customer status, booking sources, supplier details, and `reserve_admin_booking`. Only the server service role can write these records. It also removes public booking inserts so clients cannot bypass stock reservations. No records or personal information from the demo video are included.

The portal includes bookings with daily and advanced filters, supplier allocation and notes, customer history, supplier editing and login-account creation, payout reconciliation, pricing and stock, date overrides, Victorian suburb/postcode coverage, and a business profile with opening hours and bank details. Supplier workspaces remain inside the administrator session.

`AUSPOST_API_KEY` is required for verified Victorian locality search and checkout validation. Coverage can include all Victorian localities or an explicit set of suburbs, with individual exclusions. Supplier coverage uses verified Victorian postcodes, not zones. Prices default to the site's existing catalogue and can be changed per bin/waste combination. Extended hire retains the existing 40% uplift. Weight allowances and excess-tonne rates are recorded for post-weighing reconciliation; they are not automatically charged at checkout. Use blocked delivery days to implement specific holiday closures; the holiday preference is stored in the profile.

Stock limits distinguish blank (unlimited) from zero (unavailable). Paid jobs and active pending reservations consume stock through pickup plus turnaround. The PostgreSQL reservation function uses a per-bin transaction lock so simultaneous checkouts cannot claim the last bin. Pending holds last 31 minutes; Stripe checkout expires after 30 minutes.

Reports use Melbourne dates, include paid non-cancelled bookings, distinguish creation-date revenue from delivery-date payable jobs, and apply PPC exclusions per supplier. Commission and processing fee percentages are configurable estimates, starting at zero; no bank transfer or Stripe payout is initiated by exporting a report. CSVs use per-booking cent rounding and escape formula-leading text.

Validation: `npm run test:admin`, `node node_modules/typescript/bin/tsc --noEmit --incremental false`, and `npm run build`. The retained behavior tests use mocked providers and never write live records. Responsive browser checks used synthetic data at 390, 768 and 1440 pixels with intercepted save requests. The temporary preview route was removed after verification.
