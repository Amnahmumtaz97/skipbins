"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { ValidationMessage } from "@/components/book/validation-message";

type SelectOption = string | { value: string; label: string };

type StyledSelectProps = {
  label: string;
  name: string;
  placeholder: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
};

function optionValue(option: SelectOption) {
  return typeof option === "string" ? option : option.value;
}

function optionLabel(option: SelectOption) {
  return typeof option === "string" ? option : option.label;
}

export function StyledSelect({
  label,
  name,
  placeholder,
  options,
  value: controlledValue,
  onChange,
  error,
}: StyledSelectProps) {
  const [open, setOpen] = useState(false);
  const [uncontrolled, setUncontrolled] = useState("");
  const value = controlledValue ?? uncontrolled;
  const selected = options.find((option) => optionValue(option) === value);
  const display = selected ? optionLabel(selected) : "";

  return (
    <div className="relative text-xs font-bold text-[#14532D]">
      <label htmlFor={`${name}-button`}>{label}</label>
      <input type="hidden" name={name} value={value} />
      <button
        id={`${name}-button`}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`mt-1.5 flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 py-3 text-left text-sm font-medium text-[#172018] shadow-sm outline-none transition-colors hover:border-[#65A30D] focus:border-[#0B3B24] focus:ring-2 focus:ring-[#DDECCB] ${
          error ? "border-red-500" : "border-[#cbd8c5]"
        }`}
      >
        <span className={display ? "text-[#172018]" : "text-[#9aa59a]"}>{display || placeholder}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-[#14532D] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-auto rounded-xl border border-[#dfe8d7] bg-[#FAF9F3] p-1.5 shadow-[0_14px_30px_rgba(11,59,36,0.14)]"
        >
          {options.map((option) => {
            const nextValue = optionValue(option);
            const nextLabel = optionLabel(option);
            return (
              <button
                key={nextValue}
                type="button"
                role="option"
                aria-selected={value === nextValue}
                onClick={() => {
                  onChange?.(nextValue);
                  if (controlledValue === undefined) setUncontrolled(nextValue);
                  setOpen(false);
                }}
                className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-[#DDECCB] hover:text-[#0B3B24] ${
                  value === nextValue ? "bg-[#DDECCB] font-bold text-[#0B3B24]" : "text-[#172018]"
                }`}
              >
                {nextLabel}
              </button>
            );
          })}
        </div>
      ) : null}
      <ValidationMessage message={error} />
    </div>
  );
}
