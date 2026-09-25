"use client";

import { useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { inputClass } from "@/components/book/form-field";
import { ValidationMessage } from "@/components/book/validation-message";
import { isValidPostcode } from "@/lib/postcode";

export function PostcodeField({ value, onChange, error }: {
  value: string; onChange: (value: string) => void; error?: string;
}) {
  const id = useId();
  const [text, setText] = useState(value);
  const [lookup, setLookup] = useState<{ query: string; results: { postcode: string; suburb: string; state: string }[]; error?: string } | null>(null);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const valid = isValidPostcode(text);
  const current = lookup?.query === text ? lookup : null;
  const loading = valid && !current;
  const results = current?.results ?? [];
  const open = focused && results.length > 0;
  const trimmedLength = text.trim().length;

  const selectResult = (result: { postcode: string; suburb: string; state: string }) => {
    setText(`${result.suburb}, ${result.state} ${result.postcode}`);
    onChange(result.postcode);
    setFocused(false);
    setActive(-1);
  };

  useEffect(() => {
    if (!isValidPostcode(text)) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/postcodes?q=${encodeURIComponent(text)}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Postcode search is unavailable. Please try again.");
        if (!Array.isArray(data)) throw new Error("Postcode search is unavailable. Please try again.");
        if (!controller.signal.aborted) setLookup({ query: text, results: data });
      } catch (error) {
        if (!controller.signal.aborted) setLookup({ query: text, results: [], error: error instanceof Error && error.name === "Error" ? error.message : "Couldn't load suburbs. Please check your connection and try again." });
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [text]);

  return <div className="flex min-w-0 flex-col text-xs font-bold text-[#14532D]">
    <label htmlFor={id} className="block h-5 leading-5">Suburb or postcode</label>
    <div className="relative mt-1.5">
    <input id={id} name="postcode" value={text} onChange={(e) => { setText(e.target.value); onChange(e.target.value); setActive(-1); setFocused(true); }}
      autoComplete="off" maxLength={60}
      required placeholder="e.g. Brisbane or 4000" aria-invalid={Boolean(error)} aria-describedby={`${id}-help`}
      role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-results`}
      aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setFocused(false);
        if (!open) return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setActive((index) => (index + (event.key === "ArrowDown" ? 1 : results.length - 1) + results.length) % results.length);
        }
        if (event.key === "Enter" && active >= 0) { event.preventDefault(); selectResult(results[active]); }
      }}
      className={`h-14 w-full min-w-0 text-base sm:text-sm ${inputClass(error)}`} />
    {loading ? <Loader2 aria-hidden="true" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#14532D]" /> : null}
    <ul id={`${id}-results`} role="listbox" aria-label="Matching suburbs" hidden={!open} className="absolute z-40 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-[#cbd8c5] bg-white shadow-lg">
      {results.map((result, index) => <li key={`${result.postcode}-${result.suburb}-${result.state}`} id={`${id}-option-${index}`} role="option" aria-selected={index === active}
        onMouseDown={(event) => event.preventDefault()} onClick={() => selectResult(result)}
        className={`flex min-h-11 cursor-pointer items-center break-words px-3 py-3 text-sm ${index === active ? "bg-[#DDECCB]" : "hover:bg-[#F4F7EC]"}`}>
        {result.suburb}, {result.state} {result.postcode}
      </li>)}
    </ul>
    </div>
    <div id={`${id}-help`} aria-live="polite" className="font-medium">
      <ValidationMessage message={error || current?.error} />
      {!error && trimmedLength > 0 && trimmedLength < 3 ? <p className="mt-1 text-xs leading-5 text-[#405347]">Enter at least 3 characters to search.</p> : null}
      {!error && !current?.error && valid && (loading || results.length === 0) ? <p className="mt-1 text-xs leading-5 text-[#405347]">{loading ? "Looking up suburbs…" : "No suburbs found. Please check your search."}</p> : null}
    </div>
  </div>;
}
