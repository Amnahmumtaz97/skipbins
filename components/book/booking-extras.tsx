import { Minus, Plus } from "lucide-react";
import { bookingExtras, maxExtraQuantity, type BookingExtraId, type BookingExtraQuantities } from "@/lib/data/booking-extras";

type BookingExtrasProps = {
  value: BookingExtraQuantities;
  onChange: (id: BookingExtraId, quantity: number) => void;
};

export function BookingExtras({ value, onChange }: BookingExtrasProps) {
  return (
    <section aria-labelledby="booking-extras-heading" className="mt-3 rounded-2xl border border-[#d6dfd2] bg-[#EEF5E5] p-2.5 sm:p-3">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p id="booking-extras-heading" className="text-[13px] font-bold text-[#0B3B24]">Optional extras</p>
        <p className="text-[11px] text-[#405347]">Added to the total</p>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-3">
        {bookingExtras.map((extra) => {
          const quantity = value[extra.id];
          return (
            <div key={extra.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-[#d6dfd2] bg-white px-2.5 py-1.5">
              <div className="min-w-0 flex-1">
                <span className="block text-[12px] font-bold leading-4 text-[#172018]">{extra.label.replace(" Disposal", "")}</span>
                <span className="block text-[11px] font-extrabold leading-4 text-[#0B3B24]">{extra.id === "mattressDisposal" ? "1st free, then $50" : extra.pricingLabel}</span>
              </div>
              <div className="shrink-0">
                {quantity === 0 ? (
                  <button
                    type="button"
                    onClick={() => onChange(extra.id, 1)}
                    className="rounded-full bg-[#0B3B24] px-3 py-1 text-[11px] font-bold text-white transition hover:bg-[#14532D]"
                  >
                    Add
                  </button>
                ) : (
                  <div className="inline-flex items-center overflow-hidden rounded-full border border-[#d6dfd2] bg-white">
                    <button
                      type="button"
                      onClick={() => onChange(extra.id, quantity - 1)}
                      aria-label={`Remove one ${extra.label}`}
                      className="flex h-7 w-8 items-center justify-center text-[#0B3B24] transition hover:bg-[#EEF5E5]"
                    >
                      <Minus size={14} />
                    </button>
                    <output aria-label={`${extra.label} quantity`} className="min-w-6 cursor-text text-center text-[12px] font-bold text-[#172018]">{quantity}</output>
                    <button
                      type="button"
                      disabled={quantity >= maxExtraQuantity}
                      onClick={() => onChange(extra.id, quantity + 1)}
                      aria-label={`Add one ${extra.label}`}
                      className="flex h-7 w-8 items-center justify-center text-[#0B3B24] transition hover:bg-[#EEF5E5] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
