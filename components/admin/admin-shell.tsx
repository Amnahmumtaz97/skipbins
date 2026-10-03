"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Boxes, ClipboardList, CreditCard, LayoutDashboard, LogOut, PackageSearch, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/suppliers", label: "Suppliers", icon: Truck },
  { href: "/admin/inventory", label: "Bin supply", icon: Boxes },
  { href: "/admin/stripe-test", label: "Stripe test", icon: CreditCard },
];

export function AdminShell({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[250px] flex-col border-r border-white/10 bg-[#092E1D] px-4 py-5 text-white lg:flex">
        <Link href="/admin" className="flex items-center gap-3 px-2 py-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C7F34A] text-[#0B3B24]"><PackageSearch className="h-5 w-5" /></span>
          <span><strong className="block text-[15px]">Premium Skip Bins</strong><small className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">Operations admin</small></span>
        </Link>
        <nav className="mt-8 space-y-1.5" aria-label="Admin navigation">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
            return <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition ${active ? "bg-white text-[#0B3B24]" : "text-white/65 hover:bg-white/10 hover:text-white"}`}><Icon className="h-4 w-4" />{label}</Link>;
          })}
        </nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <p className="truncate text-[11px] text-white/55">Signed in as</p>
          <p className="mt-1 truncate text-[12px] font-bold">{email}</p>
          <button type="button" onClick={signOut} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-[11px] font-bold transition hover:bg-white/15"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
        </div>
      </aside>
      <header className="sticky top-0 z-40 border-b border-[#DCE4D8] bg-white/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/admin" className="text-[14px] font-extrabold text-[#0B3B24]">Premium <span className="text-[#65A30D]">Admin</span></Link>
          <button type="button" onClick={signOut} aria-label="Sign out" className="rounded-lg border border-[#DCE4D8] p-2 text-[#405347]"><LogOut className="h-4 w-4" /></button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3" aria-label="Admin navigation">
          {links.map(({ href, label }) => <Link key={href} href={href} className={`whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-bold ${pathname === href ? "bg-[#0B3B24] text-white" : "bg-[#F1F5EC] text-[#405347]"}`}>{label}</Link>)}
        </nav>
      </header>
    </>
  );
}
