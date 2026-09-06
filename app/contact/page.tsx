import type { Metadata } from "next";
import { ContactUsSection } from "@/components/home/contact-us-section";
import { Navbar } from "@/components/home/navbar";
import { contactInfo } from "@/lib/data/skip-bins";

export const metadata: Metadata = {
  title: "Contact Us | SkipBins",
  description: "Contact SkipBins for local skip bin hire support in Sydney.",
};

export default function Page() {
  return (
    <main className="min-h-screen bg-[#F4F7EC] pt-24 text-[#172018]">
      <Navbar />
      <ContactUsSection contact={contactInfo} />
      <footer className="mx-auto flex max-w-[1400px] flex-col gap-3 border-t border-[#dce4d4] px-5 py-8 text-sm text-[#405347] sm:flex-row sm:items-center sm:justify-between sm:px-12">
        <span className="font-extrabold text-[#0B3B24]">
          SkipBins<span className="text-[#65A30D]">.</span>
        </span>
        <span>© 2025 SkipBins Australia · Waste less, live more.</span>
      </footer>
    </main>
  );
}
