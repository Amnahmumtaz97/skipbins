"use client";

import Link from "next/link";
import { Calendar, Leaf, Menu, X } from "lucide-react";
import { useState } from "react";

const links = ["Bin Sizes", "What We Accept", "FAQs", "Contact Us"];
const mobileLinks = ["For Homeowners", "For Business", ...links];

const hrefFor = (label: string) => {
  if (label === "Contact Us") return "/contact";
  if (label === "For Homeowners" || label === "For Business") return "/";
  return `/#${label.toLowerCase().replaceAll(" ", "-")}`;
};

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed left-0 right-0 top-0 z-20 w-full bg-transparent px-4 py-4 sm:px-8 sm:py-5 lg:px-10">
      <div className="relative flex items-center justify-between">
        <div className="flex flex-col items-start gap-2">
          <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-[-0.06em] text-[#0B3B24]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#65A30D]">
              <Leaf size={17} strokeWidth={2.5} />
            </span>
            <span>
              SkipBins<span className="text-[#65A30D]">.</span>
              <small className="ml-1 block text-[7px] font-semibold tracking-[0.03em] text-[#405347]">
                CLEANER SPACES, GREENER FUTURE
              </small>
            </span>
          </Link>

          <div className="hidden items-center gap-1 text-xs font-bold text-[#405347] md:flex">
            <Link
              href="/"
              className="rounded-lg bg-[#DDECCB] px-3 py-2 text-[#0B3B24] shadow-sm transition-colors hover:bg-[#cce3b1]"
            >
              For homeowners
            </Link>
            <Link href="/" className="rounded-lg px-3 py-2 transition-colors hover:text-[#0B3B24]">
              For business
            </Link>
          </div>
        </div>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 whitespace-nowrap bg-transparent text-sm font-semibold xl:flex">
          {links.map((item) => (
            <Link
              key={item}
              href={hrefFor(item)}
              className="rounded-full border border-[#cbd8c5] bg-[#DDECCB] px-4 py-2.5 text-[#0B3B24] shadow-sm backdrop-blur-md transition-colors hover:border-[#b8d69a] hover:bg-[#cce3b1]"
            >
              {item}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/book"
            className="hidden items-center gap-2 rounded-full bg-[#0B3B24] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#14532D] sm:flex"
          >
            <Calendar size={16} />
            Book a Bin
          </Link>
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen(!open)}
            className="rounded-lg p-2 text-[#0B3B24] transition-colors hover:bg-[#DDECCB] xl:hidden"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="mt-5 grid gap-2 border-t border-[#dfe8d7] pt-5 text-sm font-semibold text-[#14532D] xl:hidden">
          {mobileLinks.map((item) => (
            <Link
              className="rounded-full border border-[#DDECCB] bg-[#FAF9F3]/95 px-4 py-3 shadow-sm transition-colors hover:bg-[#DDECCB] hover:text-[#0B3B24]"
              key={item}
              href={hrefFor(item)}
              onClick={() => setOpen(false)}
            >
              {item}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
