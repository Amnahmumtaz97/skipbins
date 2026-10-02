import { CalendarDays, Clock3, MapPin, Package, ReceiptText, Recycle, Truck, UserRound, type LucideIcon } from "lucide-react";
import { acceptedWaste, formatBinLabel, formatHirePeriod, getBinBySizeOrId } from "@/lib/data/skip-bins";
import { selectedBookingExtras } from "@/lib/data/booking-extras";
import { formatCurrency } from "@/lib/booking-utils";
import type { BookingFormState } from "@/types/skip-bin";

export function BookingSummary({ form, total, compact = false }: { form: BookingFormState; total: number | null; compact?: boolean }) {
  const bin = getBinBySizeOrId(form.binSize);
  const waste = acceptedWaste.find((item) => item.id === form.wasteType);
  const extras = selectedBookingExtras(form.extras);
  const extrasTotal = extras.reduce((sum, extra) => sum + extra.price * extra.quantity, 0);
  const hireTotal = total === null ? null : total - extrasTotal;
  const location = [form.locationLabel || form.address, form.placement].filter(Boolean).join(" · ");
  const deliveryAddress = [form.streetAddress, form.locationLabel || form.address].filter(Boolean).join(", ");

  if (compact) {
    return (
      <section aria-labelledby="review-summary-title" className="overflow-hidden rounded-[22px] border-[1.5px] border-[#DCE4D4] bg-white shadow-[0_14px_40px_rgba(22,36,28,0.06)]">
        <div className="flex items-center justify-between gap-4 bg-[#0B3B24] px-5 py-4 text-white sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#B7E36D] text-[#0B3B24]">
              <ReceiptText size={20} aria-hidden="true" />
            </span>
            <div>
              <h3 id="review-summary-title" className="text-[16px] font-extrabold">Booking summary</h3>
              <p className="mt-0.5 text-[11px] text-white/65">Check these details before secure payment</p>
            </div>
          </div>
          <span className="hidden rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white/80 sm:inline-flex">Ready to pay</span>
        </div>

        <div className="grid sm:grid-cols-2">
          <ReviewSummaryItem icon={Package} label="Bin size" value={bin ? formatBinLabel(bin.id) : "—"} />
          <ReviewSummaryItem icon={Recycle} label="Waste type" value={waste?.label ?? "—"} />
          <ReviewSummaryItem
            icon={MapPin}
            label="Delivery location"
            value={[deliveryAddress, form.placement].filter(Boolean).join(" · ") || location || "—"}
            wide
          />
          <ReviewSummaryItem
            icon={CalendarDays}
            label="Delivery and pickup"
            value={[form.deliveryDate ? `Delivery ${form.deliveryDate}` : "", form.pickupDate ? `Pickup ${form.pickupDate}` : ""].filter(Boolean).join(" · ") || "—"}
          />
          <ReviewSummaryItem icon={Clock3} label="Hire period" value={formatHirePeriod(form.hirePeriod) || "—"} />
          <ReviewSummaryItem
            icon={UserRound}
            label="Contact"
            value={[form.fullName, form.phone, form.email].filter(Boolean).join(" · ") || "—"}
            wide
            last
          />
        </div>

        <div className="border-t border-[#DCE4D4] bg-[#F4F7EC] px-5 py-4 sm:px-6">
          <div className="grid gap-x-8 gap-y-2 text-[12.5px] sm:grid-cols-2">
            <PriceRow label="Bin hire" value={hireTotal !== null ? formatCurrency(hireTotal) : "Awaiting quote"} />
            <div className="flex items-center justify-between gap-4 py-1.5 text-[#4D7C0F]">
              <span className="inline-flex items-center gap-2 font-semibold"><Truck size={14} aria-hidden="true" /> Delivery &amp; pickup</span>
              <span className="font-extrabold">FREE</span>
            </div>
            {extras.map((extra) => (
              <PriceRow key={extra.id} label={`${extra.label} × ${extra.quantity}`} value={`+${formatCurrency(extra.price * extra.quantity)}`} />
            ))}
          </div>
          <div className="mt-3 flex items-end justify-between gap-5 border-t border-[#CED9C8] pt-3">
            <div>
              <p className="text-[13px] font-extrabold text-[#0B3B24]">Estimated total</p>
              <p className="mt-0.5 text-[10.5px] text-[#6B776F]">AUD · GST included</p>
            </div>
            <p className="text-[24px] font-extrabold tracking-[-0.035em] text-[#0B3B24]">{total !== null ? formatCurrency(total) : "Awaiting quote"}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="rounded-[18px] border-[1.5px] border-[#E8E1CF] bg-white px-[18px]">
      <div>
        <SummaryRow label="Location" value={location || "—"} />
        <SummaryRow label="Waste type" value={waste?.label ?? "—"} />
        <SummaryRow label="Bin size" value={bin ? formatBinLabel(bin.id) : "—"} />
        <SummaryRow
          label="Delivery date"
          value={form.deliveryDate || "—"}
        />
        <SummaryRow label="Pickup date" value={form.pickupDate || "—"} />
        <SummaryRow label="Hire period" value={formatHirePeriod(form.hirePeriod) || "—"} />
        <SummaryRow
          label="Contact"
          value={[form.fullName, form.phone].filter(Boolean).join(" · ") || "—"}
          last
        />
      </div>

      <div className="border-t border-[#E8E1CF] py-[18px]">
        <p className="mb-2 text-[15px] font-semibold text-[#0B3B24]">Payment</p>
        <PriceRow label="Bin hire" value={hireTotal !== null ? formatCurrency(hireTotal) : "Awaiting quote"} />
        <PriceRow label="Delivery & pickup" value="FREE" />
        {extras.map((extra) => (
          <PriceRow key={extra.id} label={`${extra.label} × ${extra.quantity}`} value={`+${formatCurrency(extra.price * extra.quantity)}`} />
        ))}
        <div className="mt-1.5 flex justify-between border-t border-[#E8E1CF] pt-3 text-[14.5px] font-bold text-[#0B3B24]">
          <span>Total</span>
          <span>{total !== null ? formatCurrency(total) : "Calculated after we confirm your details"}</span>
        </div>
      </div>
    </div>
  );
}

function ReviewSummaryItem({ icon: Icon, label, value, wide = false, last = false }: {
  icon: LucideIcon;
  label: string;
  value: string;
  wide?: boolean;
  last?: boolean;
}) {
  return (
    <div className={`${wide ? "sm:col-span-2" : ""} ${last ? "" : "border-b border-[#E8ECE5]"} flex min-w-0 items-start gap-3 px-5 py-3.5 sm:px-6`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF3DF] text-[#3D7A22]">
        <Icon size={17} aria-hidden="true" />
      </span>
      <span className="min-w-0 pt-0.5">
        <span className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#718078]">{label}</span>
        <span className="mt-0.5 block break-words text-[12.5px] font-semibold leading-5 text-[#24372B]">{value}</span>
      </span>
    </div>
  );
}

function SummaryRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex justify-between gap-3.5 py-3.5 ${last ? "" : "border-b border-[#E8E1CF]"}`}>
      <span className="text-[12.5px] font-semibold text-[#5B6B60]">{label}</span>
      <span className="min-w-0 break-words text-right text-[13.5px] font-semibold text-[#16241C]">{value}</span>
    </div>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-[13.5px] text-[#5B6B60]">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

