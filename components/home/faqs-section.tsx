"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

type FAQItem = {
  id: string;
  question: string;
  answer: string;
};

export function FAQsSection({ items }: { items: FAQItem[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id || null);

  return (
    <section id="faqs" className="mx-auto w-full max-w-[1400px] space-y-10 px-5 py-20 sm:px-8 lg:py-28">
      <div className="text-center">
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-[#65A30D]">Got questions?</p>
        <h2 className="text-4xl font-black leading-tight tracking-[-0.05em] text-[#0B3B24] sm:text-5xl">
          Frequently Asked Questions
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[#405347]">
          Find answers to common questions about our skip bin hire services.
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-3">
        {items.map((item) => (
          <div key={item.id} className="overflow-hidden rounded-xl border border-[#e4e8dc] bg-white">
            <button
              onClick={() => setOpenId(openId === item.id ? null : item.id)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-[#DDECCB]/20"
            >
              <span className="font-bold text-[#0B3B24]">{item.question}</span>
              <ChevronDown
                size={20}
                className={`shrink-0 text-[#65A30D] transition-transform ${
                  openId === item.id ? "rotate-180" : ""
                }`}
              />
            </button>

            {openId === item.id && (
              <div className="border-t border-[#e4e8dc] px-6 py-5">
                <p className="text-[#405347]">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
