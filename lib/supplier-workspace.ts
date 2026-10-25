import { addDaysIso } from "@/lib/booking-utils";
import type { OperationsBooking } from "@/lib/server/operations-service";

export type SupplierEarning = {
  booking: OperationsBooking;
  commission: number;
  processing: number;
  net: number;
};

export type SupplierEarningsPeriod = {
  label: string;
  net: number;
  commission: number;
};

export function supplierEarnings(
  bookings: OperationsBooking[],
  commissionPercent: number,
  stripeFeePercent: number,
) {
  return bookings
    .filter(
      (b) =>
        b.payment_status === "paid" &&
        b.operation_status !== "cancelled" &&
        !b.deleted,
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

/** Monday–Sunday week containing an ISO date, in the same calendar as that date. */
function weekBounds(today: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today);
  if (!match) return null;
  const weekday = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  ).getDay();
  const start = addDaysIso(today, -((weekday + 6) % 7));
  return { start, end: addDaysIso(start, 6) };
}

export function supplierEarningsPeriods(
  rows: Pick<SupplierEarning, "booking" | "net" | "commission">[],
  today: string,
): SupplierEarningsPeriod[] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today);
  const empty = [
    "Net Estimate Today",
    "Net Estimate This week",
    "Net Estimate This Month",
    "Net Estimate Last Month",
    "Net Estimate Yearly to date",
  ].map((label) => ({ label, net: 0, commission: 0 }));
  if (!match) return empty;

  const year = match[1];
  const monthKey = today.slice(0, 7);
  const week = weekBounds(today);
  const lastMonthEnd = addDaysIso(`${monthKey}-01`, -1);
  const lastMonthKey = lastMonthEnd.slice(0, 7);
  const yearStart = `${year}-01-01`;

  const sum = (include: (date: string) => boolean) =>
    rows.reduce(
      (totals, row) => {
        const date = row.booking.delivery_date;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !include(date)) return totals;
        return {
          net: totals.net + row.net,
          commission: totals.commission + row.commission,
        };
      },
      { net: 0, commission: 0 },
    );

  const periods = [
    sum((date) => date === today),
    sum((date) =>
      Boolean(week && date >= week.start && date <= week.end),
    ),
    sum((date) => date.startsWith(monthKey)),
    sum((date) => date.startsWith(lastMonthKey)),
    sum((date) => date >= yearStart && date <= today),
  ];

  return empty.map((period, index) => ({ ...period, ...periods[index] }));
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
