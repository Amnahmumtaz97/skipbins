"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SupplierLoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    try {
      const { data: authData, error: authError } =
        await createClient().auth.signInWithPassword({
          email: String(data.get("email") ?? "").trim(),
          password: String(data.get("password") ?? ""),
        });
      if (authError) throw authError;
      const role = authData.user?.app_metadata?.role;
      const roles = authData.user?.app_metadata?.roles;
      if (
        role !== "supplier" &&
        !(Array.isArray(roles) && roles.includes("supplier"))
      ) {
        throw new Error(
          "Your supplier account is not active. If you recently applied, it may still be under review.",
        );
      }
      router.replace(nextPath);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "We couldn't sign you in.",
      );
      setSubmitting(false);
    }
  }
  return (
    <form onSubmit={submit} className="mt-7 space-y-4">
      <label className="block text-[12px] font-bold text-[#294437]">
        Work email
        <input
          name="email"
          type="email"
          autoComplete="username"
          placeholder="you@supplier.com.au"
          required
          className="mt-2 h-12 w-full rounded-xl border border-[#CDD7CA] bg-white px-4 text-[14px] outline-none placeholder:text-[#9AA69E] focus:border-[#65A30D] focus:ring-2 focus:ring-[#65A30D]/15"
        />
      </label>
      <label className="block text-[12px] font-bold text-[#294437]">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your supplier password"
          required
          className="mt-2 h-12 w-full rounded-xl border border-[#CDD7CA] bg-white px-4 text-[14px] outline-none placeholder:text-[#9AA69E] focus:border-[#65A30D] focus:ring-2 focus:ring-[#65A30D]/15"
        />
      </label>
      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-[#FFF3F1] px-4 py-3 text-[12px] font-medium text-[#8E2F23]"
        >
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={submitting}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0B3B24] px-5 text-[13px] font-extrabold text-white transition hover:bg-[#14532D] disabled:opacity-60"
      >
        {submitting ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <LogIn className="h-4 w-4" />
        )}
        {submitting ? "Signing in…" : "Open supplier portal"}
      </button>
    </form>
  );
}
