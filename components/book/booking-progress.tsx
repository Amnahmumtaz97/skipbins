import { Check } from "lucide-react";

const STEPS = [
  { id: 1, label: "Bin size" },
  { id: 2, label: "Waste type" },
  { id: 3, label: "Location" },
  { id: 4, label: "Dates" },
  { id: 5, label: "Details" },
  { id: 6, label: "Review" },
] as const;

type BookingProgressProps = {
  current: number;
  maxReached: number;
  onSelect: (step: number) => void;
};

export function BookingProgress({ current, maxReached, onSelect }: BookingProgressProps) {
  const fill = ((current - 1) / (STEPS.length - 1)) * 100;

  return (
    <nav aria-label="Booking progress" className="relative">
      <div className="absolute bottom-4 left-[15px] top-4 w-0.5 bg-[#DDECCB]" />
      <div
        className="absolute left-[15px] top-4 w-0.5 origin-top bg-gradient-to-b from-[#14532D] to-[#65A30D] transition-[height] duration-300"
        style={{ height: `calc((100% - 32px) * ${fill / 100})` }}
      />
      <ol className="relative z-[2] flex flex-col gap-4">
        {STEPS.map((step) => {
          const done = step.id < current;
          const active = step.id === current;
          const reachable = step.id <= maxReached;
          const labelClass = done || active ? "font-bold text-[#0B3B24]" : "text-[#405347]";

          return (
            <li key={step.id} className="flex h-8 items-center">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onSelect(step.id)}
                className={`flex min-w-0 items-center gap-2 text-left ${reachable ? "cursor-pointer" : "cursor-not-allowed"}`}
                aria-current={active ? "step" : undefined}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                    done
                      ? "bg-[#0B3B24] text-white"
                      : active
                        ? "bg-[#0B3B24] text-white shadow-[0_0_0_4px_#DDECCB]"
                        : "border-2 border-[#DDECCB] bg-white text-[#405347]"
                  }`}
                >
                  {done ? <Check size={16} strokeWidth={2.6} /> : step.id}
                </span>
                <span className={`text-[11px] leading-tight sm:text-[12px] ${labelClass}`}>
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
