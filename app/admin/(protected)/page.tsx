import Link from "next/link";
import { ArrowRight, CreditCard } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#65A30D]">Admin dashboard</p>
      <h1 className="mt-2 text-[36px] font-extrabold tracking-[-0.04em] text-[#0B3B24]">Payment tools</h1>
      <Link href="/admin/stripe-test" className="mt-7 flex max-w-xl items-center gap-4 rounded-[22px] border border-[#DCE4D8] bg-white p-5 shadow-[0_12px_40px_rgba(22,36,28,0.06)] transition hover:border-[#9EB596] hover:shadow-[0_16px_45px_rgba(22,36,28,0.09)]">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EAF4DF] text-[#2F7D22]"><CreditCard className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1"><strong className="block text-[16px] text-[#0B3B24]">Stripe payment test</strong><span className="mt-1 block text-[12px] leading-5 text-[#6C786F]">Run a minimum-value payment without creating a booking.</span></span>
        <ArrowRight className="h-5 w-5 shrink-0 text-[#65A30D]" />
      </Link>
    </div>
  );
}
