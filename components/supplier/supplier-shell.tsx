"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, LayoutDashboard, LogOut, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SupplierShell({ supplierName, email }: { supplierName: string; email: string }) {
  const pathname = usePathname(); const router = useRouter();
  async function signOut() { await createClient().auth.signOut(); router.replace("/supplier/login"); router.refresh(); }
  const links = [{ href: "/supplier", label: "Today", icon: LayoutDashboard }, { href: "/supplier/orders", label: "All orders", icon: ClipboardList }];
  return <><aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] flex-col bg-[#0B3B24] p-4 text-white lg:flex"><Link href="/supplier" className="flex items-center gap-3 px-2 py-2"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C7F34A] text-[#0B3B24]"><Truck className="h-5 w-5" /></span><span><strong className="block text-[14px]">Supplier portal</strong><small className="block max-w-[145px] truncate text-[9px] font-bold uppercase tracking-[.12em] text-white/45">{supplierName}</small></span></Link><nav className="mt-8 space-y-1.5">{links.map(({ href, label, icon: Icon }) => { const active = href === "/supplier" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-bold ${active ? "bg-white text-[#0B3B24]" : "text-white/65 hover:bg-white/10"}`}><Icon className="h-4 w-4" />{label}</Link>; })}</nav><div className="mt-auto rounded-xl bg-white/[.07] p-3"><p className="truncate text-[10px] text-white/45">{email}</p><button type="button" onClick={signOut} className="mt-2 flex items-center gap-2 text-[11px] font-bold text-white/75"><LogOut className="h-3.5 w-3.5" /> Sign out</button></div></aside><header className="sticky top-0 z-40 flex items-center justify-between border-b border-[#DCE4D8] bg-white px-4 py-3 lg:hidden"><Link href="/supplier" className="text-[14px] font-extrabold text-[#0B3B24]">Supplier <span className="text-[#65A30D]">Portal</span></Link><div className="flex items-center gap-2">{links.map(({ href, label }) => <Link key={href} href={href} className={`rounded-lg px-2.5 py-2 text-[10px] font-bold ${pathname === href ? "bg-[#0B3B24] text-white" : "bg-[#F1F5EC] text-[#405347]"}`}>{label}</Link>)}<button type="button" onClick={signOut} aria-label="Sign out" className="p-2"><LogOut className="h-4 w-4" /></button></div></header></>;
}
