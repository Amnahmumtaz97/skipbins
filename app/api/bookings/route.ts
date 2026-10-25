import { isValidAuPhone, isValidEmail } from "@/lib/booking-utils";
import {
  getBinBySizeOrId,
  getWasteById,
  placements,
} from "@/lib/data/skip-bins";
import {
  attachCheckoutSession,
  beginCheckoutAttempt,
  createPendingBooking,
  getBookingById,
  markBookingPaid,
  recordCheckoutAttempt,
} from "@/lib/server/booking-service";
import { lookupQuote, validateQuote } from "@/lib/server/quote-service";
import { rateLimit } from "@/lib/server/rate-limit";
import { apiError, InputError, readJson } from "@/lib/server/request";
import { getStripe } from "@/lib/server/stripe";
import {
  ensureStripeCustomer,
  resolveCustomer,
} from "@/lib/server/customer-service";
import {
  bookingExtrasTotal,
  normalizeBookingExtras,
  selectedBookingExtras,
} from "@/lib/data/booking-extras";
import { selectedAddressLocationError } from "@/lib/address-validation";
import { checkoutDecision, stripeCheckoutIdempotencyKey, verifiedBookingPayment } from "@/lib/server/checkout-policy";

export async function POST(request: Request) {
  const limited = rateLimit("bookings", 10);
  if (limited) return limited;
  let stage = "validation";
  try {
    const data = await readJson(request);
    const submissionId = typeof data.submissionId === "string" ? data.submissionId : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId))
      throw new InputError("This booking session has expired. Please return to your booking and try again.");
    if (!data.deliveryDate || !data.pickupDate || !data.hirePeriod)
      throw new InputError("Please select delivery, pickup and rental dates.");
    const input = validateQuote({
      postcode: data.address,
      locationLabel: data.locationLabel,
      size: data.binSize,
      waste: data.wasteType,
      date: data.deliveryDate,
      pickupDate: data.pickupDate,
      hirePeriod: data.hirePeriod,
    });
    for (const [key, max] of Object.entries({
      fullName: 120,
      email: 254,
      phone: 30,
      streetAddress: 240,
      deliveryAddressLabel: 300,
      locationLabel: 120,
      access: 1000,
      notes: 2000,
    })) {
      const value = data[key];
      if (
        typeof value !== "string" ||
        value.length > max ||
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)
      )
        throw new InputError("Please check your contact and delivery details.");
    }
    if (
      !(data.fullName as string).trim() ||
      !(data.streetAddress as string).trim() ||
      !isValidEmail(data.email as string) ||
      !isValidAuPhone(data.phone as string)
    )
      throw new InputError(
        "Please enter a name, delivery address, valid email and Australian phone number.",
      );
    const addressLocationError = selectedAddressLocationError(
      data.deliveryAddressLabel as string,
      input.postcode,
      data.locationLabel as string,
    );
    if (addressLocationError) throw new InputError(addressLocationError);
    if (
      typeof data.placement !== "string" ||
      !placements.some((placement) => placement === data.placement)
    )
      throw new InputError("Please choose a valid bin placement.");
    const extras = normalizeBookingExtras(data.extras);
    if (!extras)
      throw new InputError("Please check the selected disposal extras.");

    const existingBooking = await getBookingById(submissionId);
    const quote = existingBooking ? null : await lookupQuote(input);
    if (!existingBooking && (
      !quote?.serviceable ||
      quote.total == null ||
      !Number.isFinite(quote.total) ||
      quote.total <= 0
    )) {
      return Response.json(
        {
          error:
            "We couldn't find pricing for that postcode — please check and try again.",
        },
        { status: 422 },
      );
    }
    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      throw new InputError(
        "Stripe is not configured. Add STRIPE_SECRET_KEY to .env and restart the server.",
      );
    }

    const selectedExtras = selectedBookingExtras(extras);
    const extrasTotal = bookingExtrasTotal(extras);
    const extraLineItems = selectedExtras.flatMap((extra) => [
      ...(extra.freeQuantity > 0
        ? [{ quantity: extra.freeQuantity, price_data: { currency: "aud" as const, unit_amount: 0, product_data: { name: `${extra.label} — first one free` } } }]
        : []),
      ...(extra.chargeableQuantity > 0
        ? [{ quantity: extra.chargeableQuantity, price_data: { currency: "aud" as const, unit_amount: extra.price * 100, product_data: { name: extra.freeQuantity > 0 ? `Additional ${extra.label}` : extra.label } } }]
        : []),
    ]);
    const amountCents = existingBooking?.amount_cents ?? Math.round(((quote?.total ?? 0) + extrasTotal) * 100);
    const stripe = getStripe();
    const customerDetails = {
      fullName: data.fullName as string,
      email: data.email as string,
      phone: data.phone as string,
    };
    stage = "customer-identity";
    const customer = await resolveCustomer(customerDetails);
    stage = "booking-persistence";
    const booking = await createPendingBooking(
      {
        address: String(data.address),
        binSize: String(data.binSize),
        wasteType: String(data.wasteType),
        deliveryDate: String(data.deliveryDate),
        pickupDate: String(data.pickupDate),
        hirePeriod: String(data.hirePeriod),
        extras,
        fullName: data.fullName as string,
        email: data.email as string,
        phone: data.phone as string,
        streetAddress: data.streetAddress as string,
        deliveryAddressLabel: data.deliveryAddressLabel as string,
        placement: data.placement,
        access: data.access as string,
        notes: data.notes as string,
      },
      amountCents,
      customer,
      "direct",
      submissionId,
    );
    const savedCustomerDetails = {
      fullName: booking.full_name,
      email: booking.email,
      phone: booking.phone,
    };
    const savedCustomer = await resolveCustomer(savedCustomerDetails);

    if (booking.status === "paid") {
      return Response.json(
        { bookingId: booking.id, reference: booking.reference, status: "paid", sessionId: booking.stripe_session_id },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const existingAttempt = await beginCheckoutAttempt(booking.id);
    if (existingAttempt.booking_status === "paid") {
      return Response.json(
        { bookingId: booking.id, reference: booking.reference, status: "paid", sessionId: booking.stripe_session_id },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    let attempt = existingAttempt;
    if (attempt.stripe_session_id) {
      const current = await stripe.checkout.sessions.retrieve(attempt.stripe_session_id);
      assertSessionMatchesBooking(current, booking.id, booking.amount_cents, attempt.attempt);
      const paymentIntentId = typeof current.payment_intent === "string"
        ? current.payment_intent
        : current.payment_intent?.id ?? null;
      const intentStatus = current.status === "complete" && current.payment_status !== "paid" && paymentIntentId
        ? (await stripe.paymentIntents.retrieve(paymentIntentId)).status
        : null;
      const attemptStatus = intentStatus === "requires_payment_method" || intentStatus === "canceled"
        ? "failed"
        : attempt.attempt_status;
      const decision = checkoutDecision({ bookingStatus: booking.status, sessionStatus: current.status, paymentStatus: current.payment_status, attemptStatus });
      if (decision === "paid") {
        if (!verifiedBookingPayment({ expectedBookingId: booking.id, metadataBookingId: current.metadata?.bookingId, expectedAmount: booking.amount_cents, amountTotal: current.amount_total, currency: current.currency })) throw new Error("Stripe payment does not match the saved booking");
        await recordCheckoutAttempt({ bookingId: booking.id, attempt: attempt.attempt, sessionId: current.id, paymentIntentId, status: "paid" });
        const paid = await markBookingPaid({ id: booking.id, stripeSessionId: current.id, metadataBookingId: current.metadata?.bookingId, paymentIntentId: paymentIntentId ?? undefined, amountTotal: current.amount_total, currency: current.currency });
        if (!paid || paid.status !== "paid") throw new Error("Stripe payment could not be matched to the booking");
        return Response.json(
          { bookingId: booking.id, reference: booking.reference, status: "paid", sessionId: current.id },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      if (decision === "reuse" && current.client_secret) {
        await recordCheckoutAttempt({ bookingId: booking.id, attempt: attempt.attempt, sessionId: current.id, paymentIntentId, status: "open" });
        return Response.json(
          { bookingId: booking.id, reference: booking.reference, status: "pending", clientSecret: current.client_secret },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      const failed = decision === "retry" && current.status === "complete";
      if (decision === "processing") {
        await recordCheckoutAttempt({ bookingId: booking.id, attempt: attempt.attempt, sessionId: current.id, paymentIntentId, status: "processing" });
        return Response.json(
          { bookingId: booking.id, reference: booking.reference, status: "processing", sessionId: current.id },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      if (decision === "retry") {
        await recordCheckoutAttempt({ bookingId: booking.id, attempt: attempt.attempt, sessionId: current.id, paymentIntentId, status: failed ? "failed" : "expired" });
        attempt = await beginCheckoutAttempt(booking.id, current.id);
      }
    }

    if (attempt.stripe_session_id && attempt.attempt_status !== "creating") {
      const existing = await stripe.checkout.sessions.retrieve(attempt.stripe_session_id);
      assertSessionMatchesBooking(existing, booking.id, booking.amount_cents, attempt.attempt);
      const decision = checkoutDecision({ bookingStatus: booking.status, sessionStatus: existing.status, paymentStatus: existing.payment_status, attemptStatus: attempt.attempt_status });
      if (decision === "paid") {
        if (!verifiedBookingPayment({ expectedBookingId: booking.id, metadataBookingId: existing.metadata?.bookingId, expectedAmount: booking.amount_cents, amountTotal: existing.amount_total, currency: existing.currency })) throw new Error("Stripe payment does not match the saved booking");
        const paymentIntentId = typeof existing.payment_intent === "string" ? existing.payment_intent : existing.payment_intent?.id ?? null;
        await recordCheckoutAttempt({ bookingId: booking.id, attempt: attempt.attempt, sessionId: existing.id, paymentIntentId, status: "paid" });
        const paid = await markBookingPaid({ id: booking.id, stripeSessionId: existing.id, metadataBookingId: existing.metadata?.bookingId, paymentIntentId: paymentIntentId ?? undefined, amountTotal: existing.amount_total, currency: existing.currency });
        if (!paid || paid.status !== "paid") throw new Error("Stripe payment could not be matched to the booking");
        return Response.json({ bookingId: booking.id, reference: booking.reference, status: "paid", sessionId: existing.id }, { headers: { "Cache-Control": "no-store" } });
      }
      if (decision === "reuse" && existing.client_secret) {
        return Response.json({ bookingId: booking.id, reference: booking.reference, status: "pending", clientSecret: existing.client_secret }, { headers: { "Cache-Control": "no-store" } });
      }
      return Response.json({ bookingId: booking.id, reference: booking.reference, status: "processing", sessionId: existing.id }, { headers: { "Cache-Control": "no-store" } });
    }

    const origin = new URL(request.url).origin;
    const bin = getBinBySizeOrId(booking.bin_size);
    const waste = getWasteById(booking.waste_type);
    const binImageUrl = bin
      ? publicCheckoutAsset(origin, bin.image)
      : undefined;
    const productDescription = [
      waste?.label,
      booking.hire_period,
      "Free delivery & pickup",
      `Delivery ${formatCheckoutDate(booking.delivery_date)}`,
      `Postcode ${booking.postcode}`,
    ]
      .filter(Boolean)
      .join(" • ");
    stage = "stripe-session";
    const stripeCustomerId = await ensureStripeCustomer(stripe, savedCustomer, savedCustomerDetails);
    const session = await stripe.checkout.sessions.create({
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      mode: "payment",
      ui_mode: "elements",
      currency: "aud",
      customer: stripeCustomerId,
      line_items: quote && amountCents === booking.amount_cents ? [
        {
          quantity: 1,
          price_data: {
            currency: "aud",
            unit_amount: Math.round(quote.total! * 100),
            product_data: {
              name: bin
                ? `${bin.size} Skip Bin Hire`
                : `Skip Bin Hire — ${booking.bin_size}`,
              description: productDescription,
              ...(binImageUrl ? { images: [binImageUrl] } : {}),
            },
          },
        },
        ...extraLineItems,
      ] : [{
        quantity: 1,
        price_data: {
          currency: "aud",
          unit_amount: booking.amount_cents,
          product_data: { name: bin ? `${bin.size} Skip Bin Hire` : `Skip Bin Hire — ${booking.bin_size}`, description: productDescription },
        },
      }],
      metadata: {
        bookingId: booking.id,
        checkoutAttempt: String(attempt.attempt),
        customerId: savedCustomer.id,
        customerCode: savedCustomer.code,
        disposalExtras: selectedExtras
          .map((extra) => `${extra.id}:${extra.quantity}`)
          .join(","),
      },
      payment_intent_data: {
        metadata: {
          bookingId: booking.id,
          checkoutAttempt: String(attempt.attempt),
          customerId: savedCustomer.id,
          customerCode: savedCustomer.code,
        },
      },
      return_url: `${origin}/book/success?session_id={CHECKOUT_SESSION_ID}`,
    }, { idempotencyKey: stripeCheckoutIdempotencyKey(booking.id, attempt.attempt) });
    if (!session.client_secret)
      throw new Error("Stripe did not return a checkout client secret");
    stage = "booking-session-attachment";
    await attachCheckoutSession(booking.id, session.id);
    await recordCheckoutAttempt({ bookingId: booking.id, attempt: attempt.attempt, sessionId: session.id, status: "open" });
    return Response.json(
      { bookingId: booking.id, reference: booking.reference, status: "pending", clientSecret: session.client_secret },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (!(error instanceof InputError)) {
      console.error("[bookings] Checkout request failed", {
        stage,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    return apiError(error);
  }
}

function publicCheckoutAsset(origin: string, path: string) {
  try {
    const url = new URL(path, origin);
    if (url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function formatCheckoutDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function assertSessionMatchesBooking(
  session: { metadata?: Record<string, string> | null; amount_total: number | null; currency: string | null },
  bookingId: string,
  amountCents: number,
  attempt: number,
) {
  if (
    session.metadata?.bookingId !== bookingId ||
    session.metadata?.checkoutAttempt !== String(attempt) ||
    !verifiedBookingPayment({ expectedBookingId: bookingId, metadataBookingId: session.metadata?.bookingId, expectedAmount: amountCents, amountTotal: session.amount_total, currency: session.currency })
  ) throw new Error("Stripe session does not match the saved booking");
}
