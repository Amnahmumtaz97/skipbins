"use client";


import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ArrowRight, BadgeDollarSign, Calendar, Check, CircleHelp, Leaf, Loader2, Recycle, ShieldCheck, Truck } from "lucide-react";
import { AddressField } from "@/components/book/address-field";
import { PostcodeField } from "@/components/book/postcode-field";
import { isResolvedPostcode, postcodeSelectionError } from "@/lib/postcode";
import { selectedAddressLocationError } from "@/lib/address-validation";
import { BinSizesSection } from "@/components/home/bin-sizes-section";
import { DifferenceSlider } from "@/components/home/difference-slider";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { FAQsSection } from "@/components/home/faqs-section";

import { LeafyBackground } from "@/components/home/leafy-background";
import { Navbar } from "@/components/home/navbar";
import { WhatWeAcceptSection } from "@/components/home/what-we-accept-section";
import { DatePicker } from "@/components/ui/date-picker";
import { StyledSelect } from "@/components/ui/styled-select";
import {
  acceptedWaste,
  bins,
  differenceItems,
  faqItems,
  formatBinLabel,
  heroSlides,
  images,


} from "@/lib/data/skip-bins";
import { isSundayIso, maxPickupDate, standardPickupDate, tomorrowIsoDate } from "@/lib/booking-utils";
import { clearBookingDraft } from "@/lib/booking-draft";

type QuoteState = {
  size: string;
  postcode: string;
  postcodeLabel: string;
  streetAddress: string;
  deliveryAddressLabel: string;
  waste: string;
  date: string;
  pickupDate: string;
};

const emptyQuote: QuoteState = {
  size: "",
  postcode: "",
  postcodeLabel: "",
  streetAddress: "",
  deliveryAddressLabel: "",
  waste: "",
  date: "",
  pickupDate: "",
};

const heroBenefits = [
  { icon: BadgeDollarSign, title: "All-Inclusive Pricing", detail: "No Hidden Fees" },
  { icon: Truck, title: "Same Day Delivery", detail: "Fast & Flexible Service" },
  { icon: ShieldCheck, title: "Permit Help", detail: "We Handle Councils" },
  { icon: Recycle, title: "Responsible Recycling", detail: "More Recovery, Less Landfill" },
];

