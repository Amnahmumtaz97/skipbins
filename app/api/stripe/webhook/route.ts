import {
  markBookingPaid,
  recordCheckoutAttempt,
} from "@/lib/server/booking-service";
import { getStripe } from "@/lib/server/stripe";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!signature || !secret) {
    return Response.json({ error: "Webhook is not configured" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded" &&
    event.type !== "checkout.session.async_payment_failed"
  ) {
    return Response.json({ received: true }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;
    const attempt = Number(session.metadata?.checkoutAttempt);
    if (!bookingId || !Number.isInteger(attempt) || attempt < 1 || !session.id)
      throw new Error("Stripe event is missing booking identifiers");

    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

    if (event.type === "checkout.session.async_payment_failed") {
      await recordCheckoutAttempt({ bookingId, attempt, sessionId: session.id, paymentIntentId, status: "failed" });
    } else if (session.payment_status === "paid") {
      await recordCheckoutAttempt({ bookingId, attempt, sessionId: session.id, paymentIntentId, status: "paid" });
      const booking = await markBookingPaid({
        id: bookingId,
        stripeSessionId: session.id,
        metadataBookingId: session.metadata?.bookingId,
        paymentIntentId: paymentIntentId ?? undefined,
        amountTotal: session.amount_total,
        currency: session.currency,
      });
      if (!booking || booking.status !== "paid")
        throw new Error("Stripe payment did not match its pending booking");
    } else {
      await recordCheckoutAttempt({ bookingId, attempt, sessionId: session.id, paymentIntentId, status: "processing" });
    }

    return Response.json({ received: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[stripe-webhook] Could not process checkout event", {
      eventId: event.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return Response.json({ error: "Could not process event" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
