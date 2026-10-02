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

  if (compact) {
    return (
      <div className="rounded-[18px] border-[1.5px] border-[#E8E1CF] bg-white p-3.5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          <CompactSummaryItem label="Location" value={location || "—"} wide />
          <CompactSummaryItem label="Bin size" value={bin ? formatBinLabel(bin.id) : "—"} />
          <CompactSummaryItem label="Waste type" value={waste?.label ?? "—"} />
          <CompactSummaryItem label="Delivery" value={form.deliveryDate || "—"} />
          <CompactSummaryItem label="Pickup" value={form.pickupDate || "—"} />
          <CompactSummaryItem label="Hire period" value={formatHirePeriod(form.hirePeriod) || "—"} />
          <CompactSummaryItem label="Contact" value={[form.fullName, form.phone].filter(Boolean).join(" · ") || "—"} />
        </div>

        <div className="mt-3 border-t border-[#E8E1CF] pt-3">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[13px] font-semibold text-[#0B3B24]">Payment</p>
            <p className="text-[15px] font-bold text-[#0B3B24]">{total !== null ? formatCurrency(total) : "Awaiting quote"}</p>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11.5px] text-[#5B6B60]">
            <span>Bin hire, delivery &amp; pickup: {hireTotal !== null ? formatCurrency(hireTotal) : "Awaiting quote"}</span>
            {extras.map((extra) => (
              <span key={extra.id}>{extra.label} × {extra.quantity}: +{formatCurrency(extra.price * extra.quantity)}</span>
            ))}
          </div>
        </div>
      </div>
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
        <PriceRow label="Bin hire, delivery & pickup" value={hireTotal !== null ? formatCurrency(hireTotal) : "Awaiting quote"} />
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

function CompactSummaryItem({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : "min-w-0"}>
      <span className="block text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#5B6B60]">{label}</span>
      <span className="mt-0.5 block break-words text-[12.5px] font-semibold leading-4 text-[#16241C]">{value}</span>
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

