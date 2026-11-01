import "server-only";
import { adminDatabase, readAllRows } from "@/lib/server/admin-database";
import {
  defaultSettings,
  defaultRates,
  type PortalSettings,
  type BinRate,
  type Coverage,
} from "@/lib/admin-config";
import { listRoadDistancesByIds } from "@/lib/server/road-distance";
export async function getPortalConfig() {
  const db = adminDatabase();
  if (!db)
    return {
      settings: defaultSettings,
      rates: defaultRates(),
      coverage: [] as Coverage[],
      ready: false,
      error: "Admin settings need a configured server database.",
    };
  const [s, r, c] = await Promise.all([
    db.from("portal_settings").select("data").eq("id", "main").maybeSingle(),
    db.from("bin_rates").select("data"),
    readAllRows(db, "service_suburbs", "*", "suburb", true),
  ]);
  const error = s.error || r.error || c.error;
  if (error)
    return {
      settings: defaultSettings,
      rates: defaultRates(),
      coverage: [] as Coverage[],
      ready: false,
      error:
        "Admin settings could not be loaded. Apply supabase/admin-portal-migration.sql and verify the database connection.",
    };
  const baseCoverage = (c.data ?? []) as unknown as Coverage[];
  let roadById = new Map<string, number>();
  try {
    roadById = await listRoadDistancesByIds(baseCoverage.map((row) => row.id));
  } catch {
    roadById = new Map();
  }
  return {
    settings: {
      ...defaultSettings,
      ...((s.data?.data ?? {}) as Partial<PortalSettings>),
      profile: {
        ...defaultSettings.profile,
        ...((s.data?.data as PortalSettings | undefined)?.profile ?? {}),
      },
      zoneDeliveryFees: {
        ...defaultSettings.zoneDeliveryFees,
        ...((s.data?.data as PortalSettings | undefined)?.zoneDeliveryFees ?? {}),
      },
      zoneMaxKm: {
        ...defaultSettings.zoneMaxKm,
        ...((s.data?.data as PortalSettings | undefined)?.zoneMaxKm ?? {}),
      },
    },
    rates: defaultRates().map(
      (rate) =>
        ((r.data ?? []).find((row) => row.data.id === rate.id)
          ?.data as BinRate) ?? rate,
    ),
    coverage: baseCoverage.map((row) => ({
      ...row,
      roadKm: roadById.get(row.id) ?? row.roadKm ?? null,
    })),
    ready: true,
    error: "",
  };
}
export async function savePortalSettings(settings: PortalSettings) {
  const db = adminDatabase();
  if (!db) throw new Error("Database unavailable");
  const { error } = await db
    .from("portal_settings")
    .upsert({
      id: "main",
      data: settings,
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
}
export async function saveRate(rate: BinRate) {
  const db = adminDatabase();
  if (!db) throw new Error("Database unavailable");
  const { error } = await db
    .from("bin_rates")
    .upsert({ id: rate.id, data: rate, updated_at: new Date().toISOString() });
  if (error) throw error;
}
export async function listCustomers() {
  const db = adminDatabase();
  if (!db)
    return { customers: [], error: "Customer database is not configured." };
  const { data, error } = await readAllRows(
    db,
    "customers",
    "id,customer_code,full_name,email,phone,created_at,status",
  );
  return {
    customers: (data ?? []) as unknown as CustomerRecord[],
    error: error
      ? "Customer records could not be loaded. Verify the admin migration and database connection."
      : "",
  };
}
export type CustomerRecord = {
  id: string;
  customer_code: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  status: "active" | "inactive";
};
