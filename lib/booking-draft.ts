import type { BookingFormState, HirePeriod } from "@/types/skip-bin";
import { hirePeriods, placements } from "@/lib/data/skip-bins";
import { normalizeBookingExtras } from "@/lib/data/booking-extras";

const draftKey = "skipbins-booking-draft";
const awaitingKey = "skipbins-awaiting-payment";
const checkoutClientSecretKey = "skipbins-checkout-client-secret";
const bookingSubmissionKey = "skipbins-booking-submission-id";

export function saveBookingDraft(form: BookingFormState) {
  sessionStorage.setItem(draftKey, JSON.stringify(form));
  sessionStorage.setItem(awaitingKey, "1");
}

export function getBookingSubmissionId(form: BookingFormState) {
  const fingerprint = JSON.stringify(form);
  try {
    const saved = JSON.parse(sessionStorage.getItem(bookingSubmissionKey) ?? "null") as
      | { fingerprint?: unknown; id?: unknown }
      | null;
    if (
      saved?.fingerprint === fingerprint &&
      typeof saved.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved.id)
    ) return saved.id;
    const id = crypto.randomUUID();
    sessionStorage.setItem(bookingSubmissionKey, JSON.stringify({ fingerprint, id }));
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function loadBookingSubmissionId() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(bookingSubmissionKey) ?? "null") as
      | { id?: unknown }
      | null;
    return typeof saved?.id === "string" ? saved.id : null;
  } catch {
    return null;
  }
}

export function isAwaitingPayment() {
  return sessionStorage.getItem(awaitingKey) === "1";
}

export function saveCheckoutClientSecret(clientSecret: string) {
  sessionStorage.setItem(checkoutClientSecretKey, clientSecret);
}

export function loadCheckoutClientSecret() {
  return sessionStorage.getItem(checkoutClientSecretKey);
}

export function clearBookingDraft() {
  sessionStorage.removeItem(draftKey);
  sessionStorage.removeItem(awaitingKey);
  sessionStorage.removeItem(checkoutClientSecretKey);
  sessionStorage.removeItem(bookingSubmissionKey);
}

export function loadBookingDraft(): BookingFormState | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(draftKey) ?? "") as Partial<BookingFormState>;
    if (!parsed || typeof parsed !== "object") return null;
    const savedHirePeriod = parsed.hirePeriod as string | undefined;
    const hirePeriod = savedHirePeriod === "Standard (7 days)" ? "Standard (10 days)" : savedHirePeriod;
    const placement = parsed.placement;
    const extras = normalizeBookingExtras(parsed.extras);
    if (hirePeriod && !hirePeriods.includes(hirePeriod as HirePeriod)) return null;
    if (placement && !placements.includes(placement as (typeof placements)[number])) return null;
    if (!extras) return null;
    return {
      fullName: String(parsed.fullName ?? ""),
      email: String(parsed.email ?? ""),
      phone: String(parsed.phone ?? ""),
      address: String(parsed.address ?? ""),
      locationLabel: String(parsed.locationLabel ?? parsed.address ?? ""),
      streetAddress: String(parsed.streetAddress ?? ""),
      deliveryAddressLabel: String(parsed.deliveryAddressLabel ?? ""),
      placement: (placement as BookingFormState["placement"]) ?? "",
      access: String(parsed.access ?? ""),
      deliveryDate: String(parsed.deliveryDate ?? ""),
      pickupDate: String(parsed.pickupDate ?? ""),
      binSize: String(parsed.binSize ?? ""),
      wasteType: String(parsed.wasteType ?? ""),
      hirePeriod: (hirePeriod as BookingFormState["hirePeriod"]) ?? "",
      extras,
      notes: String(parsed.notes ?? ""),
    };
  } catch {
    return null;
  }
}
