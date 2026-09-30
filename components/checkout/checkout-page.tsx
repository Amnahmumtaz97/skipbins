"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { loadStripe } from "@stripe/stripe-js";
import type {
  StripeCheckoutElementsSdk,
  StripeCheckoutLoadActionsSuccess,
  StripeCheckoutSession,
  StripeExpressCheckoutElementConfirmEvent,
} from "@stripe/stripe-js";
import {
  ArrowLeft,
  CalendarDays,
  CircleAlert,
  Clock3,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  Recycle,
  ShieldCheck,
} from "lucide-react";
import { loadBookingDraft, loadCheckoutClientSecret } from "@/lib/booking-draft";
import { formatHirePeriod, getBinBySizeOrId, getWasteById } from "@/lib/data/skip-bins";
import type { BookingFormState } from "@/types/skip-bin";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : Promise.resolve(null);

type StoredCheckout = {
  draft: BookingFormState;
  clientSecret: string;
};

export function CheckoutPage() {
  const router = useRouter();
  const [stored, setStored] = useState<StoredCheckout | null | undefined>(undefined);
  const [session, setSession] = useState<StripeCheckoutSession | null>(null);
  const [actions, setActions] = useState<StripeCheckoutLoadActionsSuccess | null>(null);
  const [expressAvailable, setExpressAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const paymentMountRef = useRef<HTMLDivElement>(null);
  const expressMountRef = useRef<HTMLDivElement>(null);
  const checkoutRef = useRef<StripeCheckoutElementsSdk | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    const draft = loadBookingDraft();
    const clientSecret = loadCheckoutClientSecret();
    let active = true;
    queueMicrotask(() => {
      if (active) setStored(draft && clientSecret ? { draft, clientSecret } : null);
    });
    return () => { active = false; };
  }, []);

  const confirmPayment = useCallback(async (
    checkoutActions: StripeCheckoutLoadActionsSuccess,
    expressCheckoutConfirmEvent?: StripeExpressCheckoutElementConfirmEvent,
  ) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      const result = await checkoutActions.confirm({
        redirect: "if_required",
        ...(expressCheckoutConfirmEvent ? { expressCheckoutConfirmEvent } : {}),
      });
      if (result.type === "error") {
        expressCheckoutConfirmEvent?.paymentFailed({ reason: "fail", message: result.error.message });
        throw new Error(result.error.message);
      }
      router.push(`/book/success?session_id=${result.session.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Payment could not be completed. Please try again.");
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [router]);

  useEffect(() => {
    if (!stored) return;
    let active = true;
    let paymentElement: ReturnType<StripeCheckoutElementsSdk["createPaymentElement"]> | null = null;
    let expressElement: ReturnType<StripeCheckoutElementsSdk["createExpressCheckoutElement"]> | null = null;

    async function initializeCheckout() {
      try {
        const stripe = await stripePromise;
        if (!stripe) throw new Error("Stripe is not configured. Add the publishable key and try again.");
        if (!paymentMountRef.current || !expressMountRef.current || !active) return;

        const checkout = stripe.initCheckoutElementsSdk({
          clientSecret: stored!.clientSecret,
          elementsOptions: {
            appearance: {
              theme: "stripe",
              variables: {
                colorPrimary: "#0B3B24",
                colorBackground: "#FFFFFF",
                colorText: "#16241C",
                colorTextSecondary: "#5B6B60",
                colorTextPlaceholder: "#87938B",
                colorSuccess: "#16955F",
                colorDanger: "#B42318",
                fontFamily: "Manrope, system-ui, sans-serif",
                fontSizeBase: "15px",
                fontWeightMedium: "600",
                borderRadius: "14px",
                spacingUnit: "4px",
                gridRowSpacing: "14px",
              },
            },
          },
        });
        checkoutRef.current = checkout;
        checkout.on("change", (nextSession) => {
          if (active) setSession(nextSession);
        });

        const loaded = await checkout.loadActions();
        if (!active) return;
        if (loaded.type === "error") throw new Error(loaded.error.message);
        setActions(loaded.actions);
        setSession(loaded.actions.getSession());

        paymentElement = checkout.createPaymentElement({
          layout: { type: "accordion", defaultCollapsed: false },
          fields: { billingDetails: "auto" },
          wallets: { applePay: "never", googlePay: "never", link: "never" },
        });
        paymentElement.mount(paymentMountRef.current);

        expressElement = checkout.createExpressCheckoutElement({
          buttonHeight: 52,
          buttonTheme: { applePay: "black", googlePay: "white" },
          buttonType: { applePay: "plain", googlePay: "pay" },
          layout: { maxColumns: 2, maxRows: 1, overflow: "auto" },
          paymentMethodOrder: ["applePay", "googlePay", "link"],
          paymentMethods: { applePay: "auto", googlePay: "auto", link: "auto" },
        });
        expressElement.on("ready", (event) => {
          if (active) setExpressAvailable(Boolean(event.availablePaymentMethods));
        });
        expressElement.on("confirm", (event) => void confirmPayment(loaded.actions, event));
        expressElement.mount(expressMountRef.current);
        setLoading(false);
      } catch (caught) {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : "We couldn't load secure payment. Please try again.");
        setLoading(false);
      }
    }

    void initializeCheckout();
    return () => {
      active = false;
      paymentElement?.destroy();
      expressElement?.destroy();
      checkoutRef.current = null;
    };
  }, [confirmPayment, stored]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (actions) void confirmPayment(actions);
  }

  if (stored === undefined) return <CheckoutLoading />;
  if (!stored) return <MissingCheckout />;

  const { draft } = stored;
  const bin = getBinBySizeOrId(draft.binSize);
  const amount = session ? displayAudAmount(session.total.total.amount) : "A$—";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF9F3] text-[#16241C] lg:grid lg:grid-cols-[minmax(390px,0.92fr)_minmax(620px,1.08fr)]">
      <section className="relative isolate overflow-hidden bg-[#075A38] px-5 py-8 text-white sm:px-8 lg:flex lg:min-h-screen lg:flex-col lg:px-[clamp(2.5rem,5vw,5.5rem)] lg:py-12">
        <BrandedBackdrop />
        <div className="relative z-10 flex items-start justify-between gap-5">
          <Link href="/" className="text-[20px] font-extrabold leading-tight tracking-[-0.035em] sm:text-[24px]">
            Premium<br /><span className="text-[#A3E635]">Skip Bin Hire</span>
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/8 px-3 py-2 text-[12px] font-bold text-white/90 backdrop-blur-sm">
            <LockKeyhole className="h-4 w-4 text-[#A3E635]" /> Secure checkout
          </span>
        </div>

        <div className="relative z-10 mt-12 max-w-[620px] lg:mt-24">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#C7F34A]">Your booking</p>
          <h1 className="mt-3 max-w-[560px] text-[38px] font-extrabold leading-[1.06] tracking-[-0.045em] sm:text-[50px] lg:text-[clamp(2.75rem,4vw,4.4rem)]">
            One last step, then we&apos;ll deliver.
          </h1>
        </div>

        <BookingCard draft={draft} amount={amount} />

        <div className="relative z-10 mt-6 flex flex-wrap gap-3 text-[11px] font-bold text-white/85 lg:mt-auto lg:pt-8">
          <TrustPill icon={ShieldCheck} text="Protected checkout" />
          <TrustPill icon={LockKeyhole} text="Transparent pricing" />
        </div>
      </section>

      <section className="bg-[#FAF9F3] px-5 py-9 sm:px-9 lg:min-h-screen lg:px-[clamp(3rem,7vw,8rem)] lg:py-12">
        <div className="mx-auto w-full max-w-[760px]">
          <div className="flex items-center justify-between gap-4">
            <Link href="/booking?cancelled=1" className="inline-flex items-center gap-2 text-[13px] font-bold text-[#5B6B60] transition hover:text-[#0B3B24]">
              <ArrowLeft className="h-4 w-4" /> Back to bin selection
            </Link>
            <span className="hidden items-center gap-2 rounded-full border border-[#DCE4D8] bg-[#F3F6EF] px-3 py-2 text-[12px] font-bold text-[#5B6B60] sm:inline-flex">
              <ShieldCheck className="h-4 w-4 text-[#16955F]" /> Protected checkout
            </span>
          </div>

          <div className="mt-9">
            <h2 className="text-[34px] font-extrabold leading-tight tracking-[-0.04em] text-[#0B3B24] sm:text-[42px]">Complete your booking</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[#6C786F] sm:text-[15px]">Pay securely in Australian dollars. Your delivery details are confirmed after payment.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7">
            <div className={expressAvailable ? "block" : "hidden"}>
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-[15px] font-extrabold text-[#0B3B24]">Express checkout</h3>
                <span className="text-[12px] font-bold text-[#16955F]">Fast &amp; secure</span>
              </div>
              <div ref={expressMountRef} className="mt-3 min-h-[52px]" />
              <div className="my-6 flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.06em] text-[#8B968F]">
                <span className="h-px flex-1 bg-[#DCE2DA]" /> Or pay with card <span className="h-px flex-1 bg-[#DCE2DA]" />
              </div>
            </div>

            <h3 className="text-[15px] font-extrabold text-[#0B3B24]">Contact information</h3>
            <div className="mt-3 rounded-[15px] border border-[#CDD7CA] bg-white px-4 py-3.5 shadow-[0_1px_0_rgba(11,59,36,0.02)]">
              <span className="block text-[10px] font-bold text-[#6C786F]">Email</span>
              <span className="mt-0.5 block break-all text-[14px] font-medium text-[#294437]">{draft.email}</span>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <h3 className="text-[15px] font-extrabold text-[#0B3B24]">Payment method</h3>
              <span className="text-[12px] font-bold text-[#16955F]">Encrypted</span>
            </div>
            <div className="relative mt-3 min-h-[210px] rounded-[16px] border border-[#CDD7CA] bg-white p-4">
              {loading ? <ElementLoader /> : null}
              <div ref={paymentMountRef} />
            </div>

            {error ? (
              <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-[14px] border border-[#F3C7C1] bg-[#FFF3F1] px-4 py-3 text-[13px] font-medium leading-relaxed text-[#8E2F23]">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </div>
            ) : null}

            <div className="mt-7 border-y border-[#DCE2DA] py-4 text-[13px]">
              <div className="flex items-center justify-between gap-5 text-[#6C786F]">
                <span>{bin?.size ?? draft.binSize} Skip Bin Hire</span>
                <strong className="text-[#294437]">{amount}</strong>
              </div>
            </div>
            <div className="flex items-end justify-between gap-5 py-5">
              <div>
                <p className="text-[15px] font-extrabold text-[#0B3B24]">Total due today</p>
                <p className="mt-0.5 text-[11px] text-[#7C877F]">Includes GST</p>
              </div>
              <strong className="text-[30px] font-extrabold tracking-[-0.035em] text-[#0B3B24] sm:text-[34px]">{amount}</strong>
            </div>

            <button
              type="submit"
              disabled={!actions || loading || submitting}
              className="flex min-h-14 w-full items-center justify-center gap-2.5 rounded-[14px] bg-gradient-to-r from-[#079557] to-[#0B3B24] px-5 text-[16px] font-extrabold text-white shadow-[0_10px_24px_rgba(11,59,36,0.16)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <LockKeyhole className="h-5 w-5" />}
              {submitting ? "Processing secure payment…" : `Pay ${amount}`}
            </button>
            <p className="mt-4 flex items-center justify-center gap-2 text-center text-[11px] font-medium text-[#7C877F]">
              <ShieldCheck className="h-4 w-4 text-[#16955F]" /> Secure payment · Transparent pricing · Protected checkout
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}

function BookingCard({ draft, amount }: { draft: BookingFormState; amount: string }) {
  const bin = getBinBySizeOrId(draft.binSize);
  const waste = getWasteById(draft.wasteType);
  return (
    <div className="relative z-10 mt-10 rounded-[26px] border border-white/25 bg-white/10 p-5 shadow-[0_24px_80px_rgba(0,34,19,0.22)] backdrop-blur-md sm:p-6 lg:mt-14">
      <div className="flex items-center gap-5">
        <div className="relative h-28 w-36 shrink-0 overflow-hidden rounded-[18px] bg-[#F5FAE6] sm:h-32 sm:w-44">
          {bin ? <Image src={bin.image} alt={`${bin.size} skip bin`} fill sizes="176px" className="object-contain p-2" priority /> : null}
        </div>
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-[#C7F34A] px-2.5 py-1 text-[11px] font-extrabold text-[#0B3B24]">{bin?.size ?? draft.binSize}</span>
          <h2 className="mt-2 text-[20px] font-extrabold tracking-[-0.02em]">Skip Bin Hire</h2>
          <p className="mt-1 text-[17px] font-extrabold text-[#A3E635]">{amount}</p>
        </div>
      </div>
      <div className="my-5 h-px bg-white/20" />
      <dl className="grid gap-3 text-[12px] sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <BookingDetail icon={Recycle} label="Waste type" value={waste?.label ?? draft.wasteType} />
        <BookingDetail icon={Clock3} label="Hire period" value={formatHirePeriod(draft.hirePeriod)} />
        <BookingDetail icon={CalendarDays} label="Delivery" value={formatDate(draft.deliveryDate)} />
        <BookingDetail icon={MapPin} label="Delivery location" value={draft.locationLabel || draft.address} />
      </dl>
      <div className="mt-5 flex items-end justify-between border-t border-white/20 pt-5">
        <div><p className="text-[14px] font-extrabold">Total</p><p className="mt-0.5 text-[10px] text-white/60">Includes GST · No hidden fees</p></div>
        <strong className="text-[27px] font-extrabold tracking-[-0.03em]">{amount}</strong>
      </div>
    </div>
  );
}

function BookingDetail({ icon: Icon, label, value }: { icon: typeof Recycle; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#B7EB40]/30 bg-[#84CC16]/15 text-[#C7F34A]"><Icon className="h-4 w-4" /></span>
      <div className="min-w-0"><dt className="text-white/55">{label}</dt><dd className="mt-0.5 font-bold text-white">{value}</dd></div>
    </div>
  );
}

function TrustPill({ icon: Icon, text }: { icon: typeof ShieldCheck; text: string }) {
  return <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-3 py-2"><Icon className="h-4 w-4 text-[#A3E635]" />{text}</span>;
}

function BrandedBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-28 -top-28 h-80 w-80 rounded-full border border-[#A3E635]/20 bg-[#45BD7D]/15" />
      <div className="absolute -left-[18%] top-[21%] h-36 w-[145%] -rotate-6 rounded-[50%] bg-[#4CC47B]/18" />
      <div className="absolute -bottom-32 -left-[15%] h-72 w-[145%] rotate-3 rounded-[50%] bg-[#87D948]/24" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-[#002D1E]/30" />
    </div>
  );
}

function ElementLoader() {
  return <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[16px] bg-white"><LoaderCircle className="h-6 w-6 animate-spin text-[#0B3B24]" /><span className="sr-only">Loading secure payment form</span></div>;
}

function CheckoutLoading() {
  return <main className="flex min-h-screen items-center justify-center bg-[#FAF9F3]"><LoaderCircle className="h-8 w-8 animate-spin text-[#0B3B24]" /><span className="sr-only">Loading checkout</span></main>;
}

function MissingCheckout() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F2E7] px-5 text-[#16241C]">
      <div className="w-full max-w-[520px] rounded-[26px] border border-[#E0DDCF] bg-white p-8 text-center shadow-[0_22px_70px_rgba(22,36,28,0.09)]">
        <CircleAlert className="mx-auto h-10 w-10 text-[#65A30D]" />
        <h1 className="mt-4 text-[25px] font-extrabold tracking-[-0.03em] text-[#0B3B24]">Your secure checkout is not ready</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#5B6B60]">Return to your booking, review the details, and select Pay now to start a fresh payment session.</p>
        <Link href="/booking" className="mt-6 inline-flex rounded-full bg-[#0B3B24] px-6 py-3 text-[13px] font-extrabold text-white transition hover:bg-[#14532D]">Return to booking</Link>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function displayAudAmount(amount: string) {
  if (/^A\$/i.test(amount)) return amount;
  if (amount.startsWith("$")) return `A${amount}`;
  return `A$${amount}`;
}
