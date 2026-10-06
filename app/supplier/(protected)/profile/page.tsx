import { SupplierWorkspace } from "@/components/supplier/supplier-workspace";
import { getSupplierWorkspace } from "@/lib/server/supplier-workspace";
import { todayIsoDate } from "@/lib/booking-utils";
export default async function Page() {
  const workspace = await getSupplierWorkspace();
  return (
    <SupplierWorkspace {...workspace} today={todayIsoDate()} view="profile" />
  );
}
