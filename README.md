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
5. Run `supabase/schema.sql` from the Supabase SQL Editor. It creates the bookings table and enables Row Level Security.
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
- `STRIPE_WEBHOOK_SECRET`

The server secret is required because checkout creation updates the booking with
its Stripe Checkout session ID. The public key can insert bookings under the
included RLS policy, but it intentionally cannot update or read them.

Configure the Stripe webhook endpoint as
`https://your-domain.example/api/stripe/webhook` and subscribe it to
`checkout.session.completed`.
