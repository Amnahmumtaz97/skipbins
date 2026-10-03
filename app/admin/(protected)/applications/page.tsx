import { SupplierApplicationManager } from "@/components/admin/supplier-application-manager";
import { listSupplierApplications } from "@/lib/server/operations-service";

export default async function SupplierApplicationsPage() {
  const applications = await listSupplierApplications();
  return <SupplierApplicationManager initialApplications={applications} />;
}
