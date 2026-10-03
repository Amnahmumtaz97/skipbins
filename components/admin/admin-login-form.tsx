"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AdminLoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    try {
      const { error: signInError } = await createClient().auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      router.replace(nextPath);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't sign you in.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-4">
      <label className="block text-[13px] font-bold text-[#294437]">
        Email
        <input
          name="email"
          type="email"
          autoComplete="username"
          placeholder="admin@yourcompany.com.au"
          required
          className="mt-2 h-12 w-full rounded-xl border border-[#CDD7CA] bg-white px-4 text-[14px] font-medium outline-none transition focus:border-[#16955F] focus:ring-2 focus:ring-[#16955F]/15"
        />
      </label>
      <label className="block text-[13px] font-bold text-[#294437]">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your admin password"
          required
          className="mt-2 h-12 w-full rounded-xl border border-[#CDD7CA] bg-white px-4 text-[14px] font-medium outline-none transition focus:border-[#16955F] focus:ring-2 focus:ring-[#16955F]/15"
        />
      </label>
      {error ? <p role="alert" className="rounded-xl bg-[#FFF3F1] px-4 py-3 text-[13px] font-medium text-[#8E2F23]">{error}</p> : null}
      <button
        type="submit"
        disabled={submitting}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0B3B24] px-5 text-[14px] font-extrabold text-white transition hover:bg-[#14532D] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
        {submitting ? "Signing in…" : "Sign in to admin"}
      </button>
    </form>
  );
}
