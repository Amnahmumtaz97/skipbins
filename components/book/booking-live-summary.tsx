import { Check, MapPin, Calendar, User, Trash2, Package } from "lucide-react";
import { acceptedWaste, bins } from "@/lib/data/skip-bins";
import { formatCurrency } from "@/lib/booking-utils";
import type { BookingFormState } from "@/types/skip-bin";

type LiveSummaryProps = {
  form: BookingFormState;
  total: number | null;
  currentStep: number;
};

type SummaryItemProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  done: boolean;
};

function SummaryItem({ icon, label, value, done }: SummaryItemProps) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span
        className={`mt-0.5 flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full ${
          done ? "bg-[#DDECCB] text-[#4d7c0f]" : "bg-[#F0EDE4] text-[#9aa59a]"
        }`}
      >
        {done ? <Check size={13} strokeWidth={2.8} /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11.5px] font-bold uppercase tracking-wide text-[#5B6B60]">{label}</span>
        <span className={`mt-0.5 block text-[13.5px] font-semibold ${done ? "text-[#0B3B24]" : "text-[#9aa59a]"}`}>
          {value}
        </span>
      </span>
    </div>
  );
}

export function BookingLiveSummary({ form, total, currentStep }: LiveSummaryProps) {
  const bin = bins.find((b) => b.id === form.binSize);
  const waste = acceptedWaste.find((w) => w.id === form.wasteType);

  const items: SummaryItemProps[] = [
    {
      icon: <Package size={13} />,
      label: "Bin size",
      value: bin ? `${bin.name} — ${bin.size} — ${bin.price}` : "Not selected yet",
      done: Boolean(bin),
    },
    {
      icon: <Trash2 size={13} />,
      label: "Waste type",
      value: waste?.label ?? "Not selected yet",
      done: Boolean(waste),
    },
    {
      icon: <MapPin size={13} />,
      label: "Location",
      value: form.address.trim()
        ? [form.address, form.placement].filter(Boolean).join(" · ")
        : "Not entered yet",
      done: Boolean(form.address.trim()),
    },
    {
      icon: <Calendar size={13} />,
      label: "Delivery",
      value:
        form.deliveryDate || form.hirePeriod
          ? [form.deliveryDate, form.hirePeriod].filter(Boolean).join(" · ")
          : "Not selected yet",
      done: Boolean(form.deliveryDate && form.hirePeriod),
    },
    {
      icon: <User size={13} />,
      label: "Contact",
      value:
        form.fullName.trim()
          ? [form.fullName, form.phone].filter(Boolean).join(" · ")
          : "Not entered yet",
      done: Boolean(form.fullName.trim() && form.email.trim() && form.phone.trim()),
    },
  ];

  const completedCount = items.filter((i) => i.done).length;

  return (
    <div className="rounded-2xl border-[1.5px] border-[#E8E1CF] bg-white p-5">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-[#0B3B24]">Your booking</h3>
        <span className="text-[11.5px] font-bold text-[#5B6B60]">
          {completedCount}/{items.length}
        </span>
      </div>

      {/* progress bar */}
      <div className="mb-2 h-[4px] overflow-hidden rounded-full bg-[#DDECCB]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#14532D] to-[#65A30D] transition-all duration-500"
          style={{ width: `${(completedCount / items.length) * 100}%` }}
        />
      </div>

      <div className="divide-y divide-[#F0EDE4]">
        {items.map((item) => (
          <SummaryItem key={item.label} {...item} />
        ))}
      </div>

      {/* price */}
      <div className="mt-2 rounded-xl bg-[#F6F2E7] p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-[#5B6B60]">Estimated total</span>
          <span className="text-[15px] font-bold text-[#0B3B24]">
            {total ? formatCurrency(total) : "—"}
          </span>
        </div>
        {!total ? (
          <p className="mt-1 text-[11px] text-[#5B6B60]">
            Select bin size and rental period to see pricing
          </p>
        ) : null}
      </div>
    </div>
  );
}
