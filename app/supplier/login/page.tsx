import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Boxes, Route, ShieldCheck, Truck } from "lucide-react";
import { SupplierLoginForm } from "@/components/supplier/supplier-login-form";
import { isSupplierUser } from "@/lib/server/admin-auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Supplier sign in | Premium Skip Bin Hire" };

export default async function SupplierLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const requested = typeof params.next === "string" ? params.next : "/supplier";
  const nextPath = requested.startsWith("/supplier") && !requested.startsWith("//") ? requested : "/supplier";
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (isSupplierUser(user)) redirect(nextPath);
  const unauthorized = params.error === "not-authorized";
  return <main className="grid min-h-screen bg-[#F4F7EC] text-[#16241C] lg:grid-cols-[1.05fr_.95fr]"><section className="hidden bg-[#0B3B24] p-12 text-white lg:flex lg:flex-col lg:justify-between"><div><p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#C7F34A]">Premium Skip Bins</p><h1 className="mt-7 max-w-xl text-[48px] font-extrabold leading-[1.04] tracking-[-0.05em]">Every assigned job, clearly organised.</h1><p className="mt-5 max-w-lg text-[15px] leading-7 text-white/60">Accept work, prepare deliveries, update bin movements and keep collections on schedule.</p></div><div className="grid grid-cols-3 gap-3"><Feature icon={Truck} label="Assigned runs" /><Feature icon={Route} label="Job status" /><Feature icon={Boxes} label="Bin supply" /></div></section><section className="flex items-center justify-center px-5 py-12"><div className="w-full max-w-[430px]"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#DDECCB] text-[#2F7D22]"><ShieldCheck className="h-5 w-5" /></span><p className="mt-6 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#65A30D]">Supplier access</p><h2 className="mt-2 text-[31px] font-extrabold tracking-[-0.04em] text-[#0B3B24]">Welcome back</h2><p className="mt-2 text-[13px] leading-5 text-[#66746B]">Sign in with the account connected to your supplier profile.</p>{unauthorized ? <p className="mt-5 rounded-xl bg-[#FFF3F1] px-4 py-3 text-[12px] font-medium text-[#8E2F23]">This account does not have supplier access.</p> : null}<SupplierLoginForm nextPath={nextPath} /></div></section></main>;
}

function Feature({ icon: Icon, label }: { icon: typeof Truck; label: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><Icon className="h-5 w-5 text-[#C7F34A]" /><p className="mt-3 text-[11px] font-bold">{label}</p></div>; }
