import { acceptedWaste, bins, hirePeriods } from "@/lib/data/skip-bins";
import { quoteTotal } from "@/lib/pricing";
import { isValidPostcode, postcodeError } from "@/lib/postcode";
import { InputError } from "@/lib/server/request";
import { isSundayIso } from "@/lib/booking-utils";

export function validateQuote(data: Record<string, unknown>) {
  if (!isValidPostcode(data.postcode)) throw new InputError(postcodeError);
  if (!bins.some((bin) => bin.id === data.size)) throw new InputError("Please select a bin size.");
  if (!acceptedWaste.some((waste) => waste.id === data.waste)) throw new InputError("Please select a waste type.");
  if (data.date !== undefined) {
    const date = data.date;
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date < today || isSundayIso(date))
      throw new InputError("Please select a valid future delivery date.");
  }
  if (data.pickupDate !== undefined) {
    const pickupDate = data.pickupDate;
    if (typeof pickupDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(pickupDate) || !Number.isFinite(Date.parse(pickupDate)) || new Date(pickupDate).toISOString().slice(0, 10) !== pickupDate || typeof data.date !== "string" || pickupDate <= data.date || isSundayIso(pickupDate))
      throw new InputError("Please select a valid pickup date after delivery.");
  }
  if (data.hirePeriod !== undefined && !hirePeriods.some((period) => period === data.hirePeriod)) throw new InputError("Please select a rental period.");
  return { postcode: data.postcode, size: data.size as string, waste: data.waste as string, date: data.date as string | undefined, pickupDate: data.pickupDate as string | undefined, hirePeriod: data.hirePeriod as string | undefined };
}

export async function lookupQuote(input: ReturnType<typeof validateQuote>): Promise<{ serviceable: boolean; total: number | null }> {
  const total = quoteTotal(input.size, input.hirePeriod);
  if (total == null) throw new InputError("Please select a bin size.");
  return { serviceable: true, total };
}
