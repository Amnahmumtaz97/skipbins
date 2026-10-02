"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarClock, Check, CircleAlert, Leaf, Loader2 } from "lucide-react";
import { BinSelector } from "@/components/book/bin-selector";
import { BookingLiveSummary } from "@/components/book/booking-live-summary";
import { BookingExtras } from "@/components/book/booking-extras";
import { BookingProgress } from "@/components/book/booking-progress";
import { BookingSummary } from "@/components/book/booking-summary";
import { AddressField } from "@/components/book/address-field";
import { PostcodeField } from "@/components/book/postcode-field";
import { DatePicker } from "@/components/ui/date-picker";
import { isResolvedPostcode, postcodeSelectionError } from "@/lib/postcode";
import { isQuoteServiceUnavailable, requestQuote } from "@/lib/quote-client";
import { inputClass } from "@/components/book/form-field";
import { ValidationMessage } from "@/components/book/validation-message";
import { WasteTypeSelector } from "@/components/book/waste-type-selector";
import { Navbar } from "@/components/home/navbar";
import { acceptedWaste, bins, placements } from "@/lib/data/skip-bins";
import { emptyBookingExtras, type BookingExtraId } from "@/lib/data/booking-extras";
import { selectedAddressLocationError } from "@/lib/address-validation";
import {
  isSundayIso,
  isValidAuPhone,
  isValidEmail,
  maxPickupDate,
  resolveBinId,
  resolveWasteId,
  standardPickupDate,
  tomorrowIsoDate,
} from "@/lib/booking-utils";
import { quoteTotal } from "@/lib/pricing";
import { isAwaitingPayment, loadBookingDraft, saveBookingDraft, saveCheckoutClientSecret } from "@/lib/booking-draft";
import type { BinPlacement, BookingFormState } from "@/types/skip-bin";

type BookingPageProps = {
  initialSize?: string;
  initialLocation?: string;
  initialLocationLabel?: string;
  initialWaste?: string;
  initialDate?: string;
  initialPickupDate?: string;
  cancelled?: boolean;
};

type FieldKey = keyof BookingFormState;

function initialBookingForm({ initialSize, initialLocation, initialLocationLabel, initialWaste, initialDate, initialPickupDate }: Omit<BookingPageProps, "cancelled">): BookingFormState {
  const deliveryDate = initialDate && initialDate >= tomorrowIsoDate() && !isSundayIso(initialDate) ? initialDate : "";
  const standardPickup = deliveryDate ? standardPickupDate(deliveryDate) : "";
  const pickupDate = deliveryDate
    ? initialPickupDate
      && initialPickupDate >= standardPickup
      && initialPickupDate <= maxPickupDate(deliveryDate)
      && !isSundayIso(initialPickupDate)
        ? initialPickupDate
        : standardPickup
    : "";
  return {
    fullName: "",
    email: "",
    phone: "",
    address: initialLocation?.trim() ?? "",
    locationLabel: initialLocationLabel?.trim() || initialLocation?.trim() || "",
    streetAddress: "",
    deliveryAddressLabel: "",
    placement: "",
    access: "",
    deliveryDate,
    pickupDate,
    binSize: resolveBinId(initialSize),
    wasteType: resolveWasteId(initialWaste),
    hirePeriod: pickupDate && pickupDate !== standardPickup ? "Extended (14 days)" : "Standard (10 days)",
    extras: emptyBookingExtras(),
    notes: "",
  };
}

const titles = [
  "Choose your bin size",
  "What are you throwing away?",
  "Where do you need it delivered?",
  "When should we deliver and collect?",
  "Your details",
  "Review your booking",
];

const intros = [
  "General sizing guide below — if you're not sure, our size guide or support team can help confirm the right fit.",
  "Choose the waste stream that best matches your load — pricing is calculated from your selection, so an accurate match keeps your quote correct.",
  "We use your suburb or postcode to check service availability and calculate accurate pricing for your area.",
  "Choose your delivery and pickup dates. Flexible rental periods are available.",
  "We'll use this to confirm your booking and coordinate delivery with you.",
  "Check everything looks right before you confirm your booking.",
];

