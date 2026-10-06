import { melbourneDate } from "@/lib/admin-config";
import { addDaysIso } from "@/lib/booking-utils";
import type { OperationStatus } from "@/lib/data/operations";
import type {
  OperationsBooking,
  SupplierRecord,
} from "@/lib/server/operations-service";

export function buildAdminKpis(
  bookings: OperationsBooking[],
  suppliers: SupplierRecord[],
  today: string,
) {
  const paid = bookings.filter((booking) => booking.payment_status === "paid");
  const operational = paid.filter(
    (booking) => booking.operation_status !== "cancelled",
  );
  const open = operational.filter(
    (booking) =>
      !["collected", "payment_pending"].includes(booking.operation_status),
  );
  const activeSuppliers = suppliers.filter(
    (supplier) => supplier.status === "active",
  );
  const suppliersWithWork = new Set(
    open.map((booking) => booking.supplier_id).filter(Boolean),
  );
  const completed = operational.filter(
    (booking) => booking.operation_status === "collected",
  ).length;
  const sevenDayEnd = addDaysIso(today, 6);
  const upcoming = open.filter((booking) =>
    [booking.delivery_date, booking.pickup_date].some(
      (date) => date >= today && date <= sevenDayEnd,
    ),
  );
  const currentMonth = today.slice(0, 7);
  const pipeline = paid.reduce<Record<OperationStatus, number>>(
    (counts, booking) => {
      counts[booking.operation_status] += 1;
      return counts;
    },
    {
      payment_pending: 0,
      unassigned: 0,
      assigned: 0,
      accepted: 0,
      scheduled: 0,
      delivered: 0,
      collection_due: 0,
      collected: 0,
      cancelled: 0,
      issue: 0,
    },
  );

  return {
    paidValueCents: paid.reduce(
      (total, booking) => total + booking.amount_cents,
      0,
    ),
    monthValueCents: paid
      .filter((booking) =>
        melbourneDate(booking.created_at).startsWith(currentMonth),
      )
      .reduce((total, booking) => total + booking.amount_cents, 0),
    openJobs: open.length,
    onHire: open.filter((booking) =>
      ["delivered", "collection_due"].includes(booking.operation_status),
    ).length,
    unassigned: open.filter(
      (booking) => booking.operation_status === "unassigned",
    ).length,
    issues: open.filter((booking) => booking.operation_status === "issue")
      .length,
    deliveriesToday: open.filter((booking) => booking.delivery_date === today)
      .length,
    collectionsToday: open.filter((booking) => booking.pickup_date === today)
      .length,
    upcomingSevenDays: upcoming.length,
    completionRate: operational.length
      ? Math.round((completed / operational.length) * 100)
      : 0,
    supplierUtilization: activeSuppliers.length
      ? Math.round((suppliersWithWork.size / activeSuppliers.length) * 100)
      : 0,
    activeSuppliers: activeSuppliers.length,

    pipeline,
  };
}

export function buildSupplierKpis(
  bookings: OperationsBooking[],
  today: string,
) {
  const active = bookings.filter(
    (booking) => !["collected", "cancelled"].includes(booking.operation_status),
  );
  return {
    active,
    deliveriesToday: active.filter((booking) => booking.delivery_date === today)
      .length,
    collectionsToday: active.filter((booking) => booking.pickup_date === today)
      .length,
    issues: active.filter((booking) => booking.operation_status === "issue")
      .length,
    overdue: active.filter(
      (booking) => Boolean(booking.pickup_date) && booking.pickup_date < today,
    ).length,
  };
}
