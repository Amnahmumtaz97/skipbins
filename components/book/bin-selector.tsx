import { Check } from "lucide-react";
import { ValidationMessage } from "@/components/book/validation-message";
import { bins, formatBinLabel } from "@/lib/data/skip-bins";

type BinSelectorProps = {
  value: string;
  onChange: (sizeId: string) => void;
  error?: string;
};

export function BinSelector({ value, onChange, error }: BinSelectorProps) {
  return (
    <div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {bins.map((bin) => {
          const selected = value === bin.id;
          return (
            <button
              key={bin.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(bin.id)}
              className={`selection-card relative cursor-default rounded-2xl border-[1.5px] bg-white p-4 text-left transition hover:-translate-y-0.5 ${
                selected
                  ? "border-[#4d7c0f] shadow-[0_0_0_1.5px_#4d7c0f]"
                  : error
                    ? "border-red-500"
                    : "border-[#E8E1CF]"
              }`}
            >
              {selected ? (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#4d7c0f] text-white">
                  <Check size={12} strokeWidth={3} />
                </span>
              ) : null}
              <span className="selection-card-copy block cursor-text pr-7 text-[16px] font-bold leading-tight text-[#16241C]">
                {formatBinLabel(bin.id)}
              </span>
              <span className="selection-card-copy mt-3 block cursor-text rounded-lg bg-[#F6F2E7] px-3 py-2 text-[12px] text-[#5B6B60]">
                Dimensions: <span className="font-semibold text-[#0B3B24]">{bin.dimensions}</span>
              </span>
              <span className={`selection-card-copy mt-3 flex cursor-text items-end justify-between gap-2 ${selected ? "font-bold text-[#0B3B24]" : "font-semibold text-[#16241C]"}`}>
                <span>
                  <span className="text-[13px] font-medium text-[#5B6B60]">From </span>
                  <span className="text-[20px] font-bold leading-none tracking-tight">{bin.price}</span>
                </span>
                <span className="text-[11px] font-medium text-[#5B6B60]">10-day hire</span>
              </span>
            </button>
          );
        })}
      </div>
      <ValidationMessage message={error} />
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#C6DAB0] bg-[#DDECCB] px-3 py-2.5">
        <span className="mt-0.5 text-sm text-[#14532D]">!</span>
        <p className="m-0 text-[12.5px] leading-5 text-[#0B3B24]">
          Dimensions are a general guide. If you&apos;re not sure, our size guide or support team can help confirm the right fit.
        </p>
      </div>
    </div>
  );
}

