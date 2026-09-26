import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  Recycle,
  Truck,
  UserRound,
} from "lucide-react";
import { formatCurrency } from "@/lib/booking-utils";
import { formatBinSize, getBinBySizeOrId, getWasteById } from "@/lib/data/skip-bins";
import type { StoredBooking } from "@/lib/server/booking-service";

export function BookingConfirmation({ booking }: { booking: StoredBooking }) {
  const bin = getBinBySizeOrId(booking.bin_size);
  const waste = getWasteById(booking.waste_type);
  const deliveryAddress = [booking.street_address, booking.postcode].filter(Boolean).join(", ");

  return (
    <div className="animate-[fadeStep_420ms_ease]">
      <section className="mb-7 overflow-hidden rounded-[28px] bg-[#0B3B24] px-6 py-8 text-white shadow-[0_24px_70px_rgba(11,59,36,0.16)] sm:px-9 sm:py-9 lg:px-12">
        <div className="flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4 sm:gap-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#B7E36D] text-[#0B3B24] shadow-[0_0_0_7px_rgba(183,227,109,0.12)] sm:h-16 sm:w-16">
              <Check size={29} strokeWidth={3} />
            </span>
            <div>
              <p className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-[#B7E36D]">Payment successful</p>
              <h1 className="m-0 text-[28px] font-semibold tracking-[-0.035em] sm:text-[36px]">Your bin is booked.</h1>
              <p className="mt-2 max-w-[570px] text-[14px] leading-relaxed text-white/70 sm:text-[15px]">
                Thanks, {firstName(booking.full_name)}. We&apos;ve received your payment and your delivery is now confirmed.
              </p>
            </div>
          </div>

          <div className="shrink-0 rounded-2xl border border-white/15 bg-white/[0.07] px-5 py-4 sm:min-w-[190px]">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">Booking reference</p>
            <p className="mt-1.5 font-mono text-[18px] font-bold tracking-[0.04em] text-white">{booking.reference}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.55fr)_minmax(310px,0.75fr)]">
        <div className="space-y-7">
          <section className="overflow-hidden rounded-[24px] border border-[#E4DDCB] bg-white shadow-[0_12px_40px_rgba(22,36,28,0.06)]">
            <SectionHeading icon={<Truck size={19} />} title="Delivery details" subtitle="Everything our delivery team needs" />
            <dl className="grid sm:grid-cols-2">
              <Detail icon={<CalendarDays size={18} />} label="Delivery date" value={formatDeliveryDate(booking.delivery_date)} />
              <Detail icon={<Clock3 size={18} />} label="Hire period" value={booking.hire_period} alternate />
              <Detail icon={<MapPin size={18} />} label="Delivery address" value={deliveryAddress} />
              <Detail icon={<PackageCheck size={18} />} label="Placement" value={booking.placement || "To be confirmed"} alternate />
            </dl>
            {booking.access || booking.notes ? (
              <div className="border-t border-[#EEE9DC] bg-[#FAF8F1] px-5 py-4 sm:px-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#6D796F]">Driver notes</p>
                <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#34453A]">
                  {[booking.access, booking.notes].filter(Boolean).join(" · ")}
                </p>
              </div>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-[24px] border border-[#E4DDCB] bg-white shadow-[0_12px_40px_rgba(22,36,28,0.06)]">
            <SectionHeading icon={<UserRound size={19} />} title="Contact details" subtitle="We’ll use these details for delivery updates" />
            <dl className="grid sm:grid-cols-2">
              <Detail icon={<UserRound size={18} />} label="Booked by" value={booking.full_name} />
              <Detail icon={<Phone size={18} />} label="Phone" value={booking.phone} alternate />
              <Detail icon={<Mail size={18} />} label="Confirmation email" value={booking.email} full />
            </dl>
          </section>

          <section className="rounded-[24px] border border-[#CFE2B9] bg-[#EDF6E3] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D7EDBC] text-[#14532D]"><Truck size={20} /></span>
              <div>
                <h2 className="text-[16px] font-bold text-[#0B3B24]">What happens next?</h2>
                <p className="mt-0.5 text-[13px] text-[#536558]">We’ll take it from here.</p>
              </div>
            </div>
            <ol className="mt-5 grid gap-4 sm:grid-cols-3">
              <NextStep number="1" text={`A receipt and booking confirmation will be sent to ${booking.email}.`} />
              <NextStep number="2" text="Our team will review access details and contact you if anything needs confirming." />
              <NextStep number="3" text={`Your ${bin?.name?.toLowerCase() ?? "skip bin"} will arrive on ${formatDeliveryDate(booking.delivery_date, true)}.`} />
            </ol>
          </section>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="overflow-hidden rounded-[24px] border border-[#E4DDCB] bg-white shadow-[0_12px_40px_rgba(22,36,28,0.06)]">
            <div className="border-b border-[#EEE9DC] px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-[17px] font-bold text-[#0B3B24]">Order summary</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF5DC] px-2.5 py-1 text-[11px] font-bold text-[#34620D]"><CheckCircle2 size={13} /> Paid</span>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#DDECCB] text-[#14532D]"><Recycle size={23} /></span>
                <div>
                  <p className="text-[15px] font-bold text-[#16241C]">{bin?.name ?? "Skip bin"}</p>
                  <p className="mt-0.5 text-[13px] text-[#647067]">{formatBinSize(booking.bin_size)} · {waste?.label ?? booking.waste_type}</p>
                </div>
              </div>

              <dl className="mt-5 space-y-3 border-t border-[#EEE9DC] pt-5 text-[13px]">
                <SummaryLine label="Hire period" value={booking.hire_period} />
                <SummaryLine label="Delivery & pickup" value="Included" />
                <SummaryLine label="Payment" value="Processed by Stripe" />
              </dl>

              <div className="mt-5 flex items-end justify-between border-t border-[#EEE9DC] pt-5">
                <div><p className="text-[13px] font-bold text-[#0B3B24]">Total paid</p><p className="mt-0.5 text-[11px] text-[#7A847D]">AUD · GST included</p></div>
                <p className="text-[24px] font-bold tracking-[-0.03em] text-[#0B3B24]">{formatCurrency(booking.amount_cents / 100)}</p>
              </div>

              <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#F6F2E7] px-3.5 py-3 text-[12px] font-semibold text-[#526159]">
                <CreditCard size={15} className="shrink-0 text-[#14532D]" /> Payment securely processed
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0B3B24] px-5 py-3.5 text-[13px] font-bold text-white transition hover:bg-[#14532D]">Back to home <ArrowRight size={15} /></Link>
            <Link href="/contact" className="inline-flex items-center justify-center rounded-full border-[1.5px] border-[#C9D3C7] bg-white/70 px-5 py-3.5 text-[13px] font-bold text-[#0B3B24] transition hover:border-[#65A30D] hover:bg-white">Need help?</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionHeading({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return <div className="flex items-center gap-3 border-b border-[#EEE9DC] px-5 py-5 sm:px-6"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#DDECCB] text-[#14532D]">{icon}</span><div><h2 className="text-[16px] font-bold text-[#0B3B24]">{title}</h2><p className="mt-0.5 text-[12px] text-[#7A847D]">{subtitle}</p></div></div>;
}

function Detail({ icon, label, value, alternate, full }: { icon: React.ReactNode; label: string; value: string; alternate?: boolean; full?: boolean }) {
  return <div className={`${full ? "sm:col-span-2" : ""} ${alternate ? "sm:border-l" : ""} flex min-w-0 gap-3 border-b border-[#EEE9DC] px-5 py-4 last:border-b-0 sm:px-6`}><span className="mt-0.5 shrink-0 text-[#65A30D]">{icon}</span><div className="min-w-0"><dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#7A847D]">{label}</dt><dd className="mt-1 break-words text-[13.5px] font-semibold leading-relaxed text-[#27382D]">{value}</dd></div></div>;
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4"><dt className="text-[#7A847D]">{label}</dt><dd className="text-right font-semibold text-[#35463B]">{value}</dd></div>;
}

function NextStep({ number, text }: { number: string; text: string }) {
  return <li className="flex gap-3 text-[12.5px] leading-relaxed text-[#4D6153] sm:block"><span className="mb-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0B3B24] text-[11px] font-bold text-white">{number}</span><span>{text}</span></li>;
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "there";
}

function formatDeliveryDate(value: string, compact = false) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-AU", compact
    ? { weekday: "short", day: "numeric", month: "short" }
    : { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(parsed);
}
