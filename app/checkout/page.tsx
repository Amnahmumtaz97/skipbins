import type { Metadata } from "next";
import { CheckoutPage } from "@/components/checkout/checkout-page";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Secure checkout",
  description: "Complete your SkippyBinHire skip bin booking securely.",
  path: "/checkout",
  noIndex: true,
});

export default function CheckoutRoute() {
  return <CheckoutPage />;
}
