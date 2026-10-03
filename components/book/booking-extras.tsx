import { Minus, Plus } from "lucide-react";
import { bookingExtras, maxExtraQuantity, type BookingExtraId, type BookingExtraQuantities } from "@/lib/data/booking-extras";

type BookingExtrasProps = {
  value: BookingExtraQuantities;
  onChange: (id: BookingExtraId, quantity: number) => void;
};

export function BookingExtras({ value, onChange }: BookingExtrasProps) {
  return (
    <section aria-labelledby="booking-extras-heading" className="mb-3 rounded-[18px] border-[1.5px] border-[#D7DFC9] bg-[#EEF5E5] p-3.5">
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p id="booking-extras-heading" className="text-[15px] font-bold text-[#0B3B24]">Optional disposal extras</p>
        <p className="text-[11.5px] text-[#526159]">Add any special items in your load.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {bookingExtras.map((extra) => {
          const quantity = value[extra.id];
          return (
            <div key={extra.id} className="flex min-h-14 items-center gap-2.5 rounded-xl border border-[#D6DECF] bg-white px-3 py-2">
              <div className="min-w-0 flex-1">
                <span className="block cursor-text text-[12.5px] font-bold leading-4 text-[#16241C]">{extra.label}</span>
                <span className="mt-0.5 block cursor-text text-[11.5px] font-extrabold leading-4 text-[#4D7C0F]">{extra.pricingLabel}</span>
              </div>
              <div className="shrink-0">
                {quantity === 0 ? (
                  <button
                    type="button"
                    onClick={() => onChange(extra.id, 1)}
                    className="rounded-full bg-[#0B3B24] px-3.5 py-1.5 text-[11.5px] font-bold text-white transition hover:bg-[#14532D]"
                  >
                    Add
                  </button>
                ) : (
                  <div className="inline-flex items-center overflow-hidden rounded-full border border-[#C7D2C3] bg-white">
                    <button
                      type="button"
                      onClick={() => onChange(extra.id, quantity - 1)}
                      aria-label={`Remove one ${extra.label}`}
                      className="flex h-7 w-8 items-center justify-center text-[#0B3B24] transition hover:bg-[#EEF5E5]"
                    >
                      <Minus size={14} />
                    </button>
                    <output aria-label={`${extra.label} quantity`} className="min-w-6 cursor-text text-center text-[12px] font-bold text-[#16241C]">{quantity}</output>
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
