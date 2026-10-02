export const bookingExtras = [
  { id: "excavatorTrack", label: "Excavator Track", price: 100 },
  { id: "mattressDisposal", label: "Mattress Disposal", price: 50 },
  { id: "truckTyreDisposal", label: "Truck Tyre Disposal", price: 80 },
  { id: "carTyreDisposal", label: "Car Tyre Disposal", price: 50 },
] as const;

export type BookingExtraId = (typeof bookingExtras)[number]["id"];
export type BookingExtraQuantities = Record<BookingExtraId, number>;

export const maxExtraQuantity = 20;

export function emptyBookingExtras(): BookingExtraQuantities {
  return {
    excavatorTrack: 0,
    mattressDisposal: 0,
    truckTyreDisposal: 0,
    carTyreDisposal: 0,
  };
}

export function normalizeBookingExtras(value: unknown): BookingExtraQuantities | null {
  if (value == null) return emptyBookingExtras();
  if (typeof value !== "object" || Array.isArray(value)) return null;

  const input = value as Record<string, unknown>;
  const allowed = new Set<string>(bookingExtras.map((extra) => extra.id));
  if (Object.keys(input).some((key) => !allowed.has(key))) return null;

  const normalized = emptyBookingExtras();
  for (const extra of bookingExtras) {
    const quantity = input[extra.id] ?? 0;
    if (!Number.isInteger(quantity) || Number(quantity) < 0 || Number(quantity) > maxExtraQuantity) return null;
    normalized[extra.id] = Number(quantity);
  }
  return normalized;
}

export function bookingExtrasTotal(extras: BookingExtraQuantities) {
  return bookingExtras.reduce((total, extra) => total + extra.price * extras[extra.id], 0);
}

export function selectedBookingExtras(extras: BookingExtraQuantities) {
  return bookingExtras
    .map((extra) => ({ ...extra, quantity: extras[extra.id] }))
    .filter((extra) => extra.quantity > 0);
}
