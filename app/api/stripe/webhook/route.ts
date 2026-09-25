import { attachCheckoutSession, markBookingPaid } from "@/lib/server/booking-service";
import { getStripe } from "@/lib/server/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!signature || !secret) {
    return Response.json({ error: "Webhook is not configured" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (typeof session.id === "string") {
      const bookingId = typeof session.metadata?.bookingId === "string" ? session.metadata.bookingId : undefined;
      if (bookingId) await attachCheckoutSession(bookingId, session.id).catch(() => undefined);
      await markBookingPaid({ id: bookingId, stripeSessionId: session.id });
    }
  }

  return Response.json({ received: true }, { headers: { "Cache-Control": "no-store" } });
}
