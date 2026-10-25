import type { VicLocality } from "@/lib/data/vic-localities";

export type CoverageChoice = {
  id: string;
  active: boolean;
};

export function deliversTo(
  mode: "victoria" | "selected",
  active: boolean | undefined,
) {
  if (mode === "victoria") return active !== false;
  return active === true;
}

export function selectionChanges(
  rows: VicLocality[],
  coverage: CoverageChoice[],
  mode: "victoria" | "selected",
  active: boolean,
) {
  const current = new Map(coverage.map((row) => [row.id, row.active]));
  return rows.filter((row) => {
    if (!current.has(row.id))
      return mode === "selected" ? active : !active;
    return current.get(row.id) !== active;
  });
}

export function retainShownLocalities<T extends { id: string }>(
  shownIds: Set<string>,
  ranged: T[],
  all: T[],
) {
  for (const row of ranged) shownIds.add(row.id);
  if (shownIds.size === ranged.length) return ranged;
  return all.filter((row) => shownIds.has(row.id));
}

export function localitiesInRectangle(
  rows: VicLocality[],
  bounds: { south: number; west: number; north: number; east: number },
) {
  const south = Math.min(bounds.south, bounds.north);
  const north = Math.max(bounds.south, bounds.north);
  const west = Math.min(bounds.west, bounds.east);
  const east = Math.max(bounds.west, bounds.east);
  return rows.filter(
    (row) =>
      row.lat >= south &&
      row.lat <= north &&
      row.lng >= west &&
      row.lng <= east,
  );
}

export function samePlace(origin: VicLocality, rows: VicLocality[]) {
  return rows.filter(
    (row) =>
      row.suburb === origin.suburb &&
      Math.abs(row.lat - origin.lat) < 0.005 &&
      Math.abs(row.lng - origin.lng) < 0.005,
  );
}

export const MAP_RANGES_KM = [25, 50, 75, 100] as const;
export const DEFAULT_MAP_RANGE_KM = 50;
export const MELBOURNE_CENTER = { lat: -37.8136, lng: 144.9631 };

export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const lat1 = a.lat * rad;
  const lat2 = b.lat * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function localitiesInView(
  rows: VicLocality[],
  rangeKm: number,
  origin: { lat: number; lng: number } = MELBOURNE_CENTER,
) {
  const reach = rangeKm / 111;
  const south = origin.lat - reach;
  const north = origin.lat + reach;
  const west = origin.lng - reach;
  const east = origin.lng + reach;
  return rows.filter((row) => {
    if (row.lat < south || row.lat > north || row.lng < west || row.lng > east)
      return false;
    return distanceKm(origin, row) <= rangeKm;
  });
}
