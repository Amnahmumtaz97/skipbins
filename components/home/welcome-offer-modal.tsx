"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Copy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const storageKey = "premium-skip-bin-welcome-offer-seen-v3";
const offerCode = "FIRST50";

export function WelcomeOfferModal() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(storageKey)) return;
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Storage can be unavailable in strict privacy modes; the offer can still be shown.
    }
    queueMicrotask(() => setOpen(true));
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const copyOffer = async () => {
    try {
      await navigator.clipboard.writeText(offerCode);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#071D12]/75 p-4 backdrop-blur-sm sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-offer-title"
        className="welcome-offer-modal relative grid w-full max-w-[940px] overflow-hidden rounded-[26px] border border-white/20 bg-[#FAF9F3] shadow-[0_30px_100px_rgba(0,0,0,0.32)] md:grid-cols-[0.9fr_1.1fr]"
      >
        <button
          type="button"
          aria-label="Close welcome offer"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#FAF9F3] text-[#0B3B24] shadow-md transition hover:bg-[#DDECCB]"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        <div className="relative flex min-h-44 items-center justify-center overflow-hidden bg-[#EEF5E5] px-5 pt-5 md:min-h-[510px] md:px-8">
          <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-[#DDECCB]" />
          <div className="absolute -bottom-20 -right-16 h-56 w-56 rounded-full bg-[#C6DAB0]/70" />
          <div className="relative z-[1] h-44 w-full max-w-[440px] md:h-[330px]">
            <Image
              src="/images/bin-6m3.png"
              alt="Realistic green steel skip bin"
              fill
              priority
              sizes="(max-width: 767px) 90vw, 42vw"
              className="object-contain drop-shadow-[0_22px_24px_rgba(11,59,36,0.22)]"
            />
          </div>
          <div className="absolute bottom-4 left-4 rounded-full border border-white/20 bg-[#0B3B24]/85 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
            Cleaner projects start here
          </div>
        </div>

        <div className="flex flex-col justify-center px-6 py-7 sm:px-9 sm:py-9 md:px-11">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#65A30D]">Welcome offer</p>
          <h2 id="welcome-offer-title" className="mt-2 text-[clamp(1.9rem,4vw,3.15rem)] font-black leading-[1.02] tracking-[-0.055em] text-[#0B3B24]">
            <span className="text-[#65A30D]">$50 Off</span> Till the End of 2026
          </h2>
          <p className="mt-4 text-[14px] leading-6 text-[#405347] sm:text-[15px]">
            Premium skip bin hire at a better price. Book your first bin online and save $50 until the end of 2026.
          </p>

          <Link
            href="/booking"
            onClick={() => setOpen(false)}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0B3B24] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#14532D]"
          >
            Book Online &amp; Save <ArrowRight size={17} />
          </Link>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[#C6DAB0] bg-[#EEF5E5] px-4 py-3">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#647067]">Offer code</p>
              <p className="mt-0.5 font-mono text-lg font-black tracking-[0.08em] text-[#0B3B24]">{offerCode}</p>
            </div>
            <button
              type="button"
              onClick={copyOffer}
              className="inline-flex min-w-[86px] items-center justify-center gap-1.5 rounded-full border border-[#0B3B24] bg-white px-3 py-2 text-xs font-bold text-[#0B3B24] transition hover:bg-[#DDECCB]"
              aria-live="polite"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <p className="mt-4 text-[10.5px] leading-4 text-[#6D796F]">
            New customers only. Terms, minimum booking value and selected service areas may apply.
          </p>
        </div>
      </section>
    </div>
  );
}
