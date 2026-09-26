import Link from "next/link";
import type { Metadata } from "next";
import { BookingConfirmation } from "@/components/book/booking-confirmation";
import { ClearBookingDraft } from "@/components/book/clear-booking-draft";
import { Navbar } from "@/components/home/navbar";
import { getBookingByCheckoutSession, markBookingPaid } from "@/lib/server/booking-service";
import { getStripe } from "@/lib/server/stripe";

export const metadata: Metadata = {
  title: "Booking confirmed | SkipBins",
  description: "Your SkipBins payment and booking details.",
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BookingSuccessPage({ searchParams }: PageProps<"/book/success">) {
  const sessionId = firstParam((await searchParams).session_id);
  const booking = await paidBooking(sessionId);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F6F2E7] text-[#16241C]">
      <Navbar />
      <div aria-hidden="true" className="pointer-events-none absolute -right-28 top-24 h-80 w-80 rounded-full bg-[#DDECCB]/70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-[34rem] h-96 w-96 rounded-full bg-[#E9E3C9]/80 blur-3xl" />
      {booking?.status === "paid" ? <ClearBookingDraft /> : null}
      <div className="relative mx-auto w-full max-w-[1120px] px-5 pb-20 pt-32 sm:px-6 sm:pt-36 lg:px-8">
        {booking?.status === "paid" ? <BookingConfirmation booking={booking} /> : <UnconfirmedBooking />}
      </div>
    </main>
  );
}

function UnconfirmedBooking() {
  return (
    <div className="mx-auto max-w-[620px] rounded-[28px] border border-[#E4DDCB] bg-white px-6 py-10 text-center shadow-[0_18px_60px_rgba(22,36,28,0.08)] sm:px-10 sm:py-12">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F1E9CE] text-2xl text-[#765F19]">!</span>
      <h1 className="mt-5 text-[25px] font-semibold tracking-[-0.025em] text-[#0B3B24]">We couldn&apos;t confirm that payment</h1>
      <p className="mx-auto mt-2 max-w-[450px] text-[14px] leading-relaxed text-[#5B6B60]">
        If you completed checkout, wait a moment and refresh this page. You won&apos;t be charged twice. If you cancelled, your booking is still saved so you can try again.
      </p>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/book" className="inline-flex items-center justify-center rounded-full bg-[#0B3B24] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#14532D]">Return to booking</Link>
        <Link href="/contact" className="inline-flex items-center justify-center rounded-full border-[1.5px] border-[#D3D9D0] px-6 py-3 text-sm font-bold text-[#0B3B24] transition hover:bg-[#F6F2E7]">Contact support</Link>
      </div>
    </div>
  );
}

async function paidBooking(sessionId?: string) {
  if (!sessionId || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) return null;
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") return null;
    const bookingId = typeof session.metadata?.bookingId === "string" ? session.metadata.bookingId : undefined;
    const paid = await markBookingPaid({ id: bookingId, stripeSessionId: session.id });
    return paid ?? (await getBookingByCheckoutSession(session.id));
  } catch {
    return getBookingByCheckoutSession(sessionId);
  }
}
