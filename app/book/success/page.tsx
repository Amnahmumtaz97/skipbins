import Link from "next/link";
import type { Metadata } from "next";
import { BookingOrderConfirmation } from "@/components/book/booking-order-confirmation";
import { ClearBookingDraft } from "@/components/book/clear-booking-draft";
import { Navbar } from "@/components/home/navbar";
import { getBookingByCheckoutSession, getBookingById, getCheckoutAttemptBySession, markBookingPaid, recordCheckoutAttempt } from "@/lib/server/booking-service";
import { getStripe } from "@/lib/server/stripe";

export const metadata: Metadata = {
  title: "Booking confirmed | Premium Skip Bin Hire",
  description: "Your Premium Skip Bin Hire payment and booking details.",
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BookingSuccessPage({ searchParams }: PageProps<"/book/success">) {
  const sessionId = firstParam((await searchParams).session_id);
  const result = await loadBookingStatus(sessionId);
  const booking = result?.booking ?? null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F4F7EC] text-[#172018]">
      <Navbar />
      <div aria-hidden="true" className="pointer-events-none absolute -right-28 top-24 h-80 w-80 rounded-full bg-[#DDECCB]/70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-[34rem] h-96 w-96 rounded-full bg-[#d6dfd2]/80 blur-3xl" />
      {booking?.status === "paid" ? <ClearBookingDraft /> : null}
      <div className="relative mx-auto w-full max-w-[1120px] px-5 pb-20 pt-32 sm:px-6 sm:pt-36 lg:px-8">
        {booking?.status === "paid" ? <BookingOrderConfirmation booking={booking} /> : <UnconfirmedBooking booking={booking} paymentStatus={result?.paymentStatus ?? "unknown"} sessionId={sessionId} />}
      </div>
    </main>
  );
}

function UnconfirmedBooking({ booking, paymentStatus, sessionId }: {
  booking: Awaited<ReturnType<typeof getBookingById>>;
  paymentStatus: "paid" | "processing" | "failed" | "unpaid" | "unknown";
  sessionId?: string;
}) {
  const processing = paymentStatus === "processing" || paymentStatus === "unknown";
  return (
    <div className="mx-auto max-w-[620px] rounded-[28px] border border-[#d6dfd2] bg-white px-6 py-10 text-center shadow-[0_18px_60px_rgba(11, 59, 36,0.08)] sm:px-10 sm:py-12">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#DDECCB] text-2xl text-[#765F19]">!</span>
      <h1 className="mt-5 text-[25px] font-semibold tracking-[-0.025em] text-[#0B3B24]">{processing ? "Payment is processing" : paymentStatus === "failed" ? "Payment was not completed" : "We couldn't confirm that payment"}</h1>
      <p className="mx-auto mt-2 max-w-[450px] text-[14px] leading-relaxed text-[#405347]">
        {booking ? <>Booking <strong>{booking.reference}</strong> is saved with status <strong>{booking.status === "paid" ? "paid" : "awaiting payment"}</strong>. {processing ? "Stripe is still confirming the payment. Refresh this page in a moment." : "Your original booking details and price are saved. You can return to payment when ready."}</> : "We could not verify the booking for this payment session. Please contact support before trying to pay again."}
      </p>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        {booking?.status === "pending" && (paymentStatus === "unpaid" || paymentStatus === "failed") ? <Link href="/booking?cancelled=1" className="inline-flex items-center justify-center rounded-full bg-[#0B3B24] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#14532D]">Pay again</Link> : null}
        {sessionId ? <Link href={`/book/success?session_id=${encodeURIComponent(sessionId)}`} className="inline-flex items-center justify-center rounded-full border-[1.5px] border-[#d6dfd2] px-6 py-3 text-sm font-bold text-[#0B3B24] transition hover:bg-[#F4F7EC]">Refresh payment status</Link> : null}
        <Link href="/contact" className="inline-flex items-center justify-center rounded-full border-[1.5px] border-[#d6dfd2] px-6 py-3 text-sm font-bold text-[#0B3B24] transition hover:bg-[#F4F7EC]">Contact support</Link>
      </div>
    </div>
  );
}

async function loadBookingStatus(sessionId?: string) {
  if (!sessionId || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) return null;
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const bookingId = typeof session.metadata?.bookingId === "string" ? session.metadata.bookingId : undefined;
    const attempt = Number(session.metadata?.checkoutAttempt);
    if (!bookingId || !Number.isInteger(attempt) || attempt < 1) return null;
    let booking = await getBookingById(bookingId);
    if (!booking || booking.amount_cents !== session.amount_total || session.currency?.toLowerCase() !== "aud") return null;
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
    if (session.payment_status === "paid") {
      await recordCheckoutAttempt({ bookingId, attempt, sessionId: session.id, paymentIntentId, status: "paid" });
      booking = await markBookingPaid({ id: bookingId, stripeSessionId: session.id, metadataBookingId: session.metadata?.bookingId, paymentIntentId: paymentIntentId ?? undefined, amountTotal: session.amount_total, currency: session.currency }) ?? booking;
      return { booking, paymentStatus: booking.status === "paid" ? "paid" as const : "processing" as const };
    }
    const recordedAttempt = await getCheckoutAttemptBySession(session.id);
    if (!recordedAttempt || recordedAttempt.booking_id !== bookingId || recordedAttempt.attempt !== attempt) return null;
    const paymentIntentStatus = session.status === "complete" && paymentIntentId
      ? (await getStripe().paymentIntents.retrieve(paymentIntentId)).status
      : null;
    const paymentStatus = recordedAttempt.status === "failed" || paymentIntentStatus === "requires_payment_method" || paymentIntentStatus === "canceled"
      ? "failed" as const
      : session.status === "complete"
        ? "processing" as const
      : "unpaid" as const;
    await recordCheckoutAttempt({
      bookingId,
      attempt,
      sessionId: session.id,
      paymentIntentId,
      status: paymentStatus === "failed" ? "failed" : paymentStatus === "processing" ? "processing" : session.status === "expired" ? "expired" : "open",
    });
    booking = await getBookingByCheckoutSession(session.id) ?? booking;
    return { booking, paymentStatus };
  } catch {
    const booking = await getBookingByCheckoutSession(sessionId);
    return booking ? { booking, paymentStatus: "unknown" as const } : null;
  }
}
