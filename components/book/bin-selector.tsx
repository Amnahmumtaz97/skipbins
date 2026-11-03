import Image from "next/image";
import { Check } from "lucide-react";
import { formatBinLabel, getBinBySizeOrId } from "@/lib/data/skip-bins";

export type BinCardPrice = {
  amount: number | null;
  exact: boolean;
};

function formatHirePrice(amount: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function dimensionParts(dimensions: string) {
  const [length = "—", width = "—", height = "—"] = dimensions.split(" × ");
  return [
    { label: "Length", value: length },
    { label: "Width", value: width },
    { label: "Height", value: height },
  ];
}

export function SelectedBinCard({
  binId,
  price,
  pricesLoading = false,
  fill = false,
}: {
  binId: string;
  price?: BinCardPrice | null;
  pricesLoading?: boolean;
  fill?: boolean;
}) {
  const bin = getBinBySizeOrId(binId);
  if (!bin) return null;
  const dimensions = dimensionParts(bin.dimensions);
  const unavailable = price?.amount == null && !pricesLoading && price != null;

  return (
    <article className={`flex w-full items-stretch overflow-hidden rounded-xl border-[1.5px] border-[#0B3B24] bg-white text-left shadow-[0_0_0_1.5px_#0B3B24] ${fill ? "h-full" : ""}`}>
      <span className="relative block w-[38%] max-w-[220px] shrink-0 self-stretch bg-gradient-to-br from-[#F6F9F0] via-[#EEF5E5] to-[#DDECCB]">
        <Image
          src={bin.image}
          alt={`${formatBinLabel(bin.id)} skip bin`}
          fill
          sizes="220px"
          className="object-contain p-3"
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center p-3 sm:p-4">
        <span className="relative block pr-7 text-[15px] font-bold leading-tight text-[#172018]">
          <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#0B3B24] text-white">
            <Check size={12} strokeWidth={3} />
          </span>
          {formatBinLabel(bin.id)}
        </span>
        <span className="mt-1 block text-[12px] leading-4 text-[#405347]">{bin.description}</span>
        <span className="mt-1 block text-[11px] font-semibold text-[#0B3B24]">{bin.door}</span>
        <span className="mt-2.5 grid grid-cols-3 rounded-lg bg-[#F4F7EC] px-2.5 py-2">
          {dimensions.map((dimension, index) => (
            <span key={dimension.label} className={`${index ? "border-l border-[#d6dfd2] pl-2.5" : ""} min-w-0`}>
              <span className="block text-[8px] font-bold uppercase tracking-[0.07em] text-[#405347]">{dimension.label}</span>
              <span className="mt-0.5 block text-[12px] font-bold leading-none text-[#0B3B24]">{dimension.value}</span>
            </span>
          ))}
        </span>
        <span className="flex items-end justify-between gap-2 pt-2.5 font-bold text-[#0B3B24]">
          <span>
            {pricesLoading ? (
              <span className="text-[18px] font-bold leading-none tracking-tight text-[#405347]">…</span>
            ) : unavailable ? (
              <span className="text-[13px] font-bold leading-none text-[#405347]">Not offered</span>
            ) : (
              <>
                {price && !price.exact ? (
                  <span className="text-[13px] font-medium text-[#405347]">From </span>
                ) : null}
                <span className="text-[18px] font-bold leading-none tracking-tight">
                  {price?.amount != null ? formatHirePrice(price.amount) : bin.price}
                </span>
              </>
            )}
          </span>
          {unavailable ? null : (
            <span className="text-[11px] font-medium text-[#405347]">Up to 10 days hire</span>
          )}
        </span>
      </span>
    </article>
  );
}
