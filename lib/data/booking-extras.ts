export const bookingExtras = [
  { id: "tyreDisposal", label: "Tyre Disposal", price: 25, pricingLabel: "$25 each" },
  { id: "mattressDisposal", label: "Mattress Disposal", price: 50, pricingLabel: "First mattress FREE · then $50 each", freeQuantity: 1 },
  { id: "carpetDisposal", label: "Carpet Disposal", price: 70, pricingLabel: "$70 per room" },
] as const;

export type BookingExtraId = (typeof bookingExtras)[number]["id"];
export type BookingExtraQuantities = Record<BookingExtraId, number>;

export const maxExtraQuantity = 20;

export function emptyBookingExtras(): BookingExtraQuantities {
  return {
    tyreDisposal: 0,
    mattressDisposal: 0,
    carpetDisposal: 0,
  };
}

export function normalizeBookingExtras(value: unknown): BookingExtraQuantities | null {
  if (value == null) return emptyBookingExtras();
  if (typeof value !== "object" || Array.isArray(value)) return null;

  const input = value as Record<string, unknown>;
  const legacyKeys = new Set(["excavatorTrack", "truckTyreDisposal", "carTyreDisposal"]);
  const allowed = new Set<string>([...bookingExtras.map((extra) => extra.id), ...legacyKeys]);
  if (Object.keys(input).some((key) => !allowed.has(key))) return null;

  for (const key of Object.keys(input)) {
    const quantity = input[key];
    if (!Number.isInteger(quantity) || Number(quantity) < 0 || Number(quantity) > maxExtraQuantity) return null;
  }

  const normalized = emptyBookingExtras();
  for (const extra of bookingExtras) {
    const quantity = input[extra.id] ?? 0;
    normalized[extra.id] = Number(quantity);
  }
  const legacyTyres = Number(input.truckTyreDisposal ?? 0) + Number(input.carTyreDisposal ?? 0);
  if (legacyTyres > maxExtraQuantity) return null;
  if (!input.tyreDisposal) normalized.tyreDisposal = legacyTyres;
  return normalized;
}

export function bookingExtrasTotal(extras: BookingExtraQuantities) {
  return bookingExtras.reduce((total, extra) => total + bookingExtraLineTotal(extra, extras[extra.id]), 0);
}

export function selectedBookingExtras(extras: BookingExtraQuantities) {
  return bookingExtras
    .map((extra) => {
      const quantity = extras[extra.id];
      const freeQuantity = "freeQuantity" in extra ? Math.min(extra.freeQuantity, quantity) : 0;
      const chargeableQuantity = quantity - freeQuantity;
      return { ...extra, quantity, freeQuantity, chargeableQuantity, total: chargeableQuantity * extra.price };
    })
    .filter((extra) => extra.quantity > 0);
}

function bookingExtraLineTotal(extra: (typeof bookingExtras)[number], quantity: number) {
  const freeQuantity = "freeQuantity" in extra ? extra.freeQuantity : 0;
  return Math.max(0, quantity - freeQuantity) * extra.price;
}
