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

export function WasteAllowanceGuide({ waste }: { waste: WasteCategory }) {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-xl border border-[#C6DAB0] bg-white" aria-live="polite">
      <div className="flex shrink-0 items-center gap-2 border-b border-[#E8E1CF] bg-[#F4F7EC] px-3 py-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#14532D]">{waste.label} guide</span>
      </div>
      <div className="grid flex-1 grid-cols-2">
        <div className="border-r border-[#E8E1CF] p-2.5">
          <h3 className="flex items-center gap-1.5 text-[12px] font-bold text-[#14532D]">
            <CheckCircle2 size={14} /> Allowed
          </h3>
          <ul className="mt-1.5 grid gap-1">
            {waste.acceptedItems.map((item) => (
              <li key={item} className="flex items-start gap-1.5 text-[12px] leading-4 text-[#405347]">
                <Check size={12} className="mt-0.5 shrink-0 text-[#65A30D]" strokeWidth={3} /> {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-2.5">
          <h3 className="flex items-center gap-1.5 text-[12px] font-bold text-[#A6392E]">
            <XCircle size={14} /> Not allowed
          </h3>
          <ul className="mt-1.5 grid gap-1">
            {waste.notAccepted.map((item) => (
              <li key={item} className="flex items-start gap-1.5 text-[12px] leading-4 text-[#5B6B60]">
                <XCircle size={12} className="mt-0.5 shrink-0 text-[#A6392E]" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {waste.warning ? (
        <div className="flex items-start gap-2 border-t border-[#EBDBA8] bg-[#FBF3DE] px-2.5 py-2">
          <TriangleAlert size={13} className="mt-0.5 shrink-0 text-[#9A6707]" />
          <p className="m-0 text-[11.5px] leading-4 text-[#6E4E05]">{waste.warning}</p>
        </div>
      ) : null}
    </section>
  );
}

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
              className={`selection-card relative flex min-h-[82px] cursor-pointer items-start gap-3 rounded-2xl border-[1.5px] bg-white p-3.5 text-left transition hover:-translate-y-0.5 ${
                selected ? "border-[#4d7c0f] shadow-[0_0_0_1px_#4d7c0f]" : error ? "border-red-500" : "border-[#E8E1CF]"
              }`}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ background: item.swatch }}
              >
                <Icon size={18} />
              </span>
              <span className="selection-card-copy min-w-0 flex-1">
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

      {selectedWaste ? <div className="mt-3"><WasteAllowanceGuide waste={selectedWaste} /></div> : null}
    </div>
  );
}
