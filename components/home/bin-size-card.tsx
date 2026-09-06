"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, Check } from "lucide-react";
import type { SkipBin } from "@/types/skip-bin";

type BinSizeCardProps = {
  bin: SkipBin;
  selected: boolean;
  onSelect: () => void;
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
      className={`group flex h-full flex-col overflow-hidden rounded-[2rem] border shadow-[0_10px_30px_rgba(23,32,24,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(23,32,24,0.12)] ${
        popular
          ? "border-2 border-[#65A30D] bg-[#0B3B24] shadow-[0_16px_40px_rgba(101,163,13,0.18)]"
          : selected
            ? "border-[#65A30D] bg-white shadow-[0_16px_36px_rgba(101,163,13,0.18)]"
            : "border-[#e4e8dc] bg-white"
      }`}
    >
      {popular ? (
        <p className="bg-[#65A30D] py-2.5 text-center text-[11px] font-extrabold uppercase tracking-[0.18em] text-white">
          Most Popular
        </p>
      ) : null}

      <div className="bin-card-media relative h-56 overflow-hidden sm:h-60">
        <Image
          src={bin.image}
          alt={`${bin.size} ${bin.name} skip bin`}
          fill
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        <button
          type="button"
          onClick={onSelect}
          className="absolute inset-0 z-[1]"
          aria-label={`Select ${bin.name}`}
        />

        {selected ? (
          <span className="absolute right-4 top-4 z-[3] flex h-8 w-8 items-center justify-center rounded-full bg-[#65A30D] text-white shadow-sm">
            <Check size={16} strokeWidth={3} />
          </span>
        ) : null}

        <div className="bin-card-overlay pointer-events-none absolute inset-0 z-[2] flex flex-col justify-end bg-gradient-to-t from-[#0B3B24] via-[#0B3B24]/88 to-[#0B3B24]/25 p-6">
          <p className="bin-card-reveal bin-card-reveal-title text-xs font-extrabold uppercase tracking-[0.16em] text-[#9bc96d]">
            {bin.size}
          </p>
          <h3 className="bin-card-reveal bin-card-reveal-title mt-1 text-2xl font-extrabold tracking-tight text-white">
            {bin.name}
          </h3>
          <p className="bin-card-reveal bin-card-reveal-desc mt-2 max-w-[32ch] text-sm leading-6 text-white/85">
            {bin.description}
          </p>
          <Link
            href={`/book?size=${encodeURIComponent(bin.id)}`}
            className="bin-card-reveal bin-card-reveal-cta pointer-events-auto mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-[#65A30D] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#7cbc1f]"
          >
            <Calendar size={14} />
            Book this size
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <button type="button" onClick={onSelect} className="flex flex-1 flex-col px-7 pb-2 pt-7 text-left">
        <p className={`text-[11px] font-extrabold uppercase tracking-[0.16em] ${popular ? "text-[#9bc96d]" : "text-[#65A30D]"}`}>
          {bin.name}
        </p>
        <h3 className={`mt-2 text-[2.15rem] font-black leading-none tracking-[-0.05em] ${popular ? "text-white" : "text-[#0B3B24]"}`}>
          {bin.size}
        </h3>
        <p className={`mt-2 text-sm ${popular ? "text-white/70" : "text-[#405347]"}`}>{bin.capacity}</p>

        <p className={`mt-5 text-sm ${popular ? "text-white/70" : "text-[#405347]"}`}>
          From{" "}
          <strong className={`text-[1.75rem] font-black tracking-tight ${popular ? "text-white" : "text-[#0B3B24]"}`}>
            {bin.price}
          </strong>
        </p>

        <ul className={`mt-5 space-y-2.5 border-t pt-5 ${popular ? "border-white/15" : "border-[#e8eee3]"}`}>
          {highlights.map((item) => (
            <li
              key={item}
              className={`flex items-start gap-2.5 text-sm leading-6 ${popular ? "text-white/80" : "text-[#405347]"}`}
            >
              <Check size={16} className="mt-0.5 shrink-0 text-[#65A30D]" strokeWidth={2.75} />
              {item}
            </li>
          ))}
        </ul>
      </button>

      <div className="px-7 pb-7 pt-4">
        <Link
          href={`/book?size=${encodeURIComponent(bin.id)}`}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold transition ${
            popular || selected
              ? "bg-[#65A30D] text-white hover:bg-[#7cbc1f]"
              : "bg-[#0B3B24] text-white hover:bg-[#14532D]"
          }`}
        >
          Book this size
        </Link>
      </div>
    </article>
  );
}
