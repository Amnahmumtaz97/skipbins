"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, Leaf, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

const links = ["Bin Sizes", "What We Accept", "FAQs", "Contact Us"];

const sectionFor: Record<string, string> = {
  "Bin Sizes": "bin-sizes",
  "What We Accept": "what-we-accept",
  FAQs: "faqs",
};

const pendingSectionKey = "skipbins:pending-section";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname !== "/") return;
    const legacySection = window.location.hash.slice(1);
    const pendingSection = window.sessionStorage.getItem(pendingSectionKey);
    const section = pendingSection || legacySection;
    if (!section) return;
    window.sessionStorage.removeItem(pendingSectionKey);
    if (legacySection) window.history.replaceState(window.history.state, "", "/");
    window.requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [pathname]);

  const goToSection = (section: string) => {
    setOpen(false);
    if (pathname === "/") {
      document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    window.sessionStorage.setItem(pendingSectionKey, section);
    router.push("/");
  };

  const navItem = (item: string, mobile = false) => {
    const className = mobile
      ? "w-full rounded-full border border-[#DDECCB] bg-[#FAF9F3]/95 px-4 py-3 text-left shadow-sm transition-colors hover:bg-[#DDECCB] hover:text-[#0B3B24]"
      : "rounded-full border border-[#cbd8c5] bg-[#DDECCB] px-4 py-2.5 text-[#0B3B24] shadow-sm backdrop-blur-md transition-colors hover:border-[#b8d69a] hover:bg-[#cce3b1]";
    if (item === "Contact Us") return <Link key={item} href="/contact" className={className} onClick={() => setOpen(false)}>{item}</Link>;
    const section = sectionFor[item];
    if (section) return <button key={item} type="button" className={className} onClick={() => goToSection(section)}>{item}</button>;
    return <Link key={item} href="/" className={className} onClick={() => setOpen(false)}>{item}</Link>;
  };

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

        </div>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 whitespace-nowrap bg-transparent text-sm font-semibold xl:flex">
          {links.map((item) => navItem(item))}
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
          {links.map((item) => navItem(item, true))}
        </nav>
      )}
    </header>
  );
}
