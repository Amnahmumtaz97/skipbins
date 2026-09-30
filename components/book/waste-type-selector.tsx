"use client";

import { Check, CheckCircle2, TriangleAlert, XCircle } from "lucide-react";
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
  const selectedWaste = accepted.find((item) => item.id === value);

  return (
    <div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {accepted.map((item) => {
          const Icon = wasteIcon(item.icon);
          const selected = value === item.id;

          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(item.id)}
              className={`relative flex min-h-[82px] cursor-default items-start gap-3 rounded-2xl border-[1.5px] bg-white p-3.5 text-left transition hover:-translate-y-0.5 ${
                selected ? "border-[#4d7c0f] shadow-[0_0_0_1px_#4d7c0f]" : error ? "border-red-500" : "border-[#E8E1CF]"
              }`}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ background: item.swatch }}
              >
                <Icon size={18} />
              </span>
              <span className="min-w-0 flex-1 cursor-text">
                <span className="block pr-5 text-[14px] font-bold text-[#16241C]">{item.label}</span>
                <span className="mt-0.5 block text-[12px] leading-4 text-[#5B6B60]">{item.description}</span>
              </span>
              {selected ? (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#4d7c0f] text-white">
                  <Check size={12} strokeWidth={3} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <ValidationMessage message={error} />

      {selectedWaste ? (
        <section className="mt-3 overflow-hidden rounded-2xl border border-[#C6DAB0] bg-white" aria-live="polite">
          <div className="flex items-center gap-2 border-b border-[#E8E1CF] bg-[#F4F7EC] px-4 py-2.5">
            <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#14532D]">{selectedWaste.label} guide</span>
          </div>
          <div className="grid sm:grid-cols-2">
            <div className="p-3.5 sm:border-r sm:border-[#E8E1CF]">
              <h3 className="flex items-center gap-2 text-[13px] font-bold text-[#14532D]">
                <CheckCircle2 size={16} /> Allowed
              </h3>
              <ul className="mt-2 grid gap-1.5">
                {selectedWaste.acceptedItems.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[12.5px] leading-5 text-[#405347]">
                    <Check size={13} className="mt-1 shrink-0 text-[#65A30D]" strokeWidth={3} /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-[#E8E1CF] p-3.5 sm:border-t-0">
              <h3 className="flex items-center gap-2 text-[13px] font-bold text-[#A6392E]">
                <XCircle size={16} /> Not allowed
              </h3>
              <ul className="mt-2 grid gap-1.5">
                {selectedWaste.notAccepted.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[12.5px] leading-5 text-[#5B6B60]">
                    <XCircle size={13} className="mt-1 shrink-0 text-[#A6392E]" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {selectedWaste.warning ? (
            <div className="flex items-start gap-2 border-t border-[#EBDBA8] bg-[#FBF3DE] px-3.5 py-2.5">
              <TriangleAlert size={14} className="mt-0.5 shrink-0 text-[#9A6707]" />
              <p className="m-0 text-[12px] leading-5 text-[#6E4E05]">{selectedWaste.warning}</p>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
