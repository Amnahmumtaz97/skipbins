import { acceptedWaste, formatBinLabel, formatHirePeriod, getBinBySizeOrId } from "@/lib/data/skip-bins";
import { selectedBookingExtras } from "@/lib/data/booking-extras";
import { formatCurrency } from "@/lib/booking-utils";
import type { BookingFormState } from "@/types/skip-bin";

export function BookingSummary({ form, total, compact = false }: { form: BookingFormState; total: number | null; compact?: boolean }) {
  const bin = getBinBySizeOrId(form.binSize);
  const waste = acceptedWaste.find((item) => item.id === form.wasteType);
  const extras = selectedBookingExtras(form.extras);
  const extrasTotal = extras.reduce((sum, extra) => sum + extra.total, 0);
  const hireTotal = total === null ? null : total - extrasTotal;
  const location = [form.locationLabel || form.address, form.placement].filter(Boolean).join(" · ");
  const deliveryAddress = [form.streetAddress, form.locationLabel || form.address].filter(Boolean).join(", ");

  if (compact) {
    const facts = [
      ["Bin", bin ? formatBinLabel(bin.id) : "—"],
      ["Waste", waste?.label ?? "—"],
      ["Delivery", shortDate(form.deliveryDate)],
      ["Pickup", shortDate(form.pickupDate)],
      ["Hire", shortHire(form.hirePeriod)],
      ["Placement", form.placement || "—"],
    ] as const;
    return (
      <section aria-label="Booking details" className="overflow-hidden rounded-2xl border border-[#d6dfd2] bg-white">
        <dl className="grid grid-cols-2 sm:grid-cols-3">
          {facts.map(([label, value]) => (
            <div key={label} className="min-w-0 border-b border-[#FFFFFF] px-3 py-2 sm:px-3.5">
              <dt className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#405347]">{label}</dt>
              <dd className="mt-0.5 text-[13px] font-semibold leading-4 text-[#172018]">{value}</dd>
            </div>
          ))}
        </dl>
        <dl>
          <div className="border-b border-[#FFFFFF] px-3 py-2 sm:px-3.5">
            <dt className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#405347]">Address</dt>
            <dd className="mt-0.5 text-[13px] font-semibold leading-4 text-[#172018]">{deliveryAddress || location || "—"}</dd>
          </div>
          <div className="px-3 py-2 sm:px-3.5">
            <dt className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#405347]">Contact</dt>
            <dd className="mt-0.5 text-[13px] font-semibold leading-4 text-[#172018]">
              {[form.fullName, form.phone, form.email].filter(Boolean).join(" · ") || "—"}
            </dd>
          </div>
        </dl>
      </section>
    );
  }

  return (
    <div className="rounded-[18px] border-[1.5px] border-[#d6dfd2] bg-white px-[18px]">
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

      <div className="border-t border-[#d6dfd2] py-[18px]">
        <p className="mb-2 text-[15px] font-semibold text-[#0B3B24]">Payment</p>
        <PriceRow label="Bin hire" value={hireTotal !== null ? formatCurrency(hireTotal) : "Awaiting quote"} />
        <PriceRow label="Delivery & pickup" value="FREE" />
        {extras.map((extra) => (
          <PriceRow key={extra.id} label={`${extra.label} × ${extra.quantity}`} value={extra.total ? `+${formatCurrency(extra.total)}` : "FREE"} />
        ))}
        <div className="mt-1.5 flex justify-between border-t border-[#d6dfd2] pt-3 text-[14.5px] font-bold text-[#0B3B24]">
          <span>Total</span>
          <span>{total !== null ? formatCurrency(total) : "Calculated after we confirm your details"}</span>
        </div>
      </div>
    </div>
  );
}

function shortDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value || "—";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function shortHire(value?: string | null) {
  if (value === "Standard (10 days)" || value === "Standard (7 days)") return "Up to 10 days";
  if (value === "Extended (7 days)") return "7 extra days · $50";
  if (value === "Extended (14 days)") return "8–14 extra days · $75";
  return formatHirePeriod(value) || "—";
}

function SummaryRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex justify-between gap-3.5 py-3.5 ${last ? "" : "border-b border-[#d6dfd2]"}`}>
      <span className="text-[12.5px] font-semibold text-[#405347]">{label}</span>
      <span className="min-w-0 break-words text-right text-[13.5px] font-semibold text-[#172018]">{value}</span>
    </div>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-[13.5px] text-[#405347]">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

