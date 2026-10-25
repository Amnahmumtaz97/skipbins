import { getBinBySizeOrId } from "@/lib/data/skip-bins";
import { bookingExtrasTotal, type BookingExtraQuantities } from "@/lib/data/booking-extras";
import type { HirePeriod } from "@/types/skip-bin";

export const hireExtensionFee: Record<HirePeriod, number> = {
  "Standard (10 days)": 0,
  "Extended (7 days)": 50,
  "Extended (14 days)": 75,
};

export function hireExtensionAmount(hirePeriod?: string | null) {
  if (!hirePeriod || !(hirePeriod in hireExtensionFee)) return 0;
  return hireExtensionFee[hirePeriod as HirePeriod];
}

export function parseBinPrice(price: string) {
  const amount = Number(price.replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) ? amount : null;
}

export function quoteTotal(size?: string | null, hirePeriod?: string | null, extras?: BookingExtraQuantities | null) {
  const bin = getBinBySizeOrId(size);
  if (!bin) return null;
  const base = parseBinPrice(bin.price);
  if (base == null) return null;
  return Math.round(base + hireExtensionAmount(hirePeriod)) + (extras ? bookingExtrasTotal(extras) : 0);
}
