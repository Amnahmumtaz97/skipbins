import "server-only";
import { DISPATCH_SUBURBS, findLocalityCoords } from "@/lib/delivery-zones";
import { adminDatabase } from "@/lib/server/admin-database";
import {
  DRIVING_MAX_DESTINATIONS,
  drivingDistanceProvider,
  drivingDistancesMetres,
} from "@/lib/server/driving-distance";
import { InputError } from "@/lib/server/request";

export type RoadDistanceRow = {
  id: string;
  suburb: string;
  postcode: string;
  roadKm: number;
  campbellfieldKm: number | null;
  lavertonKm: number | null;
  provider: string;
  updatedAt: string;
};

/** Fallback cache row in bin_rates when suburb_road_distances is not migrated yet. */
const FALLBACK_CACHE_ID = "_road_distances";

type StoredRoadDistance = {
  suburb: string;
  postcode: string;
  roadKm: number;
  campbellfieldKm: number | null;
  lavertonKm: number | null;
  provider: string;
  updatedAt: string;
};

type FallbackCache = Record<string, StoredRoadDistance>;

let tableAvailable: boolean | null = null;

function localityId(suburb: string, postcode: string) {
  return `${postcode}-${suburb.trim().toUpperCase()}`;
}

function isMissingRoadTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /suburb_road_distances/i.test(error.message ?? "")
  );
}

async function hasRoadDistanceTable() {
  if (tableAvailable !== null) return tableAvailable;
  const db = adminDatabase();
  if (!db) {
    tableAvailable = false;
    return false;
  }
  const { error } = await db
    .from("suburb_road_distances")
    .select("id")
    .limit(1);
  tableAvailable = !isMissingRoadTable(error);
  return tableAvailable;
}

async function readFallbackCache(): Promise<FallbackCache> {
  const db = adminDatabase();
  if (!db) return {};
  const { data, error } = await db
    .from("bin_rates")
    .select("data")
    .eq("id", FALLBACK_CACHE_ID)
    .maybeSingle();
  if (error || !data?.data || typeof data.data !== "object") return {};
  const byId = (data.data as { byId?: FallbackCache }).byId;
  return byId && typeof byId === "object" ? byId : {};
}

async function writeFallbackCache(byId: FallbackCache) {
  const db = adminDatabase();
  if (!db) throw new Error("Database unavailable");
  const { error } = await db.from("bin_rates").upsert({
    id: FALLBACK_CACHE_ID,
    data: { id: FALLBACK_CACHE_ID, byId },
    updated_at: new Date().toISOString(),
  });
  if (error) throw new InputError(error.message || "Could not save road distances.");
}

function toRow(id: string, stored: StoredRoadDistance): RoadDistanceRow {
  return {
    id,
    suburb: stored.suburb,
    postcode: stored.postcode,
    roadKm: stored.roadKm,
    campbellfieldKm: stored.campbellfieldKm,
    lavertonKm: stored.lavertonKm,
    provider: stored.provider,
    updatedAt: stored.updatedAt,
  };
}

export async function getRoadDistanceKm(suburb: string, postcode: string) {
  const db = adminDatabase();
  if (!db) return null;
  const id = localityId(suburb, postcode);

  if (await hasRoadDistanceTable()) {
    const { data, error } = await db
      .from("suburb_road_distances")
      .select("road_km")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      if (isMissingRoadTable(error)) {
        tableAvailable = false;
      } else {
        throw error;
      }
    } else {
      const value = data?.road_km;
      return typeof value === "number" && Number.isFinite(value) ? value : null;
    }
  }

  const cache = await readFallbackCache();
  const row = cache[id];
  return row && Number.isFinite(row.roadKm) ? row.roadKm : null;
}

export async function listRoadDistancesByIds(ids: string[]) {
  const db = adminDatabase();
  if (!db || !ids.length) return new Map<string, number>();
  const unique = [...new Set(ids)];
  const map = new Map<string, number>();

  if (await hasRoadDistanceTable()) {
    for (let index = 0; index < unique.length; index += 500) {
      const slice = unique.slice(index, index + 500);
      const { data, error } = await db
        .from("suburb_road_distances")
        .select("id, road_km")
        .in("id", slice);
      if (error) {
        if (isMissingRoadTable(error)) {
          tableAvailable = false;
          break;
        }
        throw error;
      }
      for (const row of data ?? []) {
        if (typeof row.road_km === "number" && Number.isFinite(row.road_km)) {
          map.set(row.id, row.road_km);
        }
      }
    }
    if (tableAvailable) return map;
  }

  const cache = await readFallbackCache();
  for (const id of unique) {
    const row = cache[id];
    if (row && Number.isFinite(row.roadKm)) map.set(id, row.roadKm);
  }
  return map;
}