export function BookingPage({ initialSize, initialLocation, initialLocationLabel, initialWaste, initialDate, initialPickupDate, cancelled }: BookingPageProps) {
  const router = useRouter();
  const [form, setForm] = useState<BookingFormState>(() =>
    initialBookingForm({ initialSize, initialLocation, initialLocationLabel, initialWaste, initialDate, initialPickupDate }),
  );
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [step, setStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);
  const [bookingReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState(
    cancelled ? "Payment was cancelled. Your booking is not confirmed." : "",
  );
  const estimatedTotal = quoteTotal(form.binSize, form.hirePeriod, form.extras);
  const restoredDraft = useRef(false);

  useEffect(() => {
    if (restoredDraft.current) return;
    if (!cancelled && !isAwaitingPayment()) return;
    const draft = loadBookingDraft();
    if (!draft) return;
    restoredDraft.current = true;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setForm(draft);
      setAddressConfirmed(Boolean(draft.streetAddress.trim() && draft.deliveryAddressLabel.trim()));
      setStep(6);
      setMaxReached(6);
      if (cancelled) setRequestError("Payment was cancelled. Your booking is not confirmed.");
      window.scrollTo(0, 0);
    });
    return () => { active = false; };
  }, [cancelled]);

  const updateField = <K extends FieldKey>(field: K, value: BookingFormState[K]) => {
    setRequestError("");
    if (["binSize", "wasteType", "address", "streetAddress", "deliveryDate", "pickupDate", "hirePeriod"].includes(field)) {
      setMaxReached(step);
    }
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "address" && value !== current.address ? { streetAddress: "", deliveryAddressLabel: "" } : {}),
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      if (field === "address") delete next.streetAddress;
      return next;
    });
  };

  const updatePostcode = (value: string, label: string) => {
    setRequestError("");
    setMaxReached(step);
    setAddressConfirmed(false);
    setForm((current) => ({
      ...current,
      address: value,
      locationLabel: label,
      ...(value !== current.address ? { streetAddress: "", deliveryAddressLabel: "" } : {}),
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next.address;
      delete next.streetAddress;
      return next;
    });
  };

  const updateStreetAddress = (value: string, selectedLabel = "") => {
    setRequestError("");
    setMaxReached(step);
    setAddressConfirmed(Boolean(selectedLabel));
    setForm((current) => ({ ...current, streetAddress: value, deliveryAddressLabel: selectedLabel }));
    setErrors((current) => {
      const next = { ...current };
      delete next.streetAddress;
      return next;
    });
  };

  const updateDeliveryDate = (value: string) => {
    setRequestError("");
    setMaxReached(step);
    setForm((current) => ({
      ...current,
      deliveryDate: value,
      pickupDate: value ? standardPickupDate(value) : "",
      hirePeriod: "Standard (10 days)",
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next.deliveryDate;
      delete next.pickupDate;
      return next;
    });
  };

  const updatePickupDate = (value: string) => {
    setRequestError("");
    setMaxReached(step);
    setForm((current) => ({
      ...current,
      pickupDate: value,
      hirePeriod: value && value !== standardPickupDate(current.deliveryDate) ? "Extended (14 days)" : "Standard (10 days)",
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next.pickupDate;
      return next;
    });
  };

  const updateExtra = (id: BookingExtraId, quantity: number) => {
    setRequestError("");
    setForm((current) => ({
      ...current,
      extras: { ...current.extras, [id]: quantity },
    }));
  };

  const validateStep = (currentStep: number) => {
    const nextErrors: Partial<Record<FieldKey, string>> = {};

    if (currentStep === 1 && !bins.some((bin) => bin.id === form.binSize)) nextErrors.binSize = "Please select a bin size.";
    if (currentStep === 2 && !acceptedWaste.some((waste) => waste.id === form.wasteType)) nextErrors.wasteType = "Please select a waste type.";
    if (currentStep === 3) {
      if (!isResolvedPostcode(form.address)) nextErrors.address = postcodeSelectionError;
      if (!form.streetAddress.trim() || !addressConfirmed) nextErrors.streetAddress = "Select a delivery address from the suggestions.";
      else {
        const locationError = selectedAddressLocationError(form.deliveryAddressLabel, form.address, form.locationLabel);
        if (locationError) nextErrors.streetAddress = locationError;
      }
      if (!placements.some((option) => option === form.placement)) nextErrors.placement = "Please choose where the bin should be placed.";
    }
    if (currentStep === 4) {
      if (!form.deliveryDate || form.deliveryDate < tomorrowIsoDate() || isSundayIso(form.deliveryDate)) nextErrors.deliveryDate = "Please select a delivery date from tomorrow onward.";
      if (
        !form.deliveryDate
        || !form.pickupDate
        || form.pickupDate < standardPickupDate(form.deliveryDate)
        || form.pickupDate > maxPickupDate(form.deliveryDate)
        || isSundayIso(form.pickupDate)
      ) nextErrors.pickupDate = "Pickup must be 10 to 14 days after delivery.";
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
    if (submitting) return;
    if (nextStep < 1 || nextStep > maxReached) return;
    setErrors({});
    setStep(nextStep);
  };

  const handleContinue = async () => {
    if (submitting) return;
    if (!validateStep(step)) return;
    setRequestError("");
    if (step === 3 || step === 4) {
      setSubmitting(true);
      try {
        await requestQuote({ postcode: form.address, size: form.binSize, waste: form.wasteType,
          ...(step === 4 ? { date: form.deliveryDate, pickupDate: form.pickupDate, hirePeriod: form.hirePeriod } : {}) });
      } catch (error) {
        if (!isQuoteServiceUnavailable(error)) {
          setRequestError(error instanceof Error ? error.message : "We couldn't check availability. Please try again.");
          return;
        }
      } finally { setSubmitting(false); }
    }
    const nextStep = Math.min(step + 1, 6);
    setMaxReached((current) => Math.max(current, nextStep));
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    if (submitting) return;
    setErrors({});
    setStep((current) => {
      const nextStep = Math.max(1, current - 1);
      return nextStep;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (step !== 6) {
      handleContinue();
      return;
    }
    for (let current = 1; current <= 5; current++) {
      if (!validateStep(current)) { setStep(current); return; }
    }
    setSubmitting(true);
    setRequestError("");
    try {
      const response = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form), signal: AbortSignal.timeout(20000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We couldn't confirm your booking. Please try again.");
      if (typeof result.clientSecret === "string" && result.clientSecret.startsWith("cs_")) {
        saveBookingDraft(form);
        saveCheckoutClientSecret(result.clientSecret);
        router.push("/checkout");
        return;
      }
      throw new Error("We couldn't start payment. Please try again.");
    } catch (error) {
      setRequestError(error instanceof Error && error.name === "Error" ? error.message : "We couldn't confirm your booking. Please try again.");
    } finally { setSubmitting(false); }
  };

  const confirmed = Boolean(bookingReference);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F6F2E7] text-[#16241C]">
      <Navbar />

      <div className="mx-auto w-full max-w-[1100px] px-4 pb-14 pt-28 sm:px-6 sm:pt-32">
        <div className="flex gap-7">
          {/* ---- main content ---- */}
          <div className="min-w-0 flex-1 max-w-[720px]">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h1 className="m-0 text-[22px] font-semibold tracking-[-0.01em] text-[#0B3B24] sm:text-[27px]">
            {confirmed ? "You're all set" : titles[step - 1]}
          </h1>
          {confirmed ? null : <span className="whitespace-nowrap text-[13px] font-semibold text-[#5B6B60]">Step {step} of 6</span>}
        </div>

        {confirmed ? null : <BookingProgress current={step} maxReached={maxReached} onSelect={goTo} />}

        {confirmed ? null : <p className="mb-4 mt-0 text-[13.5px] leading-5 text-[#5B6B60]">{intros[step - 1]}</p>}

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
            <fieldset disabled={submitting} className="min-w-0">
            <ValidationMessage message={requestError} />
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
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <PostcodeField
                        value={form.address}
                        displayValue={form.locationLabel}
                        onChange={updatePostcode}
                        error={errors.address}
                      />
                    </div>
                    <AddressField
                      required
                      value={form.streetAddress}
                      postcode={form.address}
                      onChange={updateStreetAddress}
                      onSelectionChange={(confirmed) => setAddressConfirmed(confirmed)}
                      error={errors.streetAddress}
                    />
                  </div>
                  <div>
                    <p id="bin-placement-label" className="mb-1.5 text-[13px] font-semibold text-[#0B3B24]">Where should the bin be placed?</p>
                    <div role="group" aria-labelledby="bin-placement-label" className="flex flex-wrap gap-1.5">
                      {placements.map((option) => (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={form.placement === option}
                          onClick={() => updateField("placement", option as BinPlacement)}
                          className={`rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-semibold ${
                            form.placement === option
                              ? "border-[#0B3B24] bg-[#0B3B24] text-white"
                              : errors.placement
                                ? "border-red-500 bg-white text-[#5B6B60]"
                                : "border-[#E8E1CF] bg-white text-[#5B6B60]"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    <ValidationMessage message={errors.placement} />
                    {form.placement === "Road" || form.placement === "Nature Strip" ? (
                      <div
                        role="status"
                        className="mt-3 flex items-start gap-2.5 rounded-xl border border-[#C6DAB0] bg-[#EEF5E5] px-3.5 py-3 text-[#0B3B24]"
                      >
                        <CircleAlert size={18} className="mt-0.5 shrink-0 text-[#65A30D]" aria-hidden="true" />
                        <p className="text-[12px] leading-5">
                          <span className="font-extrabold">Important Info:</span> A permit will be required from council to
                          place the bin on a road or nature strip. We will collect the permit fees when the bin is dropped
                          off. One of our office staff members will reach out.
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-[#0B3B24]">
                    Access notes
                    <textarea
                      value={form.access}
                      onChange={(event) => updateField("access", event.target.value)}
                      placeholder="Please make sure the access to the drop-off location is a minimum of 2.75m wide."
                      className={`${inputClass()} min-h-16 resize-y`}
                    />
                    <span className="text-xs font-medium text-[#5B6B60]">Optional</span>
                  </label>
                </div>
              ) : null}

              {step === 4 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <DatePicker
                      compact
                      label="Delivery date"
                      value={form.deliveryDate}
                      min={tomorrowIsoDate()}
                      error={errors.deliveryDate}
                      onChange={updateDeliveryDate}
                    />
                    <DatePicker
                      compact
                      label="Pickup date"
                      name="pickup-date"
                      value={form.pickupDate}
                      min={form.deliveryDate ? standardPickupDate(form.deliveryDate) : tomorrowIsoDate()}
                      max={form.deliveryDate ? maxPickupDate(form.deliveryDate) : undefined}
                      error={errors.pickupDate}
                      onChange={updatePickupDate}
                    />
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-[#C6DAB0] bg-[#EEF5E5] px-4 py-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DDECCB] text-[#14532D]">
                      <CalendarClock size={20} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-[#5B6B60]">Rental Period</p>
                      <p className="mt-0.5 text-[14px] font-bold text-[#0B3B24]">
                        {form.hirePeriod === "Extended (14 days)" ? "Extended Hire" : "Standard Hire: 10 Days"}
                      </p>
                      <p className="mt-0.5 text-[12px] leading-5 text-[#526159]">
                        Pickup is set to 10 days automatically. You can extend it <span className="font-bold text-[#0B3B24]">up to 14 days</span>.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {step === 5 ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
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
                      placeholder="Tell us about the 2.75m wide area, access, or anything else we should know."
                      className={`${inputClass()} min-h-16 resize-y`}
                    />
                    <span className="text-xs font-medium text-[#5B6B60]">Optional</span>
                  </label>
                </div>
              ) : null}

              {step === 6 ? (
                <div>
                  <BookingExtras value={form.extras} onChange={updateExtra} />
                  <BookingSummary form={form} total={estimatedTotal} compact />
                  <p className="mt-2.5 flex items-center gap-2 text-[11.5px] text-[#5B6B60]">
                    <Leaf size={13} className="shrink-0 text-[#4d7c0f]" />
                    90% of collected waste is diverted from landfill through recycling and recovery.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8E1CF] pt-4">
              {step === 1 ? (
                <Link
                  href="/"
                  className="rounded-full border-[1.5px] border-[#E8E1CF] bg-transparent px-5 py-2.5 text-sm font-bold text-[#0B3B24] transition hover:border-[#C6DAB0] hover:bg-[#DDECCB]"
                >
                  Back
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-full border-[1.5px] border-[#E8E1CF] bg-transparent px-5 py-2.5 text-sm font-bold text-[#0B3B24] transition hover:border-[#C6DAB0] hover:bg-[#DDECCB]"
                >
                  Back
                </button>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-[#0B3B24] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0D2417] disabled:cursor-not-allowed disabled:bg-[#C7D2C9]"
              >
                {submitting ? <><Loader2 size={16} className="animate-spin" /> Checking…</> : step === 6 ? "Pay now" : "Next step"}
                {step === 6 ? <Check size={14} strokeWidth={2.6} /> : <ArrowRight size={14} />}
              </button>
            </div>

            </fieldset>
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
          Premium Skip Bin Hire<span className="text-[#65A30D]">.</span>
        </span>
        <span>© 2026 Premium Skip Bin Hire Australia · Waste less, live more.</span>
      </footer>
    </main>
  );
}
