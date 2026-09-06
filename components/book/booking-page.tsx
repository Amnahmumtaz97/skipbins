"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Leaf } from "lucide-react";
import { BinSelector } from "@/components/book/bin-selector";
import { BookingLiveSummary } from "@/components/book/booking-live-summary";
import { BookingProgress } from "@/components/book/booking-progress";
import { BookingSummary } from "@/components/book/booking-summary";
import { PostcodeInput } from "@/components/book/postcode-input";
import { inputClass } from "@/components/book/form-field";
import { ValidationMessage } from "@/components/book/validation-message";
import { WasteTypeSelector } from "@/components/book/waste-type-selector";
import { Navbar } from "@/components/home/navbar";
import { acceptedWaste, bins, hirePeriods, placements } from "@/lib/data/skip-bins";
import {
  isValidAuPhone,
  isValidEmail,
  parsePrice,
  quoteForHire,
  resolveBinId,
  resolveWasteId,
  todayIsoDate,
} from "@/lib/booking-utils";
import type { BinPlacement, BookingFormState, HirePeriod } from "@/types/skip-bin";

function buildReference() {
  return `SB-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

type BookingPageProps = {
  initialSize?: string;
  initialLocation?: string;
  initialWaste?: string;
  initialDate?: string;
};

type FieldKey = keyof BookingFormState;

const titles = [
  "Choose your bin size",
  "What are you throwing away?",
  "Where do you need it delivered?",
  "When should we deliver?",
  "Your details",
  "Review your booking",
];

const intros = [
  "General sizing guide below — if you're not sure, our size guide or support team can help confirm the right fit.",
  "Choose the waste stream that best matches your load — pricing is calculated from your selection, so an accurate match keeps your quote correct.",
  "We use your suburb or postcode to check service availability and calculate accurate pricing for your area.",
  "Choose your delivery date. Flexible rental periods are available and pickup is included.",
  "We'll use this to confirm your booking and coordinate delivery with you.",
  "Check everything looks right before you confirm your booking.",
];

export function BookingPage({ initialSize, initialLocation, initialWaste, initialDate }: BookingPageProps) {
  const [form, setForm] = useState<BookingFormState>({
    fullName: "",
    email: "",
    phone: "",
    address: initialLocation?.trim() ?? "",
    streetAddress: "",
    placement: "",
    access: "",
    deliveryDate: initialDate && initialDate >= todayIsoDate() ? initialDate : "",
    binSize: resolveBinId(initialSize),
    wasteType: resolveWasteId(initialWaste),
    hirePeriod: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [step, setStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);
  const [bookingReference, setBookingReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedBin = bins.find((bin) => bin.id === form.binSize);
  const estimatedTotal = useMemo(() => {
    if (!selectedBin || !form.hirePeriod) return null;
    return quoteForHire(parsePrice(selectedBin.price), form.hirePeriod);
  }, [form.hirePeriod, selectedBin]);

  const updateField = <K extends FieldKey>(field: K, value: BookingFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const validateStep = (currentStep: number) => {
    const nextErrors: Partial<Record<FieldKey, string>> = {};

    if (currentStep === 1 && !form.binSize) nextErrors.binSize = "Please select a bin size.";
    if (currentStep === 2 && !form.wasteType) nextErrors.wasteType = "Please select a waste type.";
    if (currentStep === 3 && !form.address.trim()) nextErrors.address = "Please enter your suburb or postcode.";
    if (currentStep === 4) {
      if (!form.deliveryDate) nextErrors.deliveryDate = "Please select a delivery date.";
      else if (form.deliveryDate < todayIsoDate()) nextErrors.deliveryDate = "Please select a delivery date.";
      if (!form.hirePeriod) nextErrors.hirePeriod = "Please select a rental period.";
    }
    if (currentStep === 5) {
      if (!form.fullName.trim()) nextErrors.fullName = "Please enter your full name.";
      if (!form.email.trim()) nextErrors.email = "Please enter a valid email address.";
      else if (!isValidEmail(form.email)) nextErrors.email = "Please enter a valid email address.";
      if (!form.phone.trim()) nextErrors.phone = "Please enter a valid phone number.";
      else if (!isValidAuPhone(form.phone)) nextErrors.phone = "Please enter a valid phone number.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goTo = (nextStep: number) => {
    if (nextStep < 1 || nextStep > maxReached) return;
    setErrors({});
    setStep(nextStep);
  };

  const handleContinue = () => {
    if (!validateStep(step)) return;
    const nextStep = Math.min(step + 1, 6);
    setMaxReached((current) => Math.max(current, nextStep));
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setErrors({});
    setStep((current) => Math.max(1, current - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step !== 6) {
      handleContinue();
      return;
    }
    if (!validateStep(5)) {
      setStep(5);
      setMaxReached((current) => Math.max(current, 5));
      return;
    }
    setSubmitting(true);
    window.setTimeout(() => {
      setBookingReference(buildReference());
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 400);
  };

  const confirmed = Boolean(bookingReference);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F6F2E7] text-[#16241C]">
      <Navbar />

      <div className="mx-auto w-full max-w-[1100px] px-5 pb-20 pt-32 sm:px-6 sm:pt-36">
        <div className="flex gap-8">
          {/* ---- main content ---- */}
          <div className="min-w-0 flex-1 max-w-[720px]">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h1 className="m-0 text-[22px] font-semibold tracking-[-0.01em] text-[#0B3B24] sm:text-[27px]">
            {confirmed ? "You're all set" : titles[step - 1]}
          </h1>
          {confirmed ? null : <span className="whitespace-nowrap text-[13px] font-semibold text-[#5B6B60]">Step {step} of 6</span>}
        </div>

        {confirmed ? null : <BookingProgress current={step} maxReached={maxReached} onSelect={goTo} />}

        {confirmed ? null : <p className="mb-5 mt-0 text-[14.5px] leading-relaxed text-[#5B6B60]">{intros[step - 1]}</p>}

        {confirmed ? (
          <div className="px-2.5 pb-2.5 pt-8 text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#65A30D] text-[#0B3B24]">
              <Check size={26} strokeWidth={2.6} />
            </span>
            <h2 className="m-0 text-[22px] font-semibold text-[#0B3B24]">Booking confirmed</h2>
            <p className="mx-auto mt-2 max-w-[420px] text-[14.5px] leading-relaxed text-[#5B6B60]">
              Reference {bookingReference}. We&apos;ll send a confirmation to {form.email || "your email"} with delivery
              details.
            </p>
            <div className="mt-8 text-left">
              <BookingSummary form={form} total={estimatedTotal} />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div key={step} className="animate-[fadeStep_280ms_ease]">
              {step === 1 ? (
                <BinSelector value={form.binSize} onChange={(value) => updateField("binSize", value)} error={errors.binSize} />
              ) : null}

              {step === 2 ? (
                <WasteTypeSelector
                  accepted={acceptedWaste}
                  value={form.wasteType}
                  onChange={(value) => updateField("wasteType", value)}
                  error={errors.wasteType}
                />
              ) : null}

              {step === 3 ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#0B3B24]">
                      Suburb or postcode
                      <PostcodeInput
                        value={form.address}
                        onChange={(value) => updateField("address", value)}
                        error={errors.address}
                      />
                      <ValidationMessage message={errors.address} />
                    </label>
                    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#0B3B24]">
                      Delivery address
                      <input
                        value={form.streetAddress}
                        onChange={(event) => updateField("streetAddress", event.target.value)}
                        placeholder="Street address"
                        className={inputClass()}
                      />
                      <span className="text-xs font-medium text-[#5B6B60]">Optional</span>
                    </label>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[13px] font-semibold text-[#0B3B24]">Where should the bin be placed?</p>
                    <div className="flex flex-wrap gap-2">
                      {placements.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updateField("placement", option as BinPlacement)}
                          className={`rounded-full border-[1.5px] px-4 py-2.5 text-[13.5px] font-semibold ${
                            form.placement === option
                              ? "border-[#0B3B24] bg-[#0B3B24] text-white"
                              : "border-[#E8E1CF] bg-white text-[#5B6B60]"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-[#5B6B60]">
                      Placing a bin on the street may require council approval in some areas — check with your local council
                      if unsure.
                    </p>
                  </div>
                  <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#0B3B24]">
                    Access notes
                    <textarea
                      value={form.access}
                      onChange={(event) => updateField("access", event.target.value)}
                      placeholder="Narrow driveway, overhead power lines, gate code, etc."
                      className={`${inputClass()} min-h-20 resize-y`}
                    />
                    <span className="text-xs font-medium text-[#5B6B60]">Optional</span>
                  </label>
                </div>
              ) : null}

              {step === 4 ? (
                <div className="space-y-4">
                  <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#0B3B24]">
                    Delivery date
                    <input
                      type="date"
                      min={todayIsoDate()}
                      value={form.deliveryDate}
                      onChange={(event) => updateField("deliveryDate", event.target.value)}
                      className={inputClass(errors.deliveryDate)}
                    />
                    <ValidationMessage message={errors.deliveryDate} />
                  </label>
                  <div>
                    <p className="mb-1.5 text-[13px] font-semibold text-[#0B3B24]">Rental period</p>
                    <div className="flex flex-wrap gap-2">
                      {hirePeriods.map((period) => (
                        <button
                          key={period}
                          type="button"
                          onClick={() => updateField("hirePeriod", period as HirePeriod)}
                          className={`rounded-full border-[1.5px] px-4 py-2.5 text-[13.5px] font-semibold ${
                            form.hirePeriod === period
                              ? "border-[#0B3B24] bg-[#0B3B24] text-white"
                              : errors.hirePeriod
                                ? "border-red-500 bg-white text-[#5B6B60]"
                                : "border-[#E8E1CF] bg-white text-[#5B6B60]"
                          }`}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                    <ValidationMessage message={errors.hirePeriod} />
                    <p className="mt-2 text-xs text-[#5B6B60]">
                      Need a longer hire? Choose &quot;Long-term&quot; and our team will confirm timing with you.
                    </p>
                  </div>
                </div>
              ) : null}

              {step === 5 ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#0B3B24]">
                      Full name
                      <input
                        value={form.fullName}
                        onChange={(event) => updateField("fullName", event.target.value)}
                        placeholder="Your name"
                        className={inputClass(errors.fullName)}
                      />
                      <ValidationMessage message={errors.fullName} />
                    </label>
                    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#0B3B24]">
                      Phone number
                      <input
                        value={form.phone}
                        onChange={(event) => updateField("phone", event.target.value)}
                        placeholder="04xx xxx xxx"
                        className={inputClass(errors.phone)}
                      />
                      <ValidationMessage message={errors.phone} />
                    </label>
                    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#0B3B24] sm:col-span-2">
                      Email
                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) => updateField("email", event.target.value)}
                        placeholder="you@email.com"
                        className={inputClass(errors.email)}
                      />
                      <ValidationMessage message={errors.email} />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#0B3B24]">
                    Special instructions
                    <textarea
                      value={form.notes}
                      onChange={(event) => updateField("notes", event.target.value)}
                      placeholder="Anything our delivery team should know"
                      className={`${inputClass()} min-h-20 resize-y`}
                    />
                    <span className="text-xs font-medium text-[#5B6B60]">Optional</span>
                  </label>
                </div>
              ) : null}

              {step === 6 ? (
                <div>
                  <BookingSummary form={form} total={estimatedTotal} />
                  <p className="mt-4 flex items-center gap-2 text-[12.5px] text-[#5B6B60]">
                    <Leaf size={13} className="shrink-0 text-[#4d7c0f]" />
                    90% of collected waste is diverted from landfill through recycling and recovery.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-7 flex items-center justify-between border-t border-[#E8E1CF] pt-[22px]">
              {step === 1 ? (
                <Link
                  href="/"
                  className="rounded-full border-[1.5px] border-[#E8E1CF] bg-transparent px-6 py-3 text-sm font-bold text-[#0B3B24] transition hover:border-[#C6DAB0] hover:bg-[#DDECCB]"
                >
                  Back
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-full border-[1.5px] border-[#E8E1CF] bg-transparent px-6 py-3 text-sm font-bold text-[#0B3B24] transition hover:border-[#C6DAB0] hover:bg-[#DDECCB]"
                >
                  Back
                </button>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-[#0B3B24] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0D2417] disabled:cursor-not-allowed disabled:bg-[#C7D2C9]"
              >
                {step === 6 ? (submitting ? "Confirming..." : "Confirm booking") : "Next step"}
                {step === 6 ? <Check size={14} strokeWidth={2.6} /> : <ArrowRight size={14} />}
              </button>
            </div>
          </form>
        )}
          </div>

          {/* ---- live summary sidebar ---- */}
          {confirmed ? null : (
            <aside className="hidden w-[320px] shrink-0 lg:block">
              <div className="sticky top-36">
                <BookingLiveSummary form={form} total={estimatedTotal} currentStep={step} />
              </div>
            </aside>
          )}
        </div>
      </div>

      <div className="border-t border-[#E8E1CF] py-10 text-center">
        <p className="text-[13.5px] font-semibold text-[#0B3B24]">Still have questions?</p>
        <p className="mt-1 text-[13px] text-[#5B6B60]">
          Can&apos;t find the answer you&apos;re looking for? Please{" "}
          <Link href="/contact" className="font-semibold text-[#0B3B24] underline underline-offset-2 hover:text-[#65A30D]">
            contact us
          </Link>
          .
        </p>
      </div>

      <footer className="mx-auto flex max-w-[1400px] flex-col gap-3 border-t border-[#E8E1CF] px-5 py-8 text-sm text-[#5B6B60] sm:flex-row sm:items-center sm:justify-between sm:px-12">
        <span className="font-extrabold text-[#0B3B24]">
          SkipBins<span className="text-[#65A30D]">.</span>
        </span>
        <span>© 2026 SkipBins Australia · Waste less, live more.</span>
      </footer>
    </main>
  );
}
