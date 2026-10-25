import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  Recycle,
  UserRound,
} from "lucide-react";
import { formatBookingAddress } from "@/lib/booking-address";
import { formatCurrency } from "@/lib/booking-utils";
import { formatBinLabel, formatHirePeriod, getBinBySizeOrId, getWasteById } from "@/lib/data/skip-bins";
import type { StoredBooking } from "@/lib/server/booking-service";

export function BookingOrderConfirmation({ booking }: { booking: StoredBooking }) {
  const bin = getBinBySizeOrId(booking.bin_size);
  const waste = getWasteById(booking.waste_type);
  const deliveryAddress = formatBookingAddress(booking.street_address, booking.postcode);

  return (
    <section className="mx-auto max-w-[820px] overflow-hidden rounded-[28px] border border-[#d6dfd2] bg-white shadow-[0_18px_60px_rgba(11, 59, 36,0.08)]">
      <header className="bg-[#0B3B24] px-6 py-7 text-white sm:px-9 sm:py-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-[#65A30D] text-white">
              <Check size={25} strokeWidth={3} />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-[#65A30D]">Payment successful</p>
              <h1 className="mt-1 text-[27px] font-semibold tracking-[-0.035em] sm:text-[32px]">Your bin is booked.</h1>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/70">
                Thanks, {firstName(booking.full_name)}. Your payment and booking are confirmed.
              </p>
            </div>
          </div>
          <div className="shrink-0 sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">Order number</p>
            <p className="mt-1 font-mono text-[17px] font-bold tracking-[0.04em]">{booking.reference}</p>
            {booking.customer_code ? (
              <p className="mt-1.5 text-[10px] font-semibold tracking-[0.06em] text-white/60">
                Customer ID <span className="font-mono text-white/85">{booking.customer_code}</span>
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="px-6 py-6 sm:px-9 sm:py-8">
        <div className="flex flex-col gap-4 border-b border-[#FFFFFF] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#DDECCB] text-[#172018]">
              <Recycle size={21} />
            </span>
            <div>
              <p className="text-[15px] font-bold text-[#172018]">{bin ? formatBinLabel(bin.id) : booking.bin_size}</p>
              <p className="mt-0.5 text-[13px] text-[#405347]">{waste?.label ?? booking.waste_type}</p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#DDECCB] px-3 py-1.5 text-[11px] font-bold text-[#0B3B24]">
            <CheckCircle2 size={13} /> Paid
          </span>
        </div>

        <dl className="grid border-b border-[#FFFFFF] py-2 sm:grid-cols-2">
          <OrderDetail icon={<CalendarDays size={17} />} label="Delivery" value={formatDeliveryDate(booking.delivery_date)} />
          <OrderDetail icon={<CalendarDays size={17} />} label="Pickup" value={booking.pickup_date ? formatDeliveryDate(booking.pickup_date) : "To be confirmed"} />
          <OrderDetail icon={<Clock3 size={17} />} label="Hire period" value={formatHirePeriod(booking.hire_period)} />
          <OrderDetail icon={<PackageCheck size={17} />} label="Placement" value={booking.placement || "To be confirmed"} />
          <OrderDetail icon={<MapPin size={17} />} label="Delivery address" value={deliveryAddress} wide />
          <OrderDetail icon={<UserRound size={17} />} label="Booked by" value={booking.full_name} />
          <OrderDetail icon={<Phone size={17} />} label="Phone" value={booking.phone} />
          <OrderDetail icon={<Mail size={17} />} label="Email" value={booking.email} wide />
        </dl>

        {booking.access || booking.notes ? (
          <div className="border-b border-[#FFFFFF] py-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#405347]">Delivery notes</p>
            <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-[#405347]">
              {[booking.access, booking.notes].filter(Boolean).join(" · ")}
            </p>
          </div>
        ) : null}

        <div className="flex items-end justify-between gap-5 py-6">
          <div>
            <p className="text-[13px] font-bold text-[#0B3B24]">Total paid</p>
            <p className="mt-0.5 text-[11px] text-[#405347]">AUD · GST included · Free delivery &amp; pickup</p>
          </div>
          <p className="text-[25px] font-bold tracking-[-0.03em] text-[#0B3B24]">{formatCurrency(booking.amount_cents / 100)}</p>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#FFFFFF] pt-6 sm:flex-row">
          <Link href="/" className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#0B3B24] px-5 py-3 text-[13px] font-bold text-white transition hover:bg-[#14532D]">
            Back to home <ArrowRight size={15} />
          </Link>
          <Link href="/contact" className="inline-flex flex-1 items-center justify-center rounded-full border-[1.5px] border-[#d6dfd2] px-5 py-3 text-[13px] font-bold text-[#0B3B24] transition hover:border-[#65A30D]">
            Need help?
          </Link>
        </div>
      </div>
    </section>
  );
}

function OrderDetail({ icon, label, value, wide }: { icon: React.ReactNode; label: string; value: string; wide?: boolean }) {
  return (
    <div className={`${wide ? "sm:col-span-2" : ""} flex min-w-0 gap-3 py-3.5 sm:pr-5`}>
      <span className="mt-0.5 shrink-0 text-[#0B3B24]">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#405347]">{label}</dt>
        <dd className="mt-1 break-words text-[13px] font-semibold leading-relaxed text-[#172018]">{value}</dd>
      </div>
    </div>
  );
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "there";
}

function formatDeliveryDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}
