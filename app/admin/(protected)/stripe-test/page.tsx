import type { Metadata } from "next";
import { StripeTestTool } from "@/components/admin/stripe-test-tool";

export const metadata: Metadata = { title: "Stripe payment test | Admin" };

export default async function StripeTestPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <StripeTestTool cancelled={params.cancelled === "1"} />;
}
