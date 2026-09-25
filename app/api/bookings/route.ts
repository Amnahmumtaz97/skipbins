import { isValidAuPhone, isValidEmail } from "@/lib/booking-utils";
import { getBinBySizeOrId, getWasteById, placements } from "@/lib/data/skip-bins";
import { attachCheckoutSession, createPendingBooking } from "@/lib/server/booking-service";
import { lookupQuote, validateQuote } from "@/lib/server/quote-service";
import { rateLimit } from "@/lib/server/rate-limit";
import { apiError, InputError, readJson } from "@/lib/server/request";
import { getStripe } from "@/lib/server/stripe";

export async function POST(request: Request) {
  const limited = rateLimit("bookings", 10);
  if (limited) return limited;
  try {
    const data = await readJson(request);
    if (!data.deliveryDate || !data.hirePeriod) throw new InputError("Please select delivery and rental dates.");
    const input = validateQuote({ postcode: data.address, size: data.binSize, waste: data.wasteType, date: data.deliveryDate, hirePeriod: data.hirePeriod });
    for (const [key, max] of Object.entries({ fullName: 120, email: 254, phone: 30, streetAddress: 240, access: 1000, notes: 2000 })) {
      const value = data[key];
      if (typeof value !== "string" || value.length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) throw new InputError("Please check your contact and delivery details.");
    }
    if (!(data.fullName as string).trim() || !(data.streetAddress as string).trim() || !isValidEmail(data.email as string) || !isValidAuPhone(data.phone as string)) throw new InputError("Please enter a name, delivery address, valid email and Australian phone number.");
    if (typeof data.placement !== "string" || (data.placement !== "" && !placements.some((placement) => placement === data.placement))) throw new InputError("Please choose a valid bin placement.");

    const quote = await lookupQuote(input);
    if (!quote.serviceable || quote.total == null || !Number.isFinite(quote.total) || quote.total <= 0) {
      return Response.json({ error: "We couldn't find pricing for that postcode — please check and try again." }, { status: 422 });
    }
    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      throw new InputError("Stripe is not configured. Add STRIPE_SECRET_KEY to .env and restart the server.");
    }

    const amountCents = Math.round(quote.total * 100);
    const booking = await createPendingBooking({
      address: String(data.address),
      binSize: String(data.binSize),
      wasteType: String(data.wasteType),
      deliveryDate: String(data.deliveryDate),
      hirePeriod: String(data.hirePeriod),
      fullName: data.fullName as string,
      email: data.email as string,
      phone: data.phone as string,
      streetAddress: data.streetAddress as string,
      placement: data.placement,
      access: data.access as string,
      notes: data.notes as string,
    }, amountCents);

    const origin = new URL(request.url).origin;
    const bin = getBinBySizeOrId(input.size);
    const waste = getWasteById(input.waste);
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      currency: "aud",
      customer_email: (data.email as string).trim(),
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "aud",
          unit_amount: amountCents,
          product_data: {
            name: bin ? `${bin.name} — ${bin.size}` : `Skip bin ${input.size}`,
            description: [waste?.label, input.hirePeriod].filter(Boolean).join(" · "),
          },
        },
      }],
      metadata: { bookingId: booking.id },
      success_url: `${origin}/book/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/book?cancelled=1`,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    await attachCheckoutSession(booking.id, session.id);
    return Response.json({ checkoutUrl: session.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
