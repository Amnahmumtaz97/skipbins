import { Check } from "lucide-react";
import { ValidationMessage } from "@/components/book/validation-message";
import { bins } from "@/lib/data/skip-bins";

type BinSelectorProps = {
  value: string;
  onChange: (sizeId: string) => void;
  error?: string;
};

export function BinSelector({ value, onChange, error }: BinSelectorProps) {
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {bins.map((bin) => {
          const selected = value === bin.id;
          return (
            <button
              key={bin.id}
              type="button"
              onClick={() => onChange(bin.id)}
              className={`relative rounded-[18px] border-[1.5px] bg-white p-5 text-left transition hover:-translate-y-0.5 ${
                selected
                  ? "border-[#4d7c0f] shadow-[0_0_0_1.5px_#4d7c0f]"
                  : error
                    ? "border-red-500"
                    : "border-[#E8E1CF]"
              }`}
            >
              {selected ? (
                <span className="absolute right-4 top-4 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#4d7c0f] text-white">
                  <Check size={12} strokeWidth={3} />
                </span>
              ) : null}
              <span className="block text-[23px] font-bold leading-none text-[#16241C]">
                {bin.size.replace("m³", "")}
                <sup className="text-[13px]">m³</sup>
              </span>
              <span className="mt-1.5 block text-[13.5px] text-[#5B6B60]">{bin.capacity.replace("Approx. ", "")}</span>
              <span className="mt-4 block text-xs font-bold text-[#14532D]">Price (inc. GST)</span>
              <span className={`mt-0.5 block text-[14.5px] ${selected ? "font-bold text-[#0B3B24]" : "font-medium text-[#16241C]"}`}>
                {selected ? `${bin.price} — selected` : bin.price}
              </span>
            </button>
          );
        })}
      </div>
      <ValidationMessage message={error} />
      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#C6DAB0] bg-[#DDECCB] p-3.5">
        <span className="mt-0.5 text-sm text-[#14532D]">!</span>
        <p className="m-0 text-[12.5px] leading-5 text-[#0B3B24]">
          Trailer-load comparisons are approximate. If you&apos;re not sure, our size guide or support team can help confirm
          the right fit.
        </p>
      </div>
    </div>
  );
}
