import { Minus, Plus } from "lucide-react";
import { bookingExtras, maxExtraQuantity, type BookingExtraId, type BookingExtraQuantities } from "@/lib/data/booking-extras";
import { formatCurrency } from "@/lib/booking-utils";

type BookingExtrasProps = {
  value: BookingExtraQuantities;
  onChange: (id: BookingExtraId, quantity: number) => void;
};

export function BookingExtras({ value, onChange }: BookingExtrasProps) {
  return (
    <section aria-labelledby="booking-extras-heading" className="mb-4 rounded-[18px] border-[1.5px] border-[#D7DFC9] bg-[#EEF5E5] p-4">
      <div className="mb-3">
        <p id="booking-extras-heading" className="text-[15px] font-bold text-[#0B3B24]">Optional disposal extras</p>
        <p className="mt-0.5 text-[12px] leading-5 text-[#526159]">Add any special items that will be included in your load.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {bookingExtras.map((extra) => {
          const quantity = value[extra.id];
          return (
            <div key={extra.id} className="rounded-xl border border-[#D6DECF] bg-white px-3.5 py-3">
              <div className="flex items-start justify-between gap-3">
                <span className="cursor-text text-[13px] font-bold leading-5 text-[#16241C]">{extra.label}</span>
                <span className="shrink-0 cursor-text text-[13px] font-extrabold text-[#4D7C0F]">{formatCurrency(extra.price)}</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-3">
                {quantity === 0 ? (
                  <button
                    type="button"
                    onClick={() => onChange(extra.id, 1)}
                    className="ml-auto rounded-full bg-[#0B3B24] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[#14532D]"
                  >
                    Add
                  </button>
                ) : (
                  <div className="ml-auto inline-flex items-center overflow-hidden rounded-full border border-[#C7D2C3] bg-white">
                    <button
                      type="button"
                      onClick={() => onChange(extra.id, quantity - 1)}
                      aria-label={`Remove one ${extra.label}`}
                      className="flex h-8 w-9 items-center justify-center text-[#0B3B24] transition hover:bg-[#EEF5E5]"
                    >
                      <Minus size={14} />
                    </button>
                    <output aria-label={`${extra.label} quantity`} className="min-w-7 cursor-text text-center text-[13px] font-bold text-[#16241C]">{quantity}</output>
                    <button
                      type="button"
                      disabled={quantity >= maxExtraQuantity}
                      onClick={() => onChange(extra.id, quantity + 1)}
                      aria-label={`Add one ${extra.label}`}
                      className="flex h-8 w-9 items-center justify-center text-[#0B3B24] transition hover:bg-[#EEF5E5] disabled:cursor-not-allowed disabled:opacity-40"
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
