"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { ValidationMessage } from "@/components/book/validation-message";
import { todayIsoDate } from "@/lib/booking-utils";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

type DatePickerProps = {
  label: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  error?: string;
  compact?: boolean;
};

function parseIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric" }).format(new Date(year, month, 1));
}

function displayDate(value: string) {
  const date = parseIso(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function DatePicker({ label, name = "delivery-date", value, onChange, min, error, compact }: DatePickerProps) {
  const minDate = min ?? todayIsoDate();
  const today = todayIsoDate();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState({ top: 0, left: 0, width: 228 });
  const selected = parseIso(value) ?? parseIso(minDate) ?? new Date();
  const [view, setView] = useState(() => ({ year: selected.getFullYear(), month: selected.getMonth() }));

  const days = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const start = new Date(view.year, view.month, 1 - startOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return { iso: toIso(date), day: date.getDate(), inMonth: date.getMonth() === view.month };
    });
  }, [view.month, view.year]);

  const placePanel = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 228;
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    const below = rect.bottom + 8;
    const height = 268;
    const top = below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 8) : below;
    setPanel({ top, left, width });
  };

  const openCalendar = () => {
    const next = parseIso(value) ?? parseIso(minDate) ?? new Date();
    setView({ year: next.getFullYear(), month: next.getMonth() });
    setOpen((current) => !current);
  };

  useLayoutEffect(() => {
    if (!open) return;
    placePanel();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onReposition = () => placePanel();
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  const shiftMonth = (delta: number) => {
    setView((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const pick = (iso: string) => {
    if (iso < minDate) return;
    onChange(iso);
    setOpen(false);
  };

  const calendar = open && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label={label}
          style={{ top: panel.top, left: panel.left, width: panel.width }}
          className="fixed z-[80] rounded-xl border border-[#dfe8d7] bg-[#FAF9F3] p-2 text-[#172018] shadow-[0_14px_30px_rgba(11,59,36,0.16)]"
        >
          <div className="mb-1 flex items-center justify-between gap-1">
            <p className="m-0 px-1 text-xs font-extrabold text-[#0B3B24]">{monthLabel(view.year, view.month)}</p>
            <div className="flex">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-[#14532D] transition hover:bg-[#DDECCB]"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-[#14532D] transition hover:bg-[#DDECCB]"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-0.5 text-center text-[10px] font-bold text-[#405347]">
                {day}
              </span>
            ))}
            {days.map((cell) => {
              const disabled = cell.iso < minDate;
              const selectedDay = cell.iso === value;
              const isToday = cell.iso === today;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selectedDay}
                  onClick={() => pick(cell.iso)}
                  className={`mx-auto flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-semibold transition ${
                    selectedDay
                      ? "bg-[#0B3B24] text-white"
                      : disabled
                        ? "cursor-not-allowed text-[#C7D2C9]"
                        : isToday
                          ? "bg-[#DDECCB] text-[#0B3B24] ring-1 ring-[#65A30D] hover:bg-[#cce3b1]"
                          : cell.inMonth
                            ? "text-[#172018] hover:bg-[#DDECCB] hover:text-[#0B3B24]"
                            : "text-[#8A968C] hover:bg-[#DDECCB] hover:text-[#0B3B24]"
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-[#E8E1CF] px-1 pt-1.5">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="text-[11px] font-bold text-[#14532D] transition hover:text-[#65A30D]"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={today < minDate}
              onClick={() => pick(today)}
              className="text-[11px] font-bold text-[#65A30D] transition hover:text-[#0B3B24] disabled:text-[#C7D2C9]"
            >
              Today
            </button>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div
      ref={rootRef}
      className={`relative flex min-w-0 flex-col ${compact ? "gap-1.5 text-[13px] font-semibold text-[#0B3B24]" : "text-xs font-bold text-[#14532D]"}`}
    >
      <label htmlFor={`${name}-button`} className={compact ? undefined : "block h-5 leading-5"}>{label}</label>
      <input type="hidden" name={name} value={value} />
      <button
        ref={buttonRef}
        id={`${name}-button`}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openCalendar}
        className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border bg-white px-3 py-3 text-left text-sm font-medium text-[#172018] shadow-sm outline-none transition-colors hover:border-[#65A30D] focus:border-[#0B3B24] focus:ring-2 focus:ring-[#DDECCB] ${
          compact ? "" : "mt-1.5 h-14"
        } ${error ? "border-red-500" : "border-[#cbd8c5]"}`}
      >
        <span className={value ? "text-[#172018]" : "text-[#9aa59a]"}>{value ? displayDate(value) : "Select a date"}</span>
        <Calendar size={16} className="shrink-0 text-[#14532D]" aria-hidden="true" />
      </button>
      {calendar}
      <ValidationMessage message={error} />
    </div>
  );
}
