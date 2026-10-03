import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, Handshake, Route, ShieldCheck, Truck } from "lucide-react";
import { SupplierApplicationForm } from "@/components/supplier/supplier-application-form";

export const metadata: Metadata = { title: "Apply as a supplier | Premium Skip Bin Hire" };

export default function SupplierApplyPage() {
  return <main className="grid min-h-screen bg-[#F4F7EC] text-[#16241C] lg:grid-cols-[.9fr_1.1fr]">
    <section className="hidden bg-[#0B3B24] p-12 text-white lg:flex lg:flex-col lg:justify-between"><div><p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#C7F34A]">Premium Skip Bins</p><h1 className="mt-7 max-w-xl text-[44px] font-extrabold leading-[1.04] tracking-[-0.05em]">Grow your skip bin business with us.</h1><p className="mt-5 max-w-lg text-[15px] leading-7 text-white/60">Join our supplier network, receive suitable local jobs and manage every assigned delivery and collection in one place.</p></div><div className="grid grid-cols-3 gap-3"><Feature icon={Truck} label="Local jobs" /><Feature icon={Route} label="Clear schedules" /><Feature icon={Boxes} label="Supply control" /></div></section>
    <section className="flex items-center justify-center px-5 py-10 sm:px-8"><div className="w-full max-w-[610px]"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#DDECCB] text-[#2F7D22]"><Handshake className="h-5 w-5" /></span><h2 className="mt-5 text-[30px] font-extrabold tracking-[-0.04em] text-[#0B3B24]">Supplier Portal</h2><div className="mt-5 grid grid-cols-2 rounded-xl bg-[#E7EDE2] p-1 text-center text-[11px] font-extrabold"><Link href="/supplier/login" className="rounded-lg px-4 py-2.5 text-[#526159]">Sign in</Link><span className="rounded-lg bg-white px-4 py-2.5 text-[#0B3B24] shadow-sm">Apply to join</span></div><SupplierApplicationForm /><p className="mt-4 flex items-center justify-center gap-1.5 text-[9px] text-[#7B887F]"><ShieldCheck className="h-3.5 w-3.5" /> Passwords are secured by Supabase Authentication.</p></div></section>
  </main>;
}

function Feature({ icon: Icon, label }: { icon: typeof Truck; label: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><Icon className="h-5 w-5 text-[#C7F34A]" /><p className="mt-3 text-[11px] font-bold">{label}</p></div>; }
