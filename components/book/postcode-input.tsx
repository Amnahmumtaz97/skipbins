"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { inputClass } from "@/components/book/form-field";

type PostcodeResult = {
  postcode: string;
  suburb: string;
  state: string;
};

type PostcodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

export function PostcodeInput({ value, onChange, error }: PostcodeInputProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<PostcodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/postcodes?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        setResults([]);
        return;
      }
      const data: PostcodeResult[] = await res.json();
      setResults(data);
      setOpen(data.length > 0);
      setActiveIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(val), 300);
  };

  const selectResult = (result: PostcodeResult) => {
    const formatted = `${result.suburb} ${result.postcode}, ${result.state}`;
    setQuery(formatted);
    onChange(formatted);
    setOpen(false);
    setResults([]);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i < results.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : results.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectResult(results[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Brisbane 4000"
          className={inputClass(error)}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
        />
        {loading ? (
          <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#5B6B60]" />
        ) : null}
      </div>

      {open && results.length > 0 ? (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-[#E8E1CF] bg-white py-1 shadow-lg"
        >
          {results.map((result, index) => (
            <li
              key={`${result.postcode}-${result.suburb}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={() => selectResult(result)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-[14px] transition ${
                index === activeIndex ? "bg-[#DDECCB] text-[#0B3B24]" : "text-[#16241C] hover:bg-[#F6F2E7]"
              }`}
            >
              <MapPin size={14} className="shrink-0 text-[#5B6B60]" />
              <span>
                <span className="font-semibold">{result.suburb}</span>{" "}
                <span className="text-[#5B6B60]">
                  {result.postcode}, {result.state}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
