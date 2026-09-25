import Link from "next/link";
import { Check } from "lucide-react";
import type { Metadata } from "next";
import { ClearBookingDraft } from "@/components/book/clear-booking-draft";
import { Navbar } from "@/components/home/navbar";
import { getBookingByCheckoutSession, markBookingPaid } from "@/lib/server/booking-service";
import { formatCurrency } from "@/lib/booking-utils";
import { getStripe } from "@/lib/server/stripe";

export const metadata: Metadata = {
  title: "Booking confirmed | SkipBins",
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BookingSuccessPage({ searchParams }: PageProps<"/book/success">) {
  const sessionId = firstParam((await searchParams).session_id);
  const booking = await paidBooking(sessionId);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F6F2E7] text-[#16241C]">
      <Navbar />
      {booking?.status === "paid" ? <ClearBookingDraft /> : null}
      <div className="mx-auto w-full max-w-[720px] px-5 pb-20 pt-32 sm:px-6 sm:pt-36">
        {booking?.status === "paid" ? (
          <div className="px-2.5 pb-2.5 pt-8 text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#65A30D] text-[#0B3B24]">
              <Check size={26} strokeWidth={2.6} />
            </span>
            <h1 className="m-0 text-[22px] font-semibold text-[#0B3B24] sm:text-[27px]">You&apos;re all set</h1>
            <p className="mx-auto mt-2 max-w-[420px] text-[14.5px] leading-relaxed text-[#5B6B60]">
              Reference {booking.reference}. We&apos;ll send a confirmation to {booking.email} with delivery details.
            </p>
            <p className="mt-4 text-[15px] font-bold text-[#0B3B24]">{formatCurrency(booking.amount_cents / 100)}</p>
            <Link
              href="/"
              className="mt-8 inline-flex rounded-full bg-[#0B3B24] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0D2417]"
            >
              Back to home
            </Link>
          </div>
        ) : (
          <div className="pt-8 text-center">
            <h1 className="m-0 text-[22px] font-semibold text-[#0B3B24]">Payment not confirmed yet</h1>
            <p className="mx-auto mt-2 max-w-[420px] text-[14.5px] leading-relaxed text-[#5B6B60]">
              If you completed checkout, wait a moment and refresh this page. If you cancelled, you can return to booking.
            </p>
            <Link
              href="/book"
              className="mt-8 inline-flex rounded-full border-[1.5px] border-[#E8E1CF] px-6 py-3 text-sm font-bold text-[#0B3B24]"
            >
              Back to booking
            </Link>
          </div>
        )}
      </div>
    </main>
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
