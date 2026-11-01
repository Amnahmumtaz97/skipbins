import Stripe from "stripe";
import { isAdminUser } from "@/lib/server/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

type PaymentRecord = {
  booking_id: string;
  amount_cents: number;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  attempt?: number;
};

type Verification = {
  status: "na" | "verified" | "unverified" | "failed";
  dashboardUrl: string | null;
};

function stripeClients() {
  const candidates = [
    process.env.STRIPE_SECRET_KEY?.trim(),
    process.env.STRIPE_TEST_SECRET_KEY?.trim(),
  ].filter((key): key is string => Boolean(key));
  return [...new Set(candidates)].map((key) => ({
    stripe: new Stripe(key),
    livemode: key.startsWith("sk_live_"),
  }));
}

function dashboardUrl(livemode: boolean, id: string, kind: "pi" | "session") {
  const mode = livemode ? "" : "/test";
  return kind === "pi"
    ? `https://dashboard.stripe.com${mode}/payments/${encodeURIComponent(id)}`
    : `https://dashboard.stripe.com${mode}/checkout/sessions/${encodeURIComponent(id)}`;
}

function sessionMode(id: string): boolean | null {
  if (id.startsWith("cs_test_")) return false;
  if (id.startsWith("cs_live_")) return true;
  return null;
}

async function verify(record: PaymentRecord): Promise<Verification> {
  const sessionId = record.stripe_session_id;
  const storedIntentId = record.stripe_payment_intent_id;
  if (!sessionId && !storedIntentId) return { status: "na", dashboardUrl: null };

  const clients = stripeClients();
  const preferredMode = sessionId ? sessionMode(sessionId) : null;
  const ordered = preferredMode === null
    ? clients
    : [...clients].sort((a, b) => Number(b.livemode === preferredMode) - Number(a.livemode === preferredMode));
  let latestDashboardUrl: string | null = null;

  for (const { stripe } of ordered) {
    try {
      if (sessionId) {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const intentId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;
        const linkedUrl = intentId
          ? dashboardUrl(session.livemode, intentId, "pi")
          : dashboardUrl(session.livemode, session.id, "session");
        latestDashboardUrl = linkedUrl;

        if (preferredMode !== null && session.livemode !== preferredMode) {
          return { status: "failed", dashboardUrl: linkedUrl };
        }
        if (storedIntentId && intentId !== storedIntentId) {
          return { status: "failed", dashboardUrl: linkedUrl };
        }

        const metadata = session.metadata ?? {};
        const matchesBooking = metadata.bookingId === record.booking_id;
        const matchesAmount = session.amount_total === record.amount_cents && session.currency === "aud";
        let intentSucceeded = false;
        if (intentId) {
          const intent = typeof session.payment_intent === "string"
            ? await stripe.paymentIntents.retrieve(intentId)
            : session.payment_intent;
          if (intent && intent.metadata?.bookingId && intent.metadata.bookingId !== record.booking_id) {
            return { status: "failed", dashboardUrl: linkedUrl };
          }
          intentSucceeded = intent?.status === "succeeded";
          if (intent && intent.amount !== record.amount_cents) {
            return { status: "failed", dashboardUrl: linkedUrl };
          }
        }
        if (!matchesBooking || !matchesAmount) return { status: "failed", dashboardUrl: linkedUrl };
        return {
          status: session.payment_status === "paid" && intentSucceeded ? "verified" : "unverified",
          dashboardUrl: linkedUrl,
        };
      }

      const intent = await stripe.paymentIntents.retrieve(storedIntentId!);
      latestDashboardUrl = dashboardUrl(intent.livemode, intent.id, "pi");
      if (intent.metadata?.bookingId !== record.booking_id || intent.amount !== record.amount_cents || intent.currency !== "aud") {
        return { status: "failed", dashboardUrl: latestDashboardUrl };
      }
      return {
        status: intent.status === "succeeded" ? "verified" : "unverified",
        dashboardUrl: latestDashboardUrl,
      };
    } catch {
      // Try the other configured mode key; a wrong-mode API key cannot verify a record.
    }
  }

  if (!latestDashboardUrl) {
    const mode = preferredMode ?? clients[0]?.livemode ?? false;
    latestDashboardUrl = dashboardUrl(
      mode,
      storedIntentId ?? sessionId!,
      storedIntentId ? "pi" : "session",
    );
  }
  return { status: "failed", dashboardUrl: latestDashboardUrl };
}

async function verifyBatch(records: PaymentRecord[]) {
  const results = new Array<Verification>(records.length);
  let index = 0;
  await Promise.all(
    Array.from({ length: Math.min(8, records.length) }, async () => {
      while (index < records.length) {
        const current = index++;
        results[current] = await verify(records[current]);
      }
    }),
  );
  return Object.fromEntries(records.map((record, recordIndex) => [record.booking_id, results[recordIndex]]));
}

export async function POST(request: Request) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return Response.json({ error: "Please sign in as an admin." }, { status: 401 });
  if (!isAdminUser(user)) return Response.json({ error: "Admin access is required." }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const ids = body && typeof body === "object" && "bookingIds" in body
    ? (body as { bookingIds?: unknown }).bookingIds
    : null;
  if (!Array.isArray(ids) || ids.length > 100 || ids.some((id) => typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))) {
    return Response.json({ error: "Provide up to 100 valid booking IDs." }, { status: 400 });
  }
  if (!ids.length) return Response.json({ verifications: {} }, { headers: { "Cache-Control": "no-store" } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return Response.json({ error: "Order verification is not configured." }, { status: 503 });
  const db = createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: bookings, error: bookingError } = await db
    .from("bookings")
    .select("id,amount_cents,stripe_session_id,stripe_payment_intent_id")
    .in("id", ids);
  if (bookingError) return Response.json({ error: "Could not load order payment records." }, { status: 503 });

  const bookingRows = (bookings ?? []) as Array<Record<string, unknown>>;
  const { data: attempts, error: attemptsError } = await db
    .from("booking_checkout_attempts")
    .select("booking_id,attempt,stripe_session_id,stripe_payment_intent_id")
    .in("booking_id", ids)
    .order("attempt", { ascending: false });

  const latestAttempt = new Map<string, Record<string, unknown>>();
  if (!attemptsError) {
    for (const row of (attempts ?? []) as Array<Record<string, unknown>>) {
      const bookingId = String(row.booking_id ?? "");
      if (bookingId && !latestAttempt.has(bookingId)) latestAttempt.set(bookingId, row);
    }
  }

  const records = bookingRows.map((row) => {
    const id = String(row.id);
    const attempt = latestAttempt.get(id);
    return {
      booking_id: id,
      amount_cents: Number(row.amount_cents ?? 0),
      stripe_session_id: (attempt?.stripe_session_id ?? row.stripe_session_id ?? null) as string | null,
      stripe_payment_intent_id: (attempt?.stripe_payment_intent_id ?? row.stripe_payment_intent_id ?? null) as string | null,
    } satisfies PaymentRecord;
  });
  const verifications = await verifyBatch(records);
  return Response.json({ verifications }, { headers: { "Cache-Control": "no-store" } });
}
