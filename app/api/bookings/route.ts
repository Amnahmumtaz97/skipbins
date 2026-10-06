import { isValidAuPhone, isValidEmail } from "@/lib/booking-utils";
import {
  formatHirePeriod,
  getBinBySizeOrId,
  getWasteById,
  placements,
} from "@/lib/data/skip-bins";
import {
  attachCheckoutSession,
  createPendingBooking,
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

export async function POST(request: Request) {
  const limited = rateLimit("bookings", 10);
  if (limited) return limited;
  let stage = "validation";
  try {
    const data = await readJson(request);
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

    const quote = await lookupQuote(input);
    if (
      !quote.serviceable ||
      quote.total == null ||
      !Number.isFinite(quote.total) ||
      quote.total <= 0
    ) {
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
        ? [
            {
              quantity: extra.freeQuantity,
              price_data: {
                currency: "aud" as const,
                unit_amount: 0,
                product_data: { name: `${extra.label} — first one free` },
              },
            },
          ]
        : []),
      ...(extra.chargeableQuantity > 0
        ? [
            {
              quantity: extra.chargeableQuantity,
              price_data: {
                currency: "aud" as const,
                unit_amount: extra.price * 100,
                product_data: {
                  name:
                    extra.freeQuantity > 0
                      ? `Additional ${extra.label}`
                      : extra.label,
                },
              },
            },
          ]
        : []),
    ]);
    const amountCents = Math.round((quote.total + extrasTotal) * 100);
    const stripe = getStripe();
    const customerDetails = {
      fullName: data.fullName as string,
      email: data.email as string,
      phone: data.phone as string,
    };
    stage = "customer-identity";
    const customer = await resolveCustomer(customerDetails);
    const stripeCustomerId = await ensureStripeCustomer(
      stripe,
      customer,
      customerDetails,
    );
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
        placement: data.placement,
        access: data.access as string,
        notes: data.notes as string,
      },
      amountCents,
      customer,
    );

    const origin = new URL(request.url).origin;
    const bin = getBinBySizeOrId(input.size);
    const waste = getWasteById(input.waste);
    const binImageUrl = bin
      ? publicCheckoutAsset(origin, bin.image)
      : undefined;
    const productDescription = [
      waste?.label,
      formatHirePeriod(input.hirePeriod),
      "Free delivery & pickup",
      `Delivery ${formatCheckoutDate(String(data.deliveryDate))}`,
      `Postcode ${input.postcode}`,
    ]
      .filter(Boolean)
      .join(" • ");
    stage = "stripe-session";
    const session = await stripe.checkout.sessions.create({
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      mode: "payment",
      ui_mode: "elements",
      currency: "aud",
      customer: stripeCustomerId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "aud",
            unit_amount: Math.round(quote.total * 100),
            product_data: {
              name: bin
                ? `${bin.size} Skip Bin Hire`
                : `Skip Bin Hire — ${input.size}`,
              description: productDescription,
              ...(binImageUrl ? { images: [binImageUrl] } : {}),
            },
          },
        },
        ...extraLineItems,
      ],
      metadata: {
        bookingId: booking.id,
        customerId: customer.id,
        customerCode: customer.code,
        disposalExtras: selectedExtras
          .map((extra) => `${extra.id}:${extra.quantity}`)
          .join(","),
      },
      payment_intent_data: {
        metadata: {
          bookingId: booking.id,
          customerId: customer.id,
          customerCode: customer.code,
        },
      },
      return_url: `${origin}/book/success?session_id={CHECKOUT_SESSION_ID}`,
    });
    if (!session.client_secret)
      throw new Error("Stripe did not return a checkout client secret");
    stage = "booking-session-attachment";
    await attachCheckoutSession(booking.id, session.id);
    return Response.json(
      { clientSecret: session.client_secret },
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
