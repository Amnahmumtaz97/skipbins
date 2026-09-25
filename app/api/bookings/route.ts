import { isValidAuPhone, isValidEmail } from "@/lib/booking-utils";
import { placements } from "@/lib/data/skip-bins";
import { validateQuote } from "@/lib/server/quote-service";
import { rateLimit } from "@/lib/server/rate-limit";
import { apiError, InputError, readJson } from "@/lib/server/request";

export async function POST(request: Request) {
  const limited = rateLimit("bookings", 10);
  if (limited) return limited;
  try {
    const data = await readJson(request);
    if (!data.deliveryDate || !data.hirePeriod) throw new InputError("Please select delivery and rental dates.");
    validateQuote({ postcode: data.address, size: data.binSize, waste: data.wasteType, date: data.deliveryDate, hirePeriod: data.hirePeriod });
    for (const [key, max] of Object.entries({ fullName: 120, email: 254, phone: 30, streetAddress: 240, access: 1000, notes: 2000 })) {
      const value = data[key];
      if (typeof value !== "string" || value.length > max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) throw new InputError("Please check your contact and delivery details.");
    }
    if (!(data.fullName as string).trim() || !(data.streetAddress as string).trim() || !isValidEmail(data.email as string) || !isValidAuPhone(data.phone as string)) throw new InputError("Please enter a name, delivery address, valid email and Australian phone number.");
    if (data.placement !== "" && !placements.some((placement) => placement === data.placement)) throw new InputError("Please choose a valid bin placement.");
    // Do not acknowledge a booking without server-side repricing, availability,
    // durable storage and idempotency supplied by the booking provider.
    throw new Error("Booking provider is not configured");
  } catch (error) { return apiError(error); }
}
