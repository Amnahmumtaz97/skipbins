import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { WelcomeOfferModal } from "@/components/home/welcome-offer-modal";
import { siteConfig } from "@/lib/seo";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Skip Bin Hire Melbourne | Affordable Skip Bins | SkippyBinHire",
    template: "%s | SkippyBinHire",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: "Skip bin hire",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: "Skip Bin Hire Melbourne | Affordable Skip Bins | SkippyBinHire",
    description: siteConfig.description,
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
    title: "Skip Bin Hire Melbourne | SkippyBinHire",
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-AU"
      className={`${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <WelcomeOfferModal />
      </body>
    </html>
  );
}
