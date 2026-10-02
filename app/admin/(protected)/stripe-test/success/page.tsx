import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { getStripe } from "@/lib/server/stripe";
import { createClient } from "@/lib/supabase/server";
import { adminStripeTestAmountLabel } from "@/lib/data/admin-stripe-test";

export const metadata: Metadata = { title: "Stripe test result | Admin" };

export default async function StripeTestSuccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { data: { user } } = await (await createClient()).auth.getUser();
  const sessionId = typeof params.session_id === "string" && /^cs_[a-zA-Z0-9_]+$/.test(params.session_id) ? params.session_id : "";
  let paid = false;
  let bin = "Sample bin";
  let reference = "";
  if (sessionId) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      paid = session.payment_status === "paid"
        && session.metadata?.purpose === "admin_stripe_test"
        && session.metadata?.adminUserId === user?.id;
      bin = session.metadata?.binSize || bin;
      reference = session.payment_intent ? String(session.payment_intent) : session.id;
    } catch {
      paid = false;
    }
  }

  return (
    <div className="mx-auto max-w-xl rounded-[24px] border border-[#DCE4D8] bg-white p-7 text-center shadow-[0_18px_55px_rgba(22,36,28,0.08)] sm:p-9">
      {paid ? <CheckCircle2 className="mx-auto h-12 w-12 text-[#2F7D22]" /> : <CircleAlert className="mx-auto h-12 w-12 text-[#B26A17]" />}
      <h1 className="mt-5 text-[28px] font-extrabold tracking-[-0.04em] text-[#0B3B24]">{paid ? "Stripe test payment succeeded" : "Payment is not confirmed"}</h1>
      <p className="mt-3 text-[14px] leading-6 text-[#5B6B60]">{paid ? `${bin} was charged ${adminStripeTestAmountLabel} successfully. No customer booking was created.` : "Stripe has not reported this admin test payment as paid."}</p>
      {paid && reference ? <p className="mt-5 break-all rounded-xl bg-[#F6F2E7] px-4 py-3 font-mono text-[11px] text-[#5B6B60]">{reference}</p> : null}
      <Link href="/admin/stripe-test" className="mt-6 inline-flex rounded-xl bg-[#0B3B24] px-5 py-3 text-[13px] font-extrabold text-white transition hover:bg-[#14532D]">Run another test</Link>
    </div>
  );
}
