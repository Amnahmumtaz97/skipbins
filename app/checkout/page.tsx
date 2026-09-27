import type { Metadata } from "next";
import { CheckoutPage } from "@/components/checkout/checkout-page";

export const metadata: Metadata = {
  title: "Secure checkout | Premium Skip Bin Hire",
  description: "Complete your Premium Skip Bin Hire booking securely.",
};

export default function CheckoutRoute() {
  return <CheckoutPage />;
}
