"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Ruler } from "lucide-react";
import { formatBinLabel } from "@/lib/data/skip-bins";
import type { SkipBin } from "@/types/skip-bin";

type BinSizeCardProps = {
  bin: SkipBin;
  selected: boolean;
  onSelect: () => void;
};

const relativeImageSize: Record<string, string> = {
  "2m3": "h-[66%] w-[68%]",
  "3m3": "h-[70%] w-[74%]",
  "4m3": "h-[74%] w-[80%]",
  "6m3": "h-[79%] w-[86%]",
  "8m3": "h-[84%] w-[92%]",
  "9m3": "h-[88%] w-[96%]",
};

export function BinSizeCard({ bin, selected, onSelect }: BinSizeCardProps) {
  const highlights = bin.recommendedFor
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1));
  const popular = Boolean(bin.popular);

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-[1.65rem] border transition-[transform,box-shadow,border-color] duration-500 ease-out hover:-translate-y-1.5 hover:border-[#9BC96D] hover:shadow-[0_24px_60px_rgba(11,59,36,0.14)] ${
        selected
          ? `${popular ? "bg-[#0B3B24]" : "bg-white"} border-[#65A30D] shadow-[0_18px_48px_rgba(101,163,13,0.18)] ring-2 ring-[#65A30D]/20`
          : popular
            ? "border-[#65A30D] bg-[#0B3B24] shadow-[0_18px_48px_rgba(11,59,36,0.2)]"
            : "border-[#DDE6D5] bg-white shadow-[0_10px_32px_rgba(23,32,24,0.06)]"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Select ${formatBinLabel(bin.id)}`}
        aria-pressed={selected}
        className="relative block h-48 w-full overflow-hidden bg-gradient-to-br from-[#F6F9F0] via-[#EEF5E5] to-[#DDECCB] sm:h-52"
      >
        <span className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#9BC96D]/25 blur-2xl transition-transform duration-700 group-hover:scale-150" />
        <span className="absolute bottom-4 left-1/2 h-5 w-3/5 -translate-x-1/2 rounded-full bg-[#0B3B24]/15 blur-lg transition-all duration-500 group-hover:w-2/3 group-hover:bg-[#0B3B24]/20" />
        <span
          className={`absolute bottom-2 left-1/2 z-[1] block -translate-x-1/2 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-1/2 group-hover:-translate-y-1 group-hover:scale-[1.06] ${relativeImageSize[bin.id] ?? "h-[78%] w-[84%]"}`}
        >
          <Image
            src={bin.image}
            alt={`${formatBinLabel(bin.id)} green metal skip bin shown at its relative size`}
            fill
            sizes="(max-width: 639px) 90vw, (max-width: 1023px) 44vw, 30vw"
            className="object-contain"
          />
        </span>

        <span className="absolute left-4 top-4 z-[2] rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[11px] font-extrabold tracking-[0.08em] text-[#0B3B24] shadow-sm backdrop-blur-sm">
          {bin.size}
        </span>

        {popular ? (
          <span className="absolute right-4 top-4 z-[2] rounded-full bg-[#65A30D] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white shadow-sm">
            Most Popular
          </span>
        ) : null}

        {selected ? (
          <span className="absolute bottom-4 right-4 z-[2] flex items-center gap-1.5 rounded-full bg-[#0B3B24] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white shadow-md">
            <Check size={13} strokeWidth={3} /> Selected
          </span>
        ) : null}
      </button>

      <div className="flex flex-1 cursor-text flex-col px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        <h3 className={`text-xl font-black leading-tight tracking-[-0.035em] ${popular ? "text-white" : "text-[#0B3B24]"}`}>
          {formatBinLabel(bin.id)}
        </h3>
        <p className={`mt-1.5 text-[12.5px] leading-5 ${popular ? "text-white/70" : "text-[#526159]"}`}>{bin.description}</p>

        <div className={`mt-4 rounded-xl border px-3.5 py-3 ${popular ? "border-white/15 bg-white/[0.07]" : "border-[#E0E9D8] bg-[#F7F9F2]"}`}>
          <div className={`flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.09em] ${popular ? "text-white/60" : "text-[#526159]"}`}>
            <Ruler size={15} className="shrink-0 text-[#65A30D]" aria-hidden="true" />
            <span>Length × Width × Height</span>
          </div>
          <p className={`mt-1.5 pl-[23px] text-[13px] font-bold tracking-[-0.01em] ${popular ? "text-white" : "text-[#0B3B24]"}`}>
            {bin.dimensions}
          </p>
        </div>

        <ul className={`mt-4 space-y-2.5 border-t pt-4 ${popular ? "border-white/15" : "border-[#E8EEE3]"}`} aria-label="Recommended uses">
          {highlights.map((item) => (
            <li key={item} className={`flex items-start gap-2.5 text-[12.5px] font-semibold leading-5 ${popular ? "text-white/80" : "text-[#405347]"}`}>
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#DDECCB] text-[#3F7F18]">
                <Check size={10} strokeWidth={3} aria-hidden="true" />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-5">
          <Link
            href={`/booking?size=${encodeURIComponent(bin.id)}`}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-[background-color,transform] duration-300 hover:-translate-y-0.5 ${popular ? "bg-[#65A30D] hover:bg-[#7CBC1F]" : "bg-[#0B3B24] hover:bg-[#14532D]"}`}
          >
            Book this size
            <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </article>
  );
}
