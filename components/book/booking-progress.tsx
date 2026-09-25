import { Check } from "lucide-react";

const STEPS = [
  { id: 1, label: "Waste type" },
  { id: 2, label: "Bin size" },
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
    <div className="relative mb-8 pt-0.5">
      <div className="absolute left-[19px] right-[19px] top-[19px] h-[3px] bg-[#DDECCB]" />
      <div
        className="absolute left-[19px] top-[19px] h-[3px] bg-gradient-to-r from-[#14532D] to-[#65A30D] transition-[width] duration-300"
        style={{ width: `calc((100% - 38px) * ${fill / 100})` }}
      />
      <ol className="relative z-[2] flex justify-between">
        {STEPS.map((step) => {
          const done = step.id < current;
          const active = step.id === current;
          const reachable = step.id <= maxReached;
          const labelClass = done || active ? "font-bold text-[#0B3B24]" : "text-[#405347]";

          return (
            <li key={step.id} className="flex flex-1 flex-col items-center gap-2">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onSelect(step.id)}
                className={`flex h-[38px] w-[38px] items-center justify-center rounded-full text-sm font-semibold transition ${
                  done
                    ? "bg-[#4d7c0f] text-white"
                    : active
                      ? "bg-[#0B3B24] text-white shadow-[0_0_0_4px_#DDECCB]"
                      : "border-2 border-[#DDECCB] bg-white text-[#405347]"
                } ${reachable ? "cursor-pointer" : "cursor-not-allowed"}`}
                aria-current={active ? "step" : undefined}
                aria-label={step.label}
              >
                {done ? <Check size={16} strokeWidth={2.6} /> : step.id}
              </button>
              <span className={`max-w-[70px] text-center text-[11px] leading-tight sm:max-w-none ${labelClass}`}>
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
