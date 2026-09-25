import { acceptedWaste, bins, hirePeriods } from "@/lib/data/skip-bins";
import { isValidPostcode, postcodeError } from "@/lib/postcode";
import { InputError } from "@/lib/server/request";

export function validateQuote(data: Record<string, unknown>) {
  if (!isValidPostcode(data.postcode)) throw new InputError(postcodeError);
  if (!bins.some((bin) => bin.id === data.size)) throw new InputError("Please select a bin size.");
  if (!acceptedWaste.some((waste) => waste.id === data.waste)) throw new InputError("Please select a waste type.");
  if (data.date !== undefined) {
    const date = data.date;
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date < today)
      throw new InputError("Please select a valid future delivery date.");
  }
  if (data.hirePeriod !== undefined && !hirePeriods.some((period) => period === data.hirePeriod)) throw new InputError("Please select a rental period.");
  return { postcode: data.postcode, size: data.size as string, waste: data.waste as string, date: data.date as string | undefined, hirePeriod: data.hirePeriod as string | undefined };
}

// Integration boundary: connect the documented service-area/pricing provider
// here once its staging contract is supplied. A locality lookup is NOT proof
// of service coverage. Never derive a customer quote from catalogue examples.
export async function lookupQuote(input: ReturnType<typeof validateQuote>): Promise<{ serviceable: boolean; total: number | null }> {
  void input;
  throw new Error("Pricing provider has not been configured");
}
