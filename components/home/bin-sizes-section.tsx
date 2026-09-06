"use client";

import { useState } from "react";
import { BinSizeCard } from "@/components/home/bin-size-card";
import type { SkipBin } from "@/types/skip-bin";

export function BinSizesSection({ bins }: { bins: SkipBin[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <section id="bin-sizes" className="mx-auto w-full max-w-[1400px] space-y-10 px-5 py-20 sm:px-8 lg:py-28">
      <div className="text-center">
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-[#65A30D]">Choose your size</p>
        <h2 className="text-4xl font-black leading-tight tracking-[-0.05em] text-[#0B3B24] sm:text-5xl">
          Our Bin Sizes
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[#405347]">
          Whether you&apos;re tackling a small garden clean-up or a major construction project, we have the perfect skip bin
          for your needs.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
        {bins.map((bin) => (
          <BinSizeCard
            key={bin.id}
            bin={bin}
            selected={selectedId === bin.id}
            onSelect={() => setSelectedId(bin.id)}
          />
        ))}
      </div>
    </section>
  );
}
