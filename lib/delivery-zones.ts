import { distanceKm } from "@/lib/coverage-selection";
import { vicLocalities } from "@/lib/data/vic-localities";

export type DeliveryZone = 1 | 2 | 3 | 4;

export const DELIVERY_ZONES = [1, 2, 3, 4] as const;

export type ZoneDeliveryFees = {
  1: number;
  2: number;
  3: number;
  4: number;
};

/** Upper km bounds for Zones 1–3. Zone 4 is everything beyond Zone 3. */
export type ZoneMaxKm = {
  1: number;
  2: number;
  3: number;
};

export const DISPATCH_SUBURBS = [
  {
    id: "3061-CAMPBELLFIELD",
    name: "Campbellfield",
    postcode: "3061",
    lat: -37.66627,
    lng: 144.95676,
  },
  {
    id: "3028-LAVERTON",
    name: "Laverton",
    postcode: "3028",
    lat: -37.87507,
    lng: 144.77717,
  },
] as const;

export const ZONE_SHORT_LABELS: Record<DeliveryZone, string> = {
  1: "Zone 1",
  2: "Zone 2",
  3: "Zone 3",
  4: "Zone 4",
};

/** Included suburb marker colours by delivery zone. */
export const ZONE_MARKER_COLORS: Record<
  DeliveryZone,
  { fill: string; stroke: string }
> = {
  1: { fill: "#65A30D", stroke: "#3F6212" },
  2: { fill: "#0EA5E9", stroke: "#0369A1" },
  3: { fill: "#D97706", stroke: "#92400E" },
  4: { fill: "#7C3AED", stroke: "#5B21B6" },
};

export const defaultZoneDeliveryFees: ZoneDeliveryFees = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
};

export const defaultZoneMaxKm: ZoneMaxKm = {
  1: 25,
  2: 50,
  3: 75,
};

export function zoneLabels(limits: ZoneMaxKm = defaultZoneMaxKm) {
  return {
    1: `Zone 1 · within ${limits[1]} km`,
    2: `Zone 2 · within ${limits[2]} km`,
    3: `Zone 3 · within ${limits[3]} km`,
    4: `Zone 4 · ${limits[3]}+ km`,
  } as const satisfies Record<DeliveryZone, string>;
}

/** @deprecated Use zoneLabels(settings.zoneMaxKm) so km cutoffs stay editable. */
export const ZONE_LABELS = zoneLabels();

export function distanceToNearestDispatch(point: {
  lat: number;
  lng: number;
}) {
  return Math.min(
    ...DISPATCH_SUBURBS.map((depot) => distanceKm(depot, point)),
  );
}

export function nearestDispatch(point: { lat: number; lng: number }) {
  let best: (typeof DISPATCH_SUBURBS)[number] = DISPATCH_SUBURBS[0];
  let bestKm = distanceKm(best, point);
  for (const depot of DISPATCH_SUBURBS.slice(1)) {
    const km = distanceKm(depot, point);
    if (km < bestKm) {
      best = depot;
      bestKm = km;
    }
  }
  return { depot: best, km: bestKm };
}

export function deliveryZoneFromKm(
  km: number,
  limits: ZoneMaxKm = defaultZoneMaxKm,
): DeliveryZone {
  if (km <= limits[1]) return 1;
  if (km <= limits[2]) return 2;
  if (km <= limits[3]) return 3;
  return 4;
}

export function deliveryZoneForPoint(
  point: { lat: number; lng: number },
  limits: ZoneMaxKm = defaultZoneMaxKm,
): DeliveryZone {
  return deliveryZoneFromKm(distanceToNearestDispatch(point), limits);
}

export function findLocalityCoords(suburb: string, postcode: string) {
  const key = suburb.trim().toUpperCase();
  const depot = DISPATCH_SUBURBS.find(
    (row) => row.postcode === postcode && row.name.toUpperCase() === key,
  );
  if (depot) {
    return {
      id: depot.id,
      suburb: key,
      postcode: depot.postcode,
      lat: depot.lat,
      lng: depot.lng,
    };
  }
  if (!Array.isArray(vicLocalities)) return null;
  return (
    vicLocalities.find(
      (row) => row.postcode === postcode && row.suburb === key,
    ) ?? null
  );
}

export function deliveryZoneForSuburb(
  suburb: string,
  postcode: string,
  limits: ZoneMaxKm = defaultZoneMaxKm,
  roadKm?: number | null,
): DeliveryZone | null {
  if (typeof roadKm === "number" && Number.isFinite(roadKm) && roadKm >= 0) {
    return deliveryZoneFromKm(roadKm, limits);
  }
  const locality = findLocalityCoords(suburb, postcode);
  return locality ? deliveryZoneForPoint(locality, limits) : null;
}

export function distanceModeLabel(roadKm?: number | null) {
  return typeof roadKm === "number" && Number.isFinite(roadKm)
    ? "Road"
    : "Straight-line";
}

export function zoneDeliveryFee(
  zone: DeliveryZone,
  fees: ZoneDeliveryFees = defaultZoneDeliveryFees,
) {
  return fees[zone] ?? 0;
}
