import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deletedWorkflow } from "@/lib/data/operations";
import { getPortalConfig } from "@/lib/server/portal-service";
import { supplierCoversPostcode } from "@/lib/supplier-area";

const finished = new Set(["collected", "cancelled"]);

export async function chooseSupplierForOrder(
  client: SupabaseClient,
  order: {
    postcode: string;
    deliveryDate?: string | null;
    pickupDate?: string | null;
  },
) {
  const config = await getPortalConfig();
  const adminPostcodes = config.coverage
    .filter((row) => row.active)
    .map((row) => row.postcode);
  const { data: suppliers, error } = await client
    .from("suppliers")
    .select("id,name,service_area")
    .eq("status", "active");
  if (error || !suppliers?.length) return null;
  const candidates = suppliers.filter((supplier) =>
    supplierCoversPostcode(
      String(supplier.service_area ?? ""),
      order.postcode,
      adminPostcodes,
    ),
  );
  if (!candidates.length) return null;
  const { data: jobs } = await client
    .from("bookings")
    .select("supplier_id,delivery_date,pickup_date,operation_status")
    .in(
      "supplier_id",
      candidates.map((supplier) => supplier.id),
    )
    .eq("status", "paid");
  const delivery = order.deliveryDate || "";
  const pickup = order.pickupDate || delivery;
  const load = new Map(candidates.map((supplier) => [String(supplier.id), 0]));
  for (const job of jobs ?? []) {
    const workflow = deletedWorkflow(job.operation_status);
    if (workflow.deleted || finished.has(String(job.operation_status ?? "")))
      continue;
    if (
      delivery &&
      job.delivery_date &&
      job.pickup_date &&
      (job.delivery_date > pickup || job.pickup_date < delivery)
    )
      continue;
    const id = String(job.supplier_id);
    load.set(id, (load.get(id) ?? 0) + 1);
  }
  candidates.sort((a, b) => {
    const difference = (load.get(String(a.id)) ?? 0) - (load.get(String(b.id)) ?? 0);
    if (difference) return difference;
    return String(a.name ?? "").localeCompare(String(b.name ?? ""));
  });
  return String(candidates[0].id);
}
