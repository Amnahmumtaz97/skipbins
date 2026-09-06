"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

type DifferenceItem = {
  id: string;
  text: string;
};

export function DifferenceSlider({ items }: { items: DifferenceItem[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative">
      <ul className="grid gap-4 text-sm font-semibold text-[#14532D] sm:grid-cols-2">
        {items.map((item, index) => (
          <li
            key={item.id}
            className={`flex items-center gap-3 transition-all duration-300 ${
              index === currentIndex || index === currentIndex + 1
                ? "opacity-100"
                : "hidden sm:flex"
            }`}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#DDECCB] text-[#14532D]">
              <Check size={15} strokeWidth={3} />
            </span>
            {item.text}
          </li>
        ))}
      </ul>

      {/* Navigation Buttons */}
      <div className="mt-6 flex items-center justify-center gap-3 sm:hidden">
        <button
          onClick={handlePrev}
          aria-label="Previous difference"
          className="rounded-full bg-[#DDECCB] p-2 text-[#14532D] transition-colors hover:bg-[#cce3b1]"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              aria-label={`Go to difference ${index + 1}`}
              aria-current={index === currentIndex}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === currentIndex ? "bg-[#14532D]" : "bg-[#DDECCB]"
              }`}
            />
          ))}
        </div>
        <button
          onClick={handleNext}
          aria-label="Next difference"
          className="rounded-full bg-[#DDECCB] p-2 text-[#14532D] transition-colors hover:bg-[#cce3b1]"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
