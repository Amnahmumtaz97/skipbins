"use client";

import Image from "next/image";
import { useState } from "react";
import { useAutoAdvance } from "@/hooks/use-auto-advance";
import type { HeroSlide } from "@/types/skip-bin";

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [activeSlide, setActiveSlide] = useState(0);
  useAutoAdvance(() => setActiveSlide((current) => (current + 1) % slides.length), 6000);

  return <>
    {slides.map((slide, index) => <Image key={slide.image} src={slide.image} alt={slide.alt} fill priority={index === 0} className={`object-cover object-center transition-opacity duration-700 ${index === activeSlide ? "opacity-100" : "opacity-0"}`} sizes="100vw" />)}
    <div className="absolute bottom-5 left-5 z-10 flex items-center gap-2 rounded-full bg-[#0B3B24]/80 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm sm:bottom-7 sm:left-8"><span className="h-2 w-2 rounded-full bg-[#9bc96d]" />{slides[activeSlide].label}</div>
    <div className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 sm:bottom-7"><div className="flex items-center gap-1.5 rounded-full bg-[#0B3B24]/70 px-3 py-2 backdrop-blur-sm">{slides.map((slide, index) => <button key={slide.label} type="button" aria-label={`Show hero image ${index + 1}`} aria-current={index === activeSlide} onClick={() => setActiveSlide(index)} className={`h-2 w-2 rounded-full transition-colors ${index === activeSlide ? "bg-[#9bc96d]" : "bg-white/60"}`} />)}</div></div>
  </>;
}
