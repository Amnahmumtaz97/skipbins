import Link from "next/link";
import { Plus } from "lucide-react";
import { OrderManager } from "@/components/admin/order-manager";
import { PageHeading } from "@/components/admin/portal-ui";
import { getOperationsSnapshot } from "@/lib/server/operations-service";
import { todayIsoDate } from "@/lib/booking-utils";
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const [snapshot, params] = await Promise.all([
    getOperationsSnapshot(),
    searchParams,
  ]);
  return (
    <div>
      <PageHeading
        eyebrow="DISPATCH & FULFILMENT"
        title="Bookings"
        description="Allocate suppliers, manage daily movements and track every booking."
        actions={
          <Link className="portal-button" href="/book" target="_blank">
            <Plus size={16} />
            New booking
          </Link>
        }
      />
      <OrderManager
        initialBookings={snapshot.bookings}
        suppliers={snapshot.suppliers}
        today={todayIsoDate()}
        initialSelectedId={params.order}
      />
    </div>
  );
}
