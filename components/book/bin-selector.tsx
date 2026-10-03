import { Check } from "lucide-react";
import { ValidationMessage } from "@/components/book/validation-message";
import { bins, formatBinLabel } from "@/lib/data/skip-bins";

type BinSelectorProps = {
  value: string;
  onChange: (sizeId: string) => void;
  error?: string;
};

function dimensionParts(dimensions: string) {
  const [length = "—", width = "—", height = "—"] = dimensions.split(" × ");
  return [
    { label: "Length", value: length },
    { label: "Width", value: width },
    { label: "Height", value: height },
  ];
}

export function BinSelector({ value, onChange, error }: BinSelectorProps) {
  return (
    <div>
      <div className="grid grid-cols-1 gap-2 min-[520px]:grid-cols-2 xl:grid-cols-4">
        {bins.map((bin) => {
          const selected = value === bin.id;
          const dimensions = dimensionParts(bin.dimensions);
          return (
            <button
              key={bin.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(bin.id)}
              className={`selection-card relative flex h-full cursor-pointer flex-col rounded-xl border-[1.5px] bg-white p-2.5 text-left transition hover:-translate-y-0.5 ${
                selected
                  ? "border-[#4d7c0f] shadow-[0_0_0_1.5px_#4d7c0f]"
                  : error
                    ? "border-red-500"
                    : "border-[#E8E1CF]"
              }`}
            >
              {selected ? (
                <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#4d7c0f] text-white">
                  <Check size={12} strokeWidth={3} />
                </span>
              ) : null}
              <span className="selection-card-copy block pr-7 text-[15px] font-bold leading-tight text-[#16241C]">
                {formatBinLabel(bin.id)}
              </span>
              <span className="mt-1 block text-[10px] leading-[0.9rem] text-[#5B6B60]">{bin.description}</span>
              <span className="mt-1 block text-[10px] font-semibold text-[#4D7C0F]">{bin.door}</span>
              <span className="selection-card-copy mt-2 grid grid-cols-3 rounded-lg bg-[#F6F2E7] px-2.5 py-2">
                {dimensions.map((dimension, index) => (
                  <span key={dimension.label} className={`${index ? "border-l border-[#DED8C8] pl-2.5" : ""} min-w-0`}>
                    <span className="block text-[8px] font-bold uppercase tracking-[0.07em] text-[#68756C]">{dimension.label}</span>
                    <span className="mt-0.5 block text-[12px] font-bold leading-none text-[#0B3B24]">{dimension.value}</span>
                  </span>
                ))}
              </span>
              <span className={`selection-card-copy mt-auto flex items-end justify-between gap-2 pt-2 ${selected ? "font-bold text-[#0B3B24]" : "font-semibold text-[#16241C]"}`}>
                <span>
                  <span className="text-[13px] font-medium text-[#5B6B60]">From </span>
                  <span className="text-[18px] font-bold leading-none tracking-tight">{bin.price}</span>
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

