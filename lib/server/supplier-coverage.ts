import "server-only";
import { adminDatabase } from "@/lib/server/admin-database";
import { getPortalConfig } from "@/lib/server/portal-service";
import { unionSupplierPostcodes } from "@/lib/supplier-area";

export async function bookablePostcodes() {
  const config = await getPortalConfig();
  if (!config.ready) return null;
  const adminPostcodes = config.coverage
    .filter((row) => row.active)
    .map((row) => row.postcode);
  const db = adminDatabase();
  if (!db) return [];
  const { data, error } = await db
    .from("suppliers")
    .select("service_area")
    .eq("status", "active");
  if (error) throw error;
  return unionSupplierPostcodes(
    (data ?? []).map((row) => String(row.service_area ?? "")),
    adminPostcodes,
  );
}
