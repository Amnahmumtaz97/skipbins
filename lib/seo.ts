import type { Metadata } from "next";

export const siteConfig = {
  name: "SkippyBinHire",
  legalName: "SkippyBinHire",
  url: (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.skippybinhire.com.au"
  ).replace(/\/$/, ""),
  locale: "en_AU",
  phone: "1300 SKIP BIN",
  email: "info@skippybinhire.com.au",
  area: "Melbourne, Victoria",
  tagline: "Skip more, spend less.",
  description:
    "Affordable skip bin hire in Melbourne. Same-week delivery across Victoria for homes, renovations and businesses. Clear pricing, free delivery & pickup.",
  keywords: [
    "skip bin hire Melbourne",
    "skip bins Melbourne",
    "cheap skip bin hire",
    "affordable skip bin hire Melbourne",
    "bin hire Melbourne",
    "rubbish bin hire Melbourne",
    "waste bin hire Victoria",
    "skip bin delivery Melbourne",
    "renovation skip bin",
    "garden waste skip bin",
    "construction skip bin hire",
    "SkippyBinHire",
  ],
  ogImage:
    "https://images.unsplash.com/photo-1503596476-1c12a8ba09a9?auto=format&fit=crop&w=1200&q=88",
} as const;

export function absoluteUrl(path = "/") {
  if (path.startsWith("http")) return path;
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export function createPageMetadata({
  title,
  description,
  path = "/",
  keywords,
  noIndex = false,
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
  /** Use for home/root so the layout title template is not appended twice. */
  absoluteTitle?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords: keywords ?? [...siteConfig.keywords],
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: "website",
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: "Skip bin hire Melbourne — SkippyBinHire",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [siteConfig.ogImage],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

export function localBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${siteConfig.url}/#business`,
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    url: siteConfig.url,
    image: siteConfig.ogImage,
    description: siteConfig.description,
    email: siteConfig.email,
    telephone: siteConfig.phone,
    areaServed: [
      { "@type": "City", name: "Melbourne" },
      { "@type": "State", name: "Victoria" },
      { "@type": "Country", name: "Australia" },
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Melbourne",
      addressRegion: "VIC",
      addressCountry: "AU",
    },
    priceRange: "$$",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "07:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "08:00",
        closes: "16:00",
      },
    ],
    sameAs: [],
    makesOffer: {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Skip bin hire Melbourne",
        description:
          "Skip bin delivery and pickup for household, green waste, renovation and construction waste across Melbourne.",
        areaServed: "Melbourne, VIC",
      },
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: "en-AU",
    potentialAction: {
      "@type": "OrderAction",
      target: absoluteUrl("/booking"),
    },
  };
}

export function faqJsonLd(
  items: Array<{ question: string; answer: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
