import { wasteIcon } from "@/lib/waste-icon";
import type { WasteCategory } from "@/types/skip-bin";

export function WhatWeAcceptSection({ accepted }: { accepted: WasteCategory[] }) {
  return (
    <section id="what-we-accept" className="mx-auto w-full max-w-[1400px] space-y-10 px-5 py-20 sm:px-8 lg:py-28">
      <div className="text-center">
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-[#65A30D]">Responsible disposal</p>
        <h2 className="text-4xl font-black leading-tight tracking-[-0.05em] text-[#0B3B24] sm:text-5xl">
          What We Accept
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[#405347]">
          Choose the stream that matches your load. Pricing depends on waste type, so an accurate match keeps your quote
          correct.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {accepted.map((item) => {
          const Icon = wasteIcon(item.icon);
          return (
            <article
              key={item.id}
              className="accept-card relative flex flex-col items-center overflow-hidden rounded-[18px] border-[1.5px] border-[#E8E1CF] bg-white pb-6 pt-8 text-center shadow-[0_14px_26px_rgba(0,0,0,0.04)]"
            >
              {/* Blob overlay scales up on hover */}
              <span className="ac-overlay pointer-events-none absolute left-1/2 top-16 h-[110px] w-[110px] -translate-x-1/2 rounded-full bg-[#65A30D] opacity-[0.12]" />

              {/* Circle icon */}
              <span className="ac-circle relative z-10 mb-5 flex h-[104px] w-[104px] items-center justify-center rounded-full border-2 border-[#65A30D] bg-white">
                <span className="ac-inner absolute inset-[7px] rounded-full bg-[#65A30D] opacity-20" />
                <Icon size={28} className="ac-icon relative z-10 text-[#65A30D]" />
              </span>

              <h3 className="relative z-10 px-3 text-[14.5px] font-bold leading-snug text-[#0B3B24]">
                {item.label}
              </h3>

              <p className="relative z-10 mt-1 px-4 text-[12px] leading-snug text-[#5B6B60]">
                {item.description}
              </p>

              <ul className="relative z-10 mt-4 w-full space-y-1.5 px-5 text-left">
                {item.acceptedItems.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-[12px] text-[#16241C]">
                    <span className="mt-[3px] h-2 w-2 shrink-0 rounded-full bg-[#65A30D]" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}