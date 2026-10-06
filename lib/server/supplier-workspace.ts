import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupplierUser, supplierIdFromUser } from "@/lib/server/admin-auth";
import { getSupplierOperations } from "@/lib/server/operations-service";
import { getPortalConfig } from "@/lib/server/portal-service";
export async function getSupplierWorkspace() {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user || !isSupplierUser(user)) redirect("/supplier/login");
  const [operations, config] = await Promise.all([
    getSupplierOperations(user.id, supplierIdFromUser(user)),
    getPortalConfig(),
  ]);
  return {
    ...operations,
    loadError: operations.error,
    commissionPercent: config.settings.commissionPercent,
    stripeFeePercent: config.settings.stripeFeePercent,
    earningsReady: config.ready,
  };
}