export async function saveManualRoadDistance(input: {
  suburb: string;
  postcode: string;
  roadKm: number;
}) {
  const db = adminDatabase();
  if (!db) throw new Error("Database unavailable");
  if (!/^\d{4}$/.test(input.postcode))
    throw new InputError("Enter a valid 4-digit postcode.");
  if (
    typeof input.roadKm !== "number" ||
    !Number.isFinite(input.roadKm) ||
    input.roadKm < 0 ||
    input.roadKm > 500
  )
    throw new InputError("Enter a road distance between 0 and 500 km.");

  const locality = findLocalityCoords(input.suburb, input.postcode);
  const suburb = (locality?.suburb ?? input.suburb).trim().toUpperCase();
  const id = locality?.id ?? localityId(suburb, input.postcode);
  const now = new Date().toISOString();
  const roadKm = Math.round(input.roadKm * 10) / 10;
  const stored: StoredRoadDistance = {
    suburb,
    postcode: input.postcode,
    roadKm,
    campbellfieldKm: null,
    lavertonKm: null,
    provider: "manual",
    updatedAt: now,
  };

  if (await hasRoadDistanceTable()) {
    const { error } = await db.from("suburb_road_distances").upsert({
      id,
      suburb,
      postcode: input.postcode,
      road_km: roadKm,
      campbellfield_km: null,
      laverton_km: null,
      provider: "manual",
      updated_at: now,
    });
    if (error) {
      if (!isMissingRoadTable(error)) {
        throw new InputError(error.message || "Could not save road distance.");
      }
      tableAvailable = false;
    } else {
      return toRow(id, stored);
    }
  }

  const cache = await readFallbackCache();
  cache[id] = stored;
  await writeFallbackCache(cache);
  return toRow(id, stored);
}

export async function computeAndSaveRoadDistances(
  targets: { suburb: string; postcode: string }[],
  options?: { onlyMissing?: boolean },
) {
  const db = adminDatabase();
  if (!db) throw new Error("Database unavailable");
  const provider = drivingDistanceProvider();
  const useTable = await hasRoadDistanceTable();

  const resolved = targets
    .map((row) => {
      const locality = findLocalityCoords(row.suburb, row.postcode);
      if (!locality) return null;
      return {
        id: locality.id,
        suburb: locality.suburb,
        postcode: locality.postcode,
        lat: locality.lat,
        lng: locality.lng,
      };
    })
    .filter(Boolean) as {
    id: string;
    suburb: string;
    postcode: string;
    lat: number;
    lng: number;
  }[];

  const unique = new Map(resolved.map((row) => [row.id, row]));
  let pending = [...unique.values()];

  if (options?.onlyMissing && pending.length) {
    const existing = await listRoadDistancesByIds(pending.map((row) => row.id));
    pending = pending.filter((row) => !existing.has(row.id));
  }

  // Keep public OSRM jobs short so the admin request does not time out.
  const maxPerRun = 40;
  const deferred = Math.max(0, pending.length - maxPerRun);
  pending = pending.slice(0, maxPerRun);

  if (!pending.length) {
    return {
      computed: 0,
      skipped: unique.size,
      deferred: 0,
      provider,
      rows: [] as RoadDistanceRow[],
    };
  }

  const sources = DISPATCH_SUBURBS.map((depot) => ({
    lat: depot.lat,
    lng: depot.lng,
  }));
  const saved: RoadDistanceRow[] = [];
  const now = new Date().toISOString();
  const fallbackCache = useTable ? null : await readFallbackCache();

  for (let index = 0; index < pending.length; index += DRIVING_MAX_DESTINATIONS) {
    const batch = pending.slice(index, index + DRIVING_MAX_DESTINATIONS);
    let matrix: number[][];
    try {
      matrix = await drivingDistancesMetres({
        sources,
        destinations: batch.map((row) => ({ lat: row.lat, lng: row.lng })),
      });
    } catch (error) {
      throw new InputError(
        error instanceof Error
          ? error.message
          : "Road routing failed. Try again or enter km manually.",
      );
    }

    const values = batch.map((row, destinationIndex) => {
      const campbellfieldM = matrix[0]?.[destinationIndex];
      const lavertonM = matrix[1]?.[destinationIndex];
      const campbellfieldKm = Number.isFinite(campbellfieldM)
        ? Math.round((campbellfieldM / 1000) * 10) / 10
        : null;
      const lavertonKm = Number.isFinite(lavertonM)
        ? Math.round((lavertonM / 1000) * 10) / 10
        : null;
      const candidates = [campbellfieldKm, lavertonKm].filter(
        (value): value is number => typeof value === "number",
      );
      if (!candidates.length) {
        throw new InputError(
          `No road route found for ${row.suburb} ${row.postcode}.`,
        );
      }
      const roadKm = Math.min(...candidates);
      return {
        id: row.id,
        suburb: row.suburb,
        postcode: row.postcode,
        road_km: roadKm,
        campbellfield_km: campbellfieldKm,
        laverton_km: lavertonKm,
        provider,
        updated_at: now,
      };
    });

    if (useTable) {
      const { error } = await db.from("suburb_road_distances").upsert(values);
      if (error) {
        if (isMissingRoadTable(error)) {
          tableAvailable = false;
          throw new InputError(
            "Road-distance table disappeared mid-run. Refresh and try again.",
          );
        }
        throw new InputError(error.message || "Could not save road distances.");
      }
    } else if (fallbackCache) {
      for (const row of values) {
        fallbackCache[row.id] = {
          suburb: row.suburb,
          postcode: row.postcode,
          roadKm: row.road_km,
          campbellfieldKm: row.campbellfield_km,
          lavertonKm: row.laverton_km,
          provider: row.provider,
          updatedAt: row.updated_at,
        };
      }
    }

    for (const row of values) {
      saved.push({
        id: row.id,
        suburb: row.suburb,
        postcode: row.postcode,
        roadKm: row.road_km,
        campbellfieldKm: row.campbellfield_km,
        lavertonKm: row.laverton_km,
        provider: row.provider,
        updatedAt: row.updated_at,
      });
    }

    if (index + DRIVING_MAX_DESTINATIONS < pending.length) {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }

  if (fallbackCache) await writeFallbackCache(fallbackCache);

  return {
    computed: saved.length,
    skipped: unique.size - pending.length - deferred,
    deferred,
    provider,
    rows: saved,
  };
}
