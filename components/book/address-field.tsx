"use client";

import { useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { inputClass } from "@/components/book/form-field";
import { ValidationMessage } from "@/components/book/validation-message";
import { frequentAddresses, rememberAddress } from "@/lib/search-history";

type AddressSuggestion = { street: string; label: string };

const searchable = (value: string) => /^[a-zA-Z0-9 '/,.#-]{1,80}$/.test(value.trim());

export function AddressField({ value, displayValue, onChange, onSelectionChange, postcode, error, required, compact }: {
  value: string;
  displayValue?: string;
  onChange: (value: string, selectedLabel?: string) => void;
  onSelectionChange: (selected: boolean) => void;
  postcode: string;
  error?: string;
  required?: boolean;
  compact?: boolean;
}) {
  const id = useId();
  const [draftText, setDraftText] = useState<string | null>(null);
  const [selectedStreet, setSelectedStreet] = useState<string | null>(displayValue ? value : null);
  const [trackedPostcode, setTrackedPostcode] = useState(postcode);
  const [lookup, setLookup] = useState<{ query: string; results: AddressSuggestion[]; error?: string } | null>(null);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const [frequent, setFrequent] = useState<AddressSuggestion[]>([]);
  if (postcode !== trackedPostcode) {
    setTrackedPostcode(postcode);
    setDraftText(null);
    setSelectedStreet(null);
    setFrequent([]);
  }
  const text = draftText ?? displayValue ?? value;
  const postcodeReady = /^\d{4}$/.test(postcode);
  const canSearch = postcodeReady && searchable(text);
  const chosen = selectedStreet === value && canSearch;
  const current = lookup?.query === text ? lookup : null;
  const loading = canSearch && !chosen && !current;
  const showFrequent = text.trim() === "" || chosen;
  const results = showFrequent ? frequent : (current?.results ?? []);
  const open = focused && results.length > 0;

  const selectResult = (result: AddressSuggestion) => {
    setDraftText(result.label);
    setSelectedStreet(result.street);
    rememberAddress({ ...result, postcode });
    setFrequent(frequentAddresses(postcode));
    onChange(result.street, result.label);
    onSelectionChange(true);
    setFocused(false);
    setActive(-1);
  };

  useEffect(() => {
    if (!postcodeReady || !searchable(text)) return;
    if (chosen) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/addresses?q=${encodeURIComponent(text.trim())}&postcode=${encodeURIComponent(postcode)}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Address search is unavailable. Please try again.");
        if (!Array.isArray(data)) throw new Error("Address search is unavailable. Please try again.");
        if (!controller.signal.aborted) setLookup({ query: text, results: data });
      } catch (lookupError) {
        if (!controller.signal.aborted) setLookup({ query: text, results: [], error: lookupError instanceof Error && lookupError.name === "Error" ? lookupError.message : "Couldn't load addresses. Please check your connection and try again." });
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [chosen, postcode, postcodeReady, text]);

  return <div className="flex min-w-0 flex-col text-xs font-bold text-[#14532D]">
    <label htmlFor={id} className="block h-5 leading-5">Delivery address</label>
    <div className="relative mt-1.5">
    <input id={id} name="street-address" value={text} onChange={(event) => { setDraftText(event.target.value); setSelectedStreet(null); onSelectionChange(false); onChange(event.target.value); setActive(-1); setFocused(true); }}
      autoComplete="off" maxLength={240} required={required} placeholder="Street address" aria-invalid={Boolean(error)} aria-describedby={`${id}-help`}
      role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-results`}
      aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
      onFocus={() => { setFrequent(frequentAddresses(postcode)); setFocused(true); }} onBlur={() => setFocused(false)}
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
    <ul id={`${id}-results`} role="listbox" aria-label={showFrequent ? "Frequently selected addresses" : "Matching addresses"} hidden={!open} className="absolute z-40 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-[#cbd8c5] bg-white shadow-lg">
      {showFrequent ? <li role="presentation" className="px-3 pb-1 pt-2.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#718078]">Frequently selected</li> : null}
      {results.map((result, index) => <li key={result.label} id={`${id}-option-${index}`} role="option" aria-selected={index === active}
        onMouseDown={(event) => event.preventDefault()} onClick={() => selectResult(result)}
        className={`flex min-h-11 cursor-pointer items-center break-words px-3 py-3 text-sm ${index === active ? "bg-[#DDECCB]" : "hover:bg-[#F4F7EC]"}`}>
        {result.label}
      </li>)}
    </ul>
    </div>
    <div id={`${id}-help`} aria-live="polite" className="font-medium">
      <ValidationMessage message={error || current?.error} />
      {!compact && !error && !current?.error && !postcodeReady ? <p className="mt-1 text-xs leading-5 text-[#405347]">Choose a suburb or postcode first.</p> : null}
      {!compact && !error && !current?.error && loading ? <p className="mt-1 text-xs leading-5 text-[#405347]">Looking up addresses…</p> : null}
    </div>
  </div>;
}
