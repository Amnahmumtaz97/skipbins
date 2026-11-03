import { HomePage } from "@/components/home/home-page";
import { JsonLd } from "@/components/seo/json-ld";
import { faqItems } from "@/lib/data/skip-bins";
import {
  createPageMetadata,
  faqJsonLd,
  localBusinessJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Skip Bin Hire Melbourne | Affordable Skip Bins | SkippyBinHire",
  description:
    "Book affordable skip bin hire in Melbourne. Clear prices, free delivery & pickup, and sizes for garden clean-ups, renovations and construction. Skip more, spend less.",
  path: "/",
  absoluteTitle: true,
});

export default function Page() {
  return (
    <>
      <JsonLd data={localBusinessJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <JsonLd
        data={faqJsonLd(
          faqItems.map((item) => ({
            question: item.question,
            answer: item.answer,
          })),
        )}
      />
      <HomePage />
    </>
  );
}
