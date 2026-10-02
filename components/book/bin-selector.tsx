import Image from "next/image";
import { CalendarDays, Check } from "lucide-react";
import { ValidationMessage } from "@/components/book/validation-message";
import { bins } from "@/lib/data/skip-bins";

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
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {bins.map((bin) => {
          const selected = value === bin.id;
          const dimensions = dimensionParts(bin.dimensions);
          return (
            <button
              key={bin.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(bin.id)}
              className={`selection-card group relative cursor-default overflow-hidden rounded-[22px] border-[1.5px] text-left shadow-[0_8px_24px_rgba(22,36,28,0.05)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(22,36,28,0.1)] ${
                selected
                  ? "border-[#3F7F18] bg-[linear-gradient(145deg,#FFFFFF_0%,#F3F9EA_100%)] shadow-[0_0_0_1px_#3F7F18,0_14px_34px_rgba(63,127,24,0.12)]"
                  : error
                    ? "border-red-500"
                    : "border-[#DEDCCD] bg-[linear-gradient(145deg,#FFFFFF_0%,#FCFCF8_100%)]"
              }`}
            >
              {selected ? (
                <span className="absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-[#EAF5DC] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#34620D]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#4D8F24] text-white">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  Selected
                </span>
              ) : null}

              <span className="relative block min-h-[132px] px-5 pt-5 sm:min-h-[142px] sm:px-6 sm:pt-6">
                <span className="selection-card-copy relative z-10 block w-[43%] cursor-text text-[#0B3B24]">
                  <span className="block text-[42px] font-black leading-[0.9] tracking-[-0.06em] sm:text-[48px]">{bin.size}</span>
                  <span className="mt-2 block text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#527064] sm:text-[14px]">Skip Bin</span>
                </span>
                <span className="absolute bottom-0 right-2 h-[104px] w-[62%] sm:right-3 sm:h-[116px]">
                  <Image
                    src={bin.image}
                    alt=""
                    fill
                    sizes="(max-width: 639px) 58vw, 230px"
                    className="object-contain object-center drop-shadow-[0_10px_9px_rgba(11,59,36,0.16)] transition-transform duration-300 group-hover:scale-[1.025]"
                  />
                </span>
              </span>

              <span className="selection-card-copy mx-5 grid cursor-text grid-cols-3 border-b border-[#E2E4DB] pb-4 pt-3 sm:mx-6">
                {dimensions.map((dimension, index) => (
                  <span key={dimension.label} className={`${index ? "border-l border-[#DDE2D8] pl-3" : ""} min-w-0`}>
                    <span className="block text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#527064] sm:text-[10px]">{dimension.label}</span>
                    <span className="mt-1 block text-[17px] font-extrabold leading-none tracking-[-0.02em] text-[#0B3B24] sm:text-[19px]">{dimension.value}</span>
                  </span>
                ))}
              </span>

              <span className="selection-card-copy flex cursor-text items-end justify-between gap-3 px-5 py-4 sm:px-6 sm:py-5">
                <span className="text-[#0B3B24]">
                  <span className="block text-[12px] font-medium leading-none text-[#527064]">From</span>
                  <span className="mt-1 block text-[30px] font-black leading-none tracking-[-0.05em]">{bin.price}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#EDF5E4] px-3 py-2 text-[11px] font-bold text-[#174E23] sm:text-[12px]">
                  <CalendarDays size={15} strokeWidth={2.4} />
                  10-day hire
                </span>
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

