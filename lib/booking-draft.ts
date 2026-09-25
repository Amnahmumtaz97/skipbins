import type { BookingFormState, HirePeriod } from "@/types/skip-bin";
import { hirePeriods, placements } from "@/lib/data/skip-bins";

const draftKey = "skipbins-booking-draft";
const awaitingKey = "skipbins-awaiting-payment";

export function saveBookingDraft(form: BookingFormState) {
  sessionStorage.setItem(draftKey, JSON.stringify(form));
  sessionStorage.setItem(awaitingKey, "1");
}

export function isAwaitingPayment() {
  return sessionStorage.getItem(awaitingKey) === "1";
}

export function clearBookingDraft() {
  sessionStorage.removeItem(draftKey);
  sessionStorage.removeItem(awaitingKey);
}

export function loadBookingDraft(): BookingFormState | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(draftKey) ?? "") as Partial<BookingFormState>;
    if (!parsed || typeof parsed !== "object") return null;
    const hirePeriod = parsed.hirePeriod;
    const placement = parsed.placement;
    if (hirePeriod && !hirePeriods.includes(hirePeriod as HirePeriod)) return null;
    if (placement && !placements.includes(placement as (typeof placements)[number])) return null;
    return {
      fullName: String(parsed.fullName ?? ""),
      email: String(parsed.email ?? ""),
      phone: String(parsed.phone ?? ""),
      address: String(parsed.address ?? ""),
      streetAddress: String(parsed.streetAddress ?? ""),
      placement: (placement as BookingFormState["placement"]) ?? "",
      access: String(parsed.access ?? ""),
      deliveryDate: String(parsed.deliveryDate ?? ""),
      binSize: String(parsed.binSize ?? ""),
      wasteType: String(parsed.wasteType ?? ""),
      hirePeriod: (hirePeriod as BookingFormState["hirePeriod"]) ?? "",
      notes: String(parsed.notes ?? ""),
    };
  } catch {
    return null;
  }
}
