import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { WelcomeOfferModal } from "@/components/home/welcome-offer-modal";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Premium Skip Bin Hire | Skip more, spend less.",
  description: "Reliable skip bin hire for homes, renovations and businesses.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <WelcomeOfferModal />
      </body>
    </html>
  );
}
