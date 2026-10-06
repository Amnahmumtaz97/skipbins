import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getOperationsSnapshot } from "@/lib/server/operations-service";
import { OrderManager } from "@/components/admin/order-manager";
import { PageHeading, Stat } from "@/components/admin/portal-ui";
import { todayIsoDate } from "@/lib/booking-utils";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, snapshot] = await Promise.all([
    params,
    getOperationsSnapshot(),
  ]);
  const supplier = snapshot.suppliers.find((s) => s.id === id);
  if (!supplier) notFound();
  const jobs = snapshot.bookings.filter((b) => b.supplier_id === id);
  return (
    <div>
      <PageHeading
        eyebrow="SUPPLIER WORKSPACE · ADMIN VIEW"
        title={supplier.name}
        description="Review and manage this supplier's bookings from your administrator account."
        actions={
          <Link href="/admin/suppliers" className="portal-button-secondary">
            <ArrowLeft size={16} />
            Back to suppliers
          </Link>
        }
      />
      <div className="portal-stats">
        <Stat
          label="Current jobs"
          value={
            jobs.filter(
              (b) => !["collected", "cancelled"].includes(b.operation_status),
            ).length
          }
        />
        <Stat
          label="Completed jobs"
          value={jobs.filter((b) => b.operation_status === "collected").length}
        />
        <Stat
          label="Listed bins"
          value={Object.values(supplier.bin_inventory).reduce(
            (s, v) => s + v,
            0,
          )}
        />
        <Stat label="Supplier status" value={supplier.status} />
      </div>
      <OrderManager
        initialBookings={jobs}
        suppliers={snapshot.suppliers}
        today={todayIsoDate()}
      />
    </div>
  );
}
