"use client";

import { ChevronDown, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { ValidationMessage } from "@/components/book/validation-message";
import { wasteIcon } from "@/lib/waste-icon";
import type { WasteCategory } from "@/types/skip-bin";

type WasteTypeSelectorProps = {
  accepted: WasteCategory[];
  value: string;
  onChange: (next: string) => void;
  error?: string;
};

export function WasteTypeSelector({ accepted, value, onChange, error }: WasteTypeSelectorProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div>
      <div className="flex flex-col gap-2.5">
        {accepted.map((item) => {
          const Icon = wasteIcon(item.icon);
          const selected = value === item.id;
          const open = openId === item.id;

          return (
            <div
              key={item.id}
              className={`overflow-hidden rounded-[18px] border-[1.5px] bg-white transition ${
                selected ? "border-[#4d7c0f] shadow-[0_0_0_1px_#4d7c0f]" : error ? "border-red-500" : "border-[#E8E1CF]"
              }`}
            >
              <button
                type="button"
                onClick={() => onChange(item.id)}
                className="flex w-full items-start gap-3.5 px-4 py-[17px] text-left"
              >
                <span
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px] text-white"
                  style={{ background: item.swatch }}
                >
                  <Icon size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-[#16241C]">{item.label}</span>
                  <span className="mt-0.5 block text-[13.5px] text-[#5B6B60]">{item.description}</span>
                  <span className="mt-2.5 flex flex-wrap gap-1.5">
                    {item.acceptedItems.map((chip) => (
                      <span
                        key={chip}
                        className="whitespace-nowrap rounded-full border border-[#C6DAB0] bg-[#DDECCB] px-2.5 py-1 text-xs text-[#0B3B24]"
                      >
                        {chip}
                      </span>
                    ))}
                  </span>
                </span>
                <span
                  className={`relative mt-0.5 h-[22px] w-[22px] shrink-0 rounded-full border-2 ${
                    selected ? "border-[#4d7c0f]" : "border-[#CBD6C4]"
                  }`}
                >
                  {selected ? <span className="absolute inset-[3px] rounded-full bg-[#4d7c0f]" /> : null}
                </span>
              </button>

              <div className="px-[18px] pb-4 pl-[18px] sm:pl-[72px]">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#14532D]"
                >
                  {open ? "Hide restrictions" : "Show restrictions"}
                  <ChevronDown size={12} className={`transition ${open ? "rotate-180" : ""}`} />
                </button>
                {open ? (
                  <div className="pt-3">
                    {item.warning ? (
                      <div className="mb-3.5 flex items-start gap-2 rounded-xl border border-[#EBDBA8] bg-[#FBF3DE] p-3">
                        <TriangleAlert size={15} className="mt-0.5 shrink-0 text-[#9A6707]" />
                        <p className="m-0 text-[12.5px] leading-5 text-[#6E4E05]">{item.warning}</p>
                      </div>
                    ) : null}
                    <p className="mb-1.5 text-[11.5px] font-bold text-[#A6392E]">Not accepted</p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.notAccepted.map((chip) => (
                        <span
                          key={chip}
                          className="whitespace-nowrap rounded-full border border-[#EFCFC8] bg-[#FBEFEC] px-2.5 py-1 text-xs text-[#A6392E]"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <ValidationMessage message={error} />
    </div>
  );
}
