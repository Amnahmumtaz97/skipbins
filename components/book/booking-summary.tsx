import { acceptedWaste, formatBinSize, getBinBySizeOrId } from "@/lib/data/skip-bins";
import { formatCurrency } from "@/lib/booking-utils";
import type { BookingFormState } from "@/types/skip-bin";

export function BookingSummary({ form, total }: { form: BookingFormState; total: number | null }) {
  const bin = getBinBySizeOrId(form.binSize);
  const waste = acceptedWaste.find((item) => item.id === form.wasteType);
  const location = [form.address, form.placement].filter(Boolean).join(" · ");

  return (
    <div>
      <div className="mb-3.5 rounded-[18px] border-[1.5px] border-[#E8E1CF] bg-white px-[18px]">
        <SummaryRow label="Location" value={location || "—"} />
        <SummaryRow label="Waste type" value={waste?.label ?? "—"} />
        <SummaryRow label="Bin size" value={bin ? formatBinSize(bin.size) : "—"} />
        <SummaryRow
          label="Delivery date"
          value={[form.deliveryDate, form.hirePeriod].filter(Boolean).join(" · ") || "—"}
        />
        <SummaryRow
          label="Contact"
          value={[form.fullName, form.phone].filter(Boolean).join(" · ") || "—"}
          last
        />
      </div>

      <div className="rounded-[18px] border-[1.5px] border-[#E8E1CF] bg-[#F6F2E7] p-[18px]">
        <p className="mb-2.5 text-[15px] font-semibold text-[#0B3B24]">Price summary</p>
        <PriceRow label="Bin size" value={bin ? `${bin.size} — ${bin.price}` : "—"} />
        <PriceRow label="Waste type" value={waste?.label ?? "—"} />
        <PriceRow label="Hire period" value={form.hirePeriod || "—"} />
        <PriceRow label="Delivery & pickup" value="Included" />
        <div className="mt-1.5 flex justify-between border-t border-[#E8E1CF] pt-3 text-[14.5px] font-bold text-[#0B3B24]">
          <span>Total</span>
          <span>{total ? formatCurrency(total) : "Calculated after we confirm your details"}</span>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex justify-between gap-3.5 py-3.5 ${last ? "" : "border-b border-[#E8E1CF]"}`}>
      <span className="text-[12.5px] font-semibold text-[#5B6B60]">{label}</span>
      <span className="text-right text-[13.5px] font-semibold text-[#16241C]">{value}</span>
    </div>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 text-[13.5px] text-[#5B6B60]">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
