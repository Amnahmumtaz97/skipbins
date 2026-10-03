import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { formatBinLabel } from "@/lib/data/skip-bins";
import type { SkipBin } from "@/types/skip-bin";

type BinSizeCardProps = {
  bin: SkipBin;
};

const relativeImageSize: Record<string, string> = {
  "2m3": "h-[66%] w-[68%]",
  "3m3": "h-[70%] w-[74%]",
  "4m3": "h-[74%] w-[80%]",
  "6m3": "h-[79%] w-[86%]",
  "8m3": "h-[84%] w-[92%]",
  "9m3": "h-[88%] w-[96%]",
  "10m3": "h-[90%] w-[98%]",
  "12m3": "h-[92%] w-full",
};

export function BinSizeCard({ bin }: BinSizeCardProps) {
  const [length = "—", width = "—", height = "—"] = bin.dimensions.split(" × ");
  const dimensions = [
    { label: "Length", value: length },
    { label: "Width", value: width },
    { label: "Height", value: height },
  ];
  const highlights = bin.recommendedFor
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1));
  const popular = Boolean(bin.popular);

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border transition-[transform,box-shadow,border-color] duration-500 ease-out hover:-translate-y-1 hover:border-[#9BC96D] hover:shadow-[0_20px_44px_rgba(11,59,36,0.12)] ${
        popular
          ? "border-[#65A30D] bg-[#0B3B24] shadow-[0_18px_48px_rgba(11,59,36,0.2)]"
          : "border-[#DDE6D5] bg-white shadow-[0_10px_32px_rgba(23,32,24,0.06)]"
      }`}
    >
      <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-[#F6F9F0] via-[#EEF5E5] to-[#DDECCB] xl:h-28">
        <span className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#9BC96D]/25 blur-2xl transition-transform duration-700 group-hover:scale-150" />
        <span className="absolute bottom-4 left-1/2 h-5 w-3/5 -translate-x-1/2 rounded-full bg-[#0B3B24]/15 blur-lg transition-all duration-500 group-hover:w-2/3 group-hover:bg-[#0B3B24]/20" />
        <span
          className={`absolute bottom-2 left-1/2 z-[1] block -translate-x-1/2 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-1/2 group-hover:-translate-y-1 group-hover:scale-[1.06] ${relativeImageSize[bin.id] ?? "h-[78%] w-[84%]"}`}
        >
          <Image
            src={bin.image}
            alt={`${formatBinLabel(bin.id)} green metal skip bin shown at its relative size`}
            fill
            sizes="(max-width: 519px) 90vw, (max-width: 1023px) 44vw, (max-width: 1279px) 30vw, 22vw"
            className="object-contain"
          />
        </span>

        <span className="absolute left-3 top-3 z-[2] rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[10px] font-extrabold tracking-[0.08em] text-[#0B3B24] shadow-sm backdrop-blur-sm">
          {bin.size}
        </span>

        {popular ? (
          <span className="absolute right-3 top-3 z-[2] rounded-full bg-[#65A30D] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-white shadow-sm">
            Most Popular
          </span>
        ) : null}

      </div>

      <div className="flex flex-1 cursor-text flex-col px-4 pb-4 pt-3">
        <h3 className={`text-[17px] font-black leading-tight tracking-[-0.035em] ${popular ? "text-white" : "text-[#0B3B24]"}`}>
          {formatBinLabel(bin.id)}
        </h3>
        <p className={`mt-1 text-[11.5px] leading-[1.05rem] ${popular ? "text-white/70" : "text-[#526159]"}`}>{bin.description}</p>
        <p className={`mt-1.5 text-[10.5px] font-bold ${popular ? "text-[#B7E36D]" : "text-[#4D7C0F]"}`}>{bin.door}</p>

        <div className={`mt-2.5 rounded-lg border px-2.5 py-2 ${popular ? "border-white/15 bg-white/[0.07]" : "border-[#E0E9D8] bg-[#F7F9F2]"}`}>
          <dl className="grid grid-cols-3 gap-1" aria-label={`${bin.size} dimensions`}>
            {dimensions.map((dimension, index) => (
              <div key={dimension.label} className={`${index ? popular ? "border-l border-white/15 pl-2" : "border-l border-[#DCE5D6] pl-2" : ""} min-w-0`}>
                <dt className={`text-[7.5px] font-bold uppercase tracking-[0.05em] ${popular ? "text-white/55" : "text-[#718078]"}`}>{dimension.label}</dt>
                <dd className={`mt-0.5 text-[10.5px] font-bold ${popular ? "text-white" : "text-[#0B3B24]"}`}>{dimension.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <ul className={`mt-2.5 space-y-1.5 border-t pt-2.5 ${popular ? "border-white/15" : "border-[#E8EEE3]"}`} aria-label="Best for">
          {highlights.map((item) => (
            <li key={item} className={`flex items-start gap-2 text-[10.5px] font-semibold leading-4 ${popular ? "text-white/80" : "text-[#405347]"}`}>
              <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#DDECCB] text-[#3F7F18]">
                <Check size={9} strokeWidth={3} aria-hidden="true" />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-3">
          <Link
            href={`/booking?size=${encodeURIComponent(bin.id)}`}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold text-white transition-[background-color,transform] duration-300 hover:-translate-y-0.5 ${popular ? "bg-[#65A30D] hover:bg-[#7CBC1F]" : "bg-[#0B3B24] hover:bg-[#14532D]"}`}
          >
            Book this size
            <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </article>
  );
}
