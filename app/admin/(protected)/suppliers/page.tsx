import { SupplierManager } from "@/components/admin/supplier-manager";
import { getOperationsSnapshot } from "@/lib/server/operations-service";

export default async function AdminSuppliersPage() {
  const { bookings, suppliers, setupRequired, serverConfigured, supplierSchemaReady } = await getOperationsSnapshot();
  const setupMessage = !serverConfigured
    ? "Add SUPABASE_SECRET_KEY to the server environment, then restart or redeploy the app. Supplier records are protected and cannot be created with the public publishable key."
    : !supplierSchemaReady
      ? "The suppliers table could not be loaded. Confirm that supabase/operations-migration.sql ran successfully in this project."
      : "Supplier management is not available yet.";
  return <div className="mx-auto max-w-[1400px]"><SupplierManager initialSuppliers={suppliers} bookings={bookings} setupRequired={setupRequired} setupMessage={setupMessage} /></div>;
}
