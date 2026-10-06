import type { OperationsBooking } from "@/lib/server/operations-service";
export function supplierEarnings(
  bookings: OperationsBooking[],
  commissionPercent: number,
  stripeFeePercent: number,
) {
  return bookings
    .filter(
      (b) => b.payment_status === "paid" && b.operation_status !== "cancelled",
    )
    .map((b) => {
      const commission = Math.round((b.amount_cents * commissionPercent) / 100);
      const processing = Math.round((b.amount_cents * stripeFeePercent) / 100);
      return {
        booking: b,
        commission,
        processing,
        net: b.amount_cents - commission - processing,
      };
    });
}
export function supplierDispatch(bookings: OperationsBooking[], date: string) {
  return bookings
    .filter(
      (b) =>
        !["collected", "cancelled", "payment_pending"].includes(
          b.operation_status,
        ),
    )
    .flatMap((booking) => [
      ...(booking.delivery_date === date &&
      !["delivered", "collection_due"].includes(booking.operation_status)
        ? [{ booking, kind: "Delivery" as const }]
        : []),
      ...(booking.pickup_date === date
        ? [{ booking, kind: "Collection" as const }]
        : []),
    ]);
}