export function HomePage() {
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteState>(emptyQuote);
  const [quoteErrors, setQuoteErrors] = useState<Partial<QuoteState>>({});
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateQuote = (field: keyof QuoteState, value: string) => {
    setQuote((current) => ({
      ...current,
      [field]: value,
      ...(field === "date" ? { pickupDate: value ? standardPickupDate(value) : "" } : {}),
    }));
    setQuoteErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const updatePostcode = (value: string, label: string) => {
    setAddressConfirmed(false);
    setQuote((current) => ({
      ...current,
      postcode: value,
      postcodeLabel: label,
      ...(value !== current.postcode || label !== current.postcodeLabel
        ? { streetAddress: "", deliveryAddressLabel: "" }
        : {}),
    }));
    setQuoteErrors((current) => {
      const next = { ...current };
      delete next.postcode;
      delete next.streetAddress;
      return next;
    });
  };

  const updateStreetAddress = (value: string, selectedLabel = "") => {
    setAddressConfirmed(Boolean(selectedLabel));
    setQuote((current) => ({ ...current, streetAddress: value, deliveryAddressLabel: selectedLabel }));
    setQuoteErrors((current) => {
      const next = { ...current };
      delete next.streetAddress;
      return next;
    });
  };

  const handleQuoteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    const nextErrors: Partial<QuoteState> = {};
    if (!quote.size) nextErrors.size = "Please select a bin size.";
    if (!isResolvedPostcode(quote.postcode)) nextErrors.postcode = postcodeSelectionError;
    if (!quote.streetAddress.trim() || !addressConfirmed) {
      nextErrors.streetAddress = "Select a delivery address from the suggestions.";
    } else {
      const locationError = selectedAddressLocationError(quote.deliveryAddressLabel, quote.postcode, quote.postcodeLabel);
      if (locationError) nextErrors.streetAddress = locationError;
    }
    if (!quote.waste) nextErrors.waste = "Please select a waste type.";
    if (!quote.date || quote.date < tomorrowIsoDate() || isSundayIso(quote.date)) nextErrors.date = "Please select a delivery date from tomorrow onward.";
    if (!quote.date || !quote.pickupDate || quote.pickupDate < standardPickupDate(quote.date) || quote.pickupDate > maxPickupDate(quote.date) || isSundayIso(quote.pickupDate)) {
      nextErrors.pickupDate = "Pickup must be 10 to 14 days after delivery.";
    }

    setQuoteErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    clearBookingDraft();
    const params = new URLSearchParams({
      size: quote.size,
      location: quote.postcode.trim(),
      locationLabel: quote.postcodeLabel.trim(),
      streetAddress: quote.streetAddress.trim(),
      deliveryAddressLabel: quote.deliveryAddressLabel.trim(),
      waste: quote.waste,
      date: quote.date,
      pickup: quote.pickupDate,
    });
    router.push(`/booking?${params.toString()}`);
    setLoading(false);
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F4F7EC] text-[#172018]">
      <Navbar />

      <section className="relative min-h-[700px] w-full overflow-hidden px-4 pb-10 pt-28 sm:min-h-[740px] sm:px-8 sm:pb-14 sm:pt-32 lg:min-h-[760px] lg:px-10 lg:pb-20 lg:pt-36">
        <HeroCarousel slides={heroSlides} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#DDECCB]/62 via-[#14532D]/32 to-[#0B3B24]/48" />

        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <div className="max-w-xl py-8 pl-2 sm:py-12 sm:pl-6 lg:py-20 lg:pl-12">
            <h1 className="text-[clamp(2.5rem,5vw,5rem)] font-black leading-[0.96] tracking-[-0.065em] text-[#0B3B24]">
              Skip more,
              <br />
              spend <span className="text-[#65A30D]">less.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-white sm:mt-8 sm:text-lg">
              Where Premium Service Meets Affordable Prices.
            </p>
            <Link
              href="/booking"
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0B3B24] px-6 py-4 font-bold text-white shadow-sm transition-colors hover:bg-[#14532D] sm:w-auto"
            >
              <Calendar size={18} />
              Book a Bin Now
              <ArrowRight size={18} />
            </Link>
            <p className="mt-6 flex items-center gap-2 text-xs font-semibold text-white sm:mt-7 sm:text-sm">
              <Leaf size={17} className="shrink-0 text-[#65A30D]" />
              Eco-friendly disposal. Responsible recycling.
            </p>
          </div>

          <div className="relative flex min-w-0 items-center justify-center py-6 sm:py-10 lg:justify-end lg:py-16">
            <form
              id="hero-booking"
              className="@container min-w-0 w-full max-w-lg rounded-2xl border border-white/70 bg-[#FAF9F3]/95 p-5 shadow-[0_8px_24px_rgba(11,59,36,0.12)] backdrop-blur-sm sm:p-8"
              onSubmit={handleQuoteSubmit}
              noValidate
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-extrabold text-[#0B3B24] sm:text-lg">Get an instant quote</p>
                  <p className="mt-1 text-xs leading-5 text-[#405347] sm:text-sm">
                    Choose a size and we&apos;ll take care of the rest.
                  </p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DDECCB] text-[#14532D]">
                  <Check size={19} strokeWidth={3} />
                </div>
              </div>

              <fieldset disabled={loading} className="grid min-w-0 grid-cols-2 items-start gap-4">
                <div className="min-w-0">
                  <StyledSelect
                    label="Bin size"
                    name="bin-size"
                    placeholder="Select a size"
                    value={quote.size}
                    onChange={(value) => updateQuote("size", value)}
                    error={quoteErrors.size}
                    options={bins.map((bin) => ({ value: bin.id, label: formatBinLabel(bin.id) }))}
                  />
                </div>
                <div className="min-w-0">
                  <StyledSelect
                    label="Waste type"
                    name="waste-type"
                    placeholder="Choose waste type"
                    value={quote.waste}
                    onChange={(value) => updateQuote("waste", value)}
                    error={quoteErrors.waste}
                    options={acceptedWaste.map((item) => ({ value: item.id, label: item.label }))}
                  />
                </div>
                <div className="col-span-2">
                  <PostcodeField
                    value={quote.postcode}
                    displayValue={quote.postcodeLabel}
                    onChange={updatePostcode}
                    error={quoteErrors.postcode}
                  />
                </div>
                <div className="col-span-2">
                  <AddressField
                    required
                    value={quote.streetAddress}
                    postcode={quote.postcode}
                    onChange={updateStreetAddress}
                    onSelectionChange={setAddressConfirmed}
                    error={quoteErrors.streetAddress}
                    compact
                  />
                </div>
                <DatePicker
                  label="Delivery date"
                  value={quote.date}
                  min={tomorrowIsoDate()}
                  error={quoteErrors.date}
                  onChange={(value) => updateQuote("date", value)}
                />
                <DatePicker
                  label="Pickup date"
                  name="pickup-date"
                  value={quote.pickupDate}
                  min={quote.date ? standardPickupDate(quote.date) : tomorrowIsoDate()}
                  max={quote.date ? maxPickupDate(quote.date) : undefined}
                  error={quoteErrors.pickupDate}
                  onChange={(value) => updateQuote("pickupDate", value)}
                />
              </fieldset>
              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#14532D] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0B3B24]"
              >
                {loading ? <><Loader2 size={16} className="animate-spin" /> Continuing…</> : "Get my quote"}
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>

      </section>

      <section id="service-benefits" aria-label="Service benefits" className="w-full overflow-hidden bg-[#0B3B24]">
        <div className="benefits-marquee-track flex w-max">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className="benefits-marquee-group flex shrink-0"
              aria-hidden={copy === 1 ? "true" : undefined}
            >
              {heroBenefits.map(({ icon: Icon, title, detail }) => (
                <div
                  key={`${copy}-${title}`}
                  className="benefits-marquee-item flex min-w-[250px] flex-1 items-center gap-3 border-r border-white/10 px-6 py-4 sm:min-w-[280px] sm:px-8"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#65A30D] text-white">
                    <Icon size={21} strokeWidth={2.4} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 whitespace-nowrap">
                    <strong className="block text-sm font-extrabold leading-5 text-white">{title}</strong>
                    <span className="block text-xs leading-5 text-white/70">{detail}</span>
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <BinSizesSection bins={bins} />
      <WhatWeAcceptSection accepted={acceptedWaste} />

      <section
        id="difference"
        className="mx-auto max-w-[1400px] rounded-[2rem] bg-[#FAF9F3] px-5 py-16 sm:px-8 lg:px-12 lg:py-20"
      >
        <div className="mb-10 text-center">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-[#65A30D]">
            The Premium Skip Bin Hire difference
          </p>
          <h2 className="text-4xl font-black leading-tight tracking-[-0.05em] text-[#0B3B24] sm:text-5xl">
            Why choose Premium Skip Bin Hire?
          </h2>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <p className="max-w-xl text-lg leading-8 text-[#405347]">
              A cleaner project is more than an empty driveway. We make responsible disposal simple, from the moment
              your skip bin arrives to the moment every useful material is sorted and recovered.
            </p>
            <div className="mt-8 flex items-end gap-4 border-b border-[#dfe8d7] pb-7">
              <strong className="text-7xl font-black leading-none tracking-[-0.08em] text-[#65A30D] sm:text-8xl">
                90%
              </strong>
              <span className="max-w-[150px] pb-1 text-sm font-bold leading-5 text-[#0B3B24]">
                of collected waste diverted from landfill
              </span>
            </div>
            <div className="mt-7">
              <DifferenceSlider items={differenceItems} />
            </div>
          </div>

          <div className="relative min-h-[360px] overflow-hidden rounded-[1.5rem] sm:min-h-[460px]">
            <Image
              src={images.difference}
              alt="Green skip bin being prepared for responsible waste collection"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 55vw"
            />
            <div className="absolute bottom-5 left-5 rounded-2xl bg-[#FAF9F3]/95 px-5 py-4 shadow-[0_12px_28px_rgba(11,59,36,0.14)] backdrop-blur-sm">
              <p className="text-sm font-extrabold text-[#0B3B24]">Sorted with purpose</p>
              <p className="mt-1 text-xs text-[#405347]">Less landfill. More recovery.</p>
            </div>
          </div>
        </div>
      </section>

      <FAQsSection items={faqItems} />

      <section
        id="book"
        className="relative mx-auto max-w-[1400px] overflow-hidden px-5 py-20 text-center sm:px-8 lg:py-28"
      >
        <LeafyBackground />
        <div className="relative z-10">
          <CircleHelp className="mx-auto mb-5 text-[#65A30D]" size={30} />
          <h2 className="text-4xl font-black tracking-[-0.05em] text-[#0B3B24] sm:text-5xl">
            Ready to clear the way?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[#405347]">
            Tell us what you&apos;re working on and we&apos;ll help you choose the right bin.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/booking"
              className="inline-flex items-center gap-2 rounded-full bg-[#0B3B24] px-7 py-4 font-bold text-white transition hover:bg-[#14532D]"
            >
              Start your booking
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-[#0B3B24] px-7 py-4 font-bold text-[#0B3B24] transition hover:bg-[#E8F0E2]"
            >
              Get in touch
            </Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1400px] flex-col gap-3 border-t border-[#dce4d4] px-5 py-8 text-sm text-[#405347] sm:flex-row sm:items-center sm:justify-between sm:px-12">
        <span className="font-extrabold text-[#0B3B24]">
          Premium Skip Bin Hire<span className="text-[#65A30D]">.</span>
        </span>
        <span>© 2026 Premium Skip Bin Hire Australia · Waste less, live more.</span>
      </footer>
    </main>
  );
}



