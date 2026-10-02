import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { isAdminUser } from "@/lib/server/admin-auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin sign in | Premium Skip Bin Hire" };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const requested = typeof params.next === "string" ? params.next : "/admin";
  const nextPath = requested.startsWith("/admin") && !requested.startsWith("//") ? requested : "/admin";
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (isAdminUser(user)) redirect(nextPath);
  const unauthorized = params.error === "not-authorized";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F2E7] px-5 py-12 text-[#16241C]">
      <section className="w-full max-w-[430px] rounded-[26px] border border-[#DCE4D8] bg-white p-7 shadow-[0_24px_80px_rgba(22,36,28,0.10)] sm:p-9">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF4DF] text-[#2F7D22]"><LockKeyhole className="h-5 w-5" /></span>
        <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#65A30D]">Protected area</p>
        <h1 className="mt-2 text-[29px] font-extrabold tracking-[-0.04em] text-[#0B3B24]">Admin sign in</h1>
        <p className="mt-2 text-[13px] leading-5 text-[#6C786F]">Use an approved Supabase admin account to continue.</p>
        {unauthorized ? <p className="mt-5 rounded-xl bg-[#FFF3F1] px-4 py-3 text-[13px] font-medium text-[#8E2F23]">This account does not have admin access.</p> : null}
        <AdminLoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}
