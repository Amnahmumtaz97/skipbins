"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { CheckCircle2, LoaderCircle, Send } from "lucide-react";

export function SupplierApplicationForm() {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    const body = Object.fromEntries(data.entries());

    try {
      const response = await fetch("/api/supplier/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "We couldn't submit your application.");
      setSubmitted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't submit your application.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return <div className="mt-7 rounded-2xl border border-[#CFE3C7] bg-[#F3F9EC] p-6 text-center"><CheckCircle2 className="mx-auto h-9 w-9 text-[#4D8C2D]" /><h3 className="mt-4 text-[19px] font-extrabold text-[#0B3B24]">Application received</h3><p className="mt-2 text-[12px] leading-6 text-[#5F7066]">Our team will review your details. You can sign in after your supplier account is approved.</p><Link href="/supplier/login" className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[#0B3B24] px-5 text-[12px] font-extrabold text-white">Return to sign in</Link></div>;
  }

  return <form onSubmit={submit} className="mt-6 space-y-4">
    <div className="grid gap-4 sm:grid-cols-2"><Field name="companyName" label="Company name" autoComplete="organization" /><Field name="contactName" label="Your name" autoComplete="name" /></div>
    <div className="grid gap-4 sm:grid-cols-2"><Field name="phone" label="Phone" type="tel" autoComplete="tel" /><Field name="email" label="Business email" type="email" autoComplete="email" /></div>
    <Field name="abn" label="ABN (optional)" inputMode="numeric" autoComplete="off" required={false} hint="11 digits, without spaces is fine." />
    <div className="grid gap-4 sm:grid-cols-2"><Field name="password" label="Password" type="password" autoComplete="new-password" hint="10+ characters, uppercase, lowercase and a number." /><Field name="confirmPassword" label="Confirm password" type="password" autoComplete="new-password" /></div>
    {error ? <p role="alert" className="rounded-xl bg-[#FFF3F1] px-4 py-3 text-[12px] font-medium text-[#8E2F23]">{error}</p> : null}
    <p className="text-[11px] leading-5 text-[#66746B]">Your application will be reviewed by our team before your account is activated.</p>
    <button type="submit" disabled={submitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0B3B24] px-5 text-[13px] font-extrabold text-white transition hover:bg-[#14532D] disabled:opacity-60">{submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{submitting ? "Submitting…" : "Apply to join Premium Skip Bins"}</button>
  </form>;
}

function Field({ name, label, type = "text", autoComplete, inputMode, required = true, hint }: { name: string; label: string; type?: string; autoComplete?: string; inputMode?: "numeric"; required?: boolean; hint?: string }) {
  return <label className="block text-[11px] font-bold text-[#294437]">{label}<input name={name} type={type} inputMode={inputMode} autoComplete={autoComplete} required={required} className="mt-1.5 h-11 w-full rounded-xl border border-[#CDD7CA] bg-white px-3.5 text-[13px] outline-none focus:border-[#65A30D] focus:ring-2 focus:ring-[#65A30D]/15" />{hint ? <span className="mt-1 block text-[9px] font-medium text-[#7B887F]">{hint}</span> : null}</label>;
}
