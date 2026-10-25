"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { inputClass } from "@/components/book/form-field";
import { ValidationMessage } from "@/components/book/validation-message";
import { frequentPostcodes, rememberPostcode } from "@/lib/search-history";
import { searchSuburbs } from "@/lib/suburb-search";

export function PostcodeField({ value, displayValue, onChange, error }: {
  value: string;
  displayValue?: string;
  onChange: (value: string, label: string) => void;
  error?: string;
}) {
  const id = useId();
  const [text, setText] = useState(displayValue || value);
  const [selectedText, setSelectedText] = useState<string | null>(displayValue && displayValue !== value ? displayValue : null);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const [frequent, setFrequent] = useState<{ postcode: string; suburb: string; state: string }[]>([]);
  const [serviceSuburbs, setServiceSuburbs] = useState<Set<string> | null>(null);
  const [serviceError, setServiceError] = useState("");
  const chosen = selectedText === text;
  const trimmed = text.trim();
  const matches = useMemo(() => {
    if (!trimmed || chosen || !serviceSuburbs) return [];
    const found = searchSuburbs(trimmed).filter((row) =>
      serviceSuburbs.has(`${row.postcode}-${row.suburb.toUpperCase()}`),
    );
    return /^\d{4}$/.test(trimmed) ? found : found.slice(0, 12);
  }, [chosen, serviceSuburbs, trimmed]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/service-suburbs", { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !Array.isArray(data))
          throw new Error(data?.error || "Delivery suburbs are temporarily unavailable.");
        setServiceSuburbs(
          new Set(
            data
              .filter(
                (row) =>
                  row &&
                  typeof row.postcode === "string" &&
                  typeof row.suburb === "string",
              )
              .map(
                (row) =>
                  `${row.postcode}-${String(row.suburb).toUpperCase()}`,
              ),
          ),
        );
        setServiceError("");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setServiceSuburbs(new Set());
        setServiceError("Delivery suburbs are temporarily unavailable.");
      });
    return () => controller.abort();
  }, []);

  const showFrequent = trimmed === "" || chosen;
  const allowedFrequent = serviceSuburbs
    ? frequent.filter((row) =>
        serviceSuburbs.has(`${row.postcode}-${row.suburb.toUpperCase()}`),
      )
    : [];
  const results = showFrequent ? allowedFrequent : matches;
  const outsideArea =
    Boolean(serviceSuburbs) &&
    trimmed.length > 0 &&
    !chosen &&
    matches.length === 0 &&
    searchSuburbs(trimmed).length > 0;
  const open = focused && results.length > 0;
  const trimmedLength = trimmed.length;

  const selectResult = (result: { postcode: string; suburb: string; state: string }) => {
    const label = `${result.suburb}, ${result.state} ${result.postcode}`;
    setText(label);
    setSelectedText(label);
    rememberPostcode(result);
    setFrequent(frequentPostcodes());
    onChange(result.postcode, label);
    setFocused(false);
    setActive(-1);
  };

  return <div className="flex min-w-0 flex-col text-xs font-bold text-[#14532D]">
    <label htmlFor={id} className="block h-5 leading-5">Suburb or postcode</label>
    <div className="relative mt-1.5">
    <input id={id} name="postcode" value={text} onChange={(e) => { setText(e.target.value); setSelectedText(null); onChange(e.target.value, e.target.value); setActive(-1); setFocused(true); }}
      autoComplete="off" maxLength={60}
      required placeholder="e.g. Melbourne or 3000" aria-invalid={Boolean(error)} aria-describedby={`${id}-help`}
      role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-results`}
      aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
      onFocus={() => { setFrequent(frequentPostcodes()); setFocused(true); }} onBlur={() => setFocused(false)}
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
    <ul id={`${id}-results`} role="listbox" aria-label={showFrequent ? "Frequently selected postcodes" : "Matching suburbs"} hidden={!open} className="absolute z-40 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-[#cbd8c5] bg-white shadow-lg">
      {showFrequent ? <li role="presentation" className="px-3 pb-1 pt-2.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#718078]">Frequently selected</li> : null}
      {results.map((result, index) => <li key={`${result.postcode}-${result.suburb}-${result.state}`} id={`${id}-option-${index}`} role="option" aria-selected={index === active}
        onMouseDown={(event) => event.preventDefault()} onClick={() => selectResult(result)}
        className={`flex min-h-11 cursor-pointer items-center break-words px-3 py-3 text-sm ${index === active ? "bg-[#DDECCB]" : "hover:bg-[#F4F7EC]"}`}>
        {result.suburb}, {result.state} {result.postcode}
      </li>)}
    </ul>
    </div>
    <div id={`${id}-help`} aria-live="polite" className="font-medium">
      <ValidationMessage message={error} />
      {!error && serviceError ? <p className="mt-1 text-xs leading-5 text-[#405347]">{serviceError}</p> : null}
      {!error && !serviceError && !serviceSuburbs ? <p className="mt-1 text-xs leading-5 text-[#405347]">Checking delivery suburbs…</p> : null}
      {!error && !serviceError && serviceSuburbs && trimmedLength === 0 ? <p className="mt-1 text-xs leading-5 text-[#405347]">Start typing a suburb or 4-digit postcode in the delivery area.</p> : null}
      {!error && !serviceError && outsideArea ? <p className="mt-1 text-xs leading-5 text-[#405347]">Delivery is not available in this suburb.</p> : null}
      {!error && !serviceError && serviceSuburbs && trimmedLength > 0 && !chosen && !outsideArea && results.length === 0 ? <p className="mt-1 text-xs leading-5 text-[#405347]">No suburbs found. Please check your search.</p> : null}
      {!error && chosen ? <p className="mt-1 text-xs font-semibold leading-5 text-[#4D7C0F]">Suburb and postcode selected.</p> : null}
    </div>
  </div>;
}
