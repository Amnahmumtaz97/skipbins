"use client";

import { useState } from "react";
import { Check, CreditCard, LoaderCircle, ShieldCheck } from "lucide-react";
import { bins } from "@/lib/data/skip-bins";

export function StripeTestTool({ cancelled }: { cancelled: boolean }) {
  const [selectedBin, setSelectedBin] = useState(bins[0]?.id ?? "2m3");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/stripe-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ binId: selectedBin }),
      });
      const result = await response.json() as { checkoutUrl?: string; error?: string };
      if (!response.ok || !result.checkoutUrl) throw new Error(result.error ?? "Could not start Stripe Checkout.");
      window.location.assign(result.checkoutUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start Stripe Checkout.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#65A30D]">Payments diagnostics</p>
          <h1 className="mt-2 text-[32px] font-extrabold tracking-[-0.04em] text-[#0B3B24] sm:text-[40px]">Test Stripe Checkout</h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#5B6B60]">Choose a sample bin and run a real Stripe payment without creating a customer booking.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#CFE2BF] bg-[#EFF7E7] px-3.5 py-2 text-[12px] font-bold text-[#326017]"><ShieldCheck className="h-4 w-4" /> Admin only</span>
      </div>

      {cancelled ? <p className="mt-6 rounded-xl border border-[#E9D7A6] bg-[#FFF9E9] px-4 py-3 text-[13px] font-medium text-[#745B17]">The test payment was cancelled. No charge was made.</p> : null}

      <section className="mt-7 rounded-[22px] border border-[#DCE4D8] bg-white p-5 shadow-[0_14px_45px_rgba(22,36,28,0.06)] sm:p-7">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bins.map((bin) => {
            const selected = bin.id === selectedBin;
            const [length, width, height] = bin.dimensions.split(" × ");
            return (
              <button
                key={bin.id}
                type="button"
                onClick={() => setSelectedBin(bin.id)}
                className={`relative rounded-2xl border p-4 text-left transition ${selected ? "border-[#2F7D22] bg-[#F5FAEF] ring-1 ring-[#2F7D22]" : "border-[#DCE4D8] bg-white hover:border-[#9EB596]"}`}
                aria-pressed={selected}
              >
                {selected ? <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#2F7D22] text-white"><Check className="h-3.5 w-3.5" /></span> : null}
                <span className="text-[22px] font-extrabold tracking-[-0.04em] text-[#0B3B24]">{bin.size}</span>
                <span className="ml-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#6C786F]">Sample bin</span>
                <span className="mt-3 grid grid-cols-3 rounded-xl bg-[#F6F2E7] px-2 py-2.5">
                  {[{ label: "Length", value: length }, { label: "Width", value: width }, { label: "Height", value: height }].map((item, index) => (
                    <span key={item.label} className={`text-center ${index ? "border-l border-[#DDD8C8]" : ""}`}>
                      <span className="block text-[8px] font-bold uppercase tracking-[0.08em] text-[#718077]">{item.label}</span>
                      <span className="mt-0.5 block text-[13px] font-bold text-[#294437]">{item.value}</span>
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-5 rounded-2xl bg-[#0B3B24] p-5 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#A3E635]">Actual test charge</p>
            <p className="mt-1 text-[29px] font-extrabold tracking-[-0.04em]">A$0.50</p>
            <p className="mt-1 text-[11px] text-white/65">Stripe&apos;s minimum AUD charge · No booking will be created</p>
          </div>
          <button
            type="button"
            onClick={startCheckout}
            disabled={loading}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#A3E635] px-6 text-[14px] font-extrabold text-[#0B3B24] transition hover:bg-[#B7ED4E] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {loading ? "Opening Stripe…" : "Pay A$0.50 with Stripe"}
          </button>
        </div>
        {error ? <p role="alert" className="mt-4 rounded-xl bg-[#FFF3F1] px-4 py-3 text-[13px] font-medium text-[#8E2F23]">{error}</p> : null}
      </section>
    </div>
  );
}
