import { melbourneDate } from "@/lib/admin-config";
import type { OperationsBooking } from "@/lib/server/operations-service";
export type ReportPeriod = { start: string; end: string };
function iso(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}
function fortnight(year: number, month: number, second: boolean): ReportPeriod {
  return {
    start: iso(year, month, second ? 16 : 1),
    end: second ? iso(year, month + 1, 0) : iso(year, month, 15),
  };
}
export function reportPeriod(
  today: string,
  shortcut: "due" | "next" | "fortnight" | "month" | "lastMonth",
): ReportPeriod {
  const [year, m, d] = today.split("-").map(Number);
  const month = m - 1;
  const second = d >= 16;
  if (shortcut === "month")
    return { start: iso(year, month, 1), end: iso(year, month + 1, 0) };
  if (shortcut === "lastMonth")
    return { start: iso(year, month - 1, 1), end: iso(year, month, 0) };
  if (shortcut === "due")
    return second
      ? fortnight(year, month, false)
      : fortnight(year, month - 1, true);
  if (shortcut === "next")
    return second
      ? fortnight(year, month + 1, false)
      : fortnight(year, month, true);
  return fortnight(year, month, second);
}
export function bookingSource(booking: OperationsBooking) {
  return booking.booking_source ?? "direct";
}
export function summarizePayouts(
  bookings: OperationsBooking[],
  period: ReportPeriod,
  today: string,
  commission: number,
  fee: number,
  excludedPpc: string[] = [],
) {
  const inRange = (date: string) =>
    !!date && date >= period.start && date <= period.end;
  const created = bookings.filter((b) => inRange(melbourneDate(b.created_at)));
  const cancelled = created.filter((b) => b.operation_status === "cancelled");
  const paidCreated = created.filter(
    (b) => b.payment_status === "paid" && b.operation_status !== "cancelled",
  );
  const payable = bookings.filter(
    (b) =>
      b.payment_status === "paid" &&
      b.operation_status !== "cancelled" &&
      inRange(b.delivery_date) &&
      b.delivery_date <= today,
  );
  const included = payable.filter(
    (b) =>
      !(
        bookingSource(b) === "ppc" &&
        b.supplier_id &&
        excludedPpc.includes(b.supplier_id)
      ),
  );
  const sum = (rows: OperationsBooking[]) =>
    rows.reduce((s, b) => s + b.amount_cents, 0);
  const revenue = sum(included),
    commissionCents = included.reduce(
      (s, b) => s + Math.round((b.amount_cents * commission) / 100),
      0,
    ),
    feeCents = included.reduce(
      (s, b) => s + Math.round((b.amount_cents * fee) / 100),
      0,
    );
  return {
    created,
    cancelled,
    paidCreated,
    payable: included,
    createdRevenue: sum(paidCreated),
    cancelledValue: sum(cancelled),
    revenue,
    commissionCents,
    feeCents,
    net: revenue - commissionCents - feeCents,
  };
}
