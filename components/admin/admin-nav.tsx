"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AdminNav({ email }: { email: string }) {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <header className="border-b border-[#DCE4D8] bg-white">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-5 px-5 sm:px-8">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="text-[16px] font-extrabold tracking-[-0.02em] text-[#0B3B24]">Premium Skip Bins <span className="text-[#65A30D]">Admin</span></Link>
          <Link href="/admin/stripe-test" className="hidden text-[13px] font-bold text-[#5B6B60] transition hover:text-[#0B3B24] sm:block">Stripe test</Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-[12px] font-medium text-[#6C786F] md:block">{email}</span>
          <button type="button" onClick={signOut} className="inline-flex items-center gap-2 rounded-full border border-[#CDD7CA] px-3.5 py-2 text-[12px] font-bold text-[#294437] transition hover:bg-[#F3F6EF]">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
