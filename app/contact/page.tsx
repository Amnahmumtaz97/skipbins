import type { Metadata } from "next";
import Image from "next/image";
import { ContactUsSection } from "@/components/home/contact-us-section";
import { Navbar } from "@/components/home/navbar";
import { contactInfo } from "@/lib/data/skip-bins";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Contact Skip Bin Hire Melbourne",
  description:
    "Contact SkippyBinHire for skip bin hire in Melbourne. Ask about sizes, delivery areas, permits or same-week bookings.",
  path: "/contact",
  keywords: [
    "contact skip bin hire Melbourne",
    "skip bin hire phone Melbourne",
    "SkippyBinHire contact",
  ],
});

export default function Page() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#F4F7EC] pt-24 text-[#172018]">
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <Image
          src="/images/contact-australian-bushland.webp"
          alt=""
          fill
          priority
          className="object-cover object-[62%_center]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#F4F7EC]/78 via-[#E8F0E2]/72 to-[#F4F7EC]/92" />
      </div>
      <Navbar />
      <div className="relative z-10">
        <ContactUsSection contact={contactInfo} />
        <footer className="mx-auto flex max-w-[1400px] flex-col gap-3 border-t border-[#dce4d4] bg-[#F4F7EC]/75 px-5 py-8 text-sm text-[#405347] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-12">
          <span className="font-extrabold text-[#0B3B24]">
            SkippyBinHire<span className="text-[#65A30D]">.</span>
          </span>
          <span>Melbourne skip bin hire · info@skippybinhire.com.au</span>
        </footer>
      </div>
    </main>
  );
}
