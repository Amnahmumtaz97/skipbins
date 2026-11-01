import type { Metadata } from "next";
import { CheckoutPage } from "@/components/checkout/checkout-page";

export const metadata: Metadata = {
  title: "Secure checkout | SkippyBinHire",
  description: "Complete your SkippyBinHire booking securely.",
};

export default function CheckoutRoute() {
  return <CheckoutPage />;
}
