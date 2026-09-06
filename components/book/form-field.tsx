import type { ReactNode } from "react";
import { ValidationMessage } from "@/components/book/validation-message";

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
};

export function FormField({ label, htmlFor, error, optional, children }: FormFieldProps) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-bold text-[#14532D]">
      {label}
      {optional ? <span className="font-medium text-[#405347]"> (optional)</span> : null}
      {children}
      <ValidationMessage message={error} />
    </label>
  );
}

export function inputClass(error?: string) {
  return `mt-0 w-full rounded-xl border bg-white px-3.5 py-3 text-[14.5px] font-medium text-[#16241C] outline-none transition placeholder:text-[#9aa59a] focus:border-[#4d7c0f] ${
    error ? "border-red-500" : "border-[#cbd8c5]"
  }`;
}
