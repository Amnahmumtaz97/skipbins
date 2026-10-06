import { SupplierOrders } from "@/components/supplier/supplier-orders";
import { getSupplierWorkspace } from "@/lib/server/supplier-workspace";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const [{ supplier, bookings, loadError }, params] = await Promise.all([
    getSupplierWorkspace(),
    searchParams,
  ]);
  if (loadError)
    return (
      <div className="portal-panel" role="alert">
        {loadError}
      </div>
    );
  if (!supplier)
    return (
      <div className="portal-panel">
        Your supplier profile is not linked. Ask the administrator to link your
        account.
      </div>
    );
  return (
    <div>
      <div className="portal-heading">
        <div>
          <p className="portal-eyebrow">Job register · {supplier.name}</p>
          <h1>Assigned orders</h1>
          <p>
            Accept deliveries, manage collections, report issues and keep
            customers informed.
          </p>
        </div>
      </div>
      <SupplierOrders
        initialBookings={bookings}
        initialSelectedId={params.job}
      />
    </div>
  );
}
