import "server-only";

/** Keep batches small — public OSRM is GET-based and rate-limited. */
export const DRIVING_MAX_DESTINATIONS = 5;

const OSRM_BASE =
  process.env.OSRM_BASE_URL?.replace(/\/$/, "") ||
  "https://router.project-osrm.org";

function openRouteServiceKey() {
  return process.env.OPENROUTESERVICE_API_KEY?.trim() || "";
}

/** Default is public OSRM. Set ROAD_DISTANCE_PROVIDER=openrouteservice to use ORS. */
export function drivingDistanceProvider() {
  const forced = process.env.ROAD_DISTANCE_PROVIDER?.trim().toLowerCase();
  if (forced === "openrouteservice" && openRouteServiceKey()) {
    return "openrouteservice" as const;
  }
  return "osrm" as const;
}

type MatrixResponse = {
  distances?: (number | null)[][];
  error?: string;
  code?: string;
  message?: string;
};

/**
 * Driving distances in metres from each source to each destination.
 * Defaults to public OSRM (no signup). Optional OpenRouteService when
 * ROAD_DISTANCE_PROVIDER=openrouteservice and OPENROUTESERVICE_API_KEY are set.
 */
export async function drivingDistancesMetres(input: {
  sources: { lng: number; lat: number }[];
  destinations: { lng: number; lat: number }[];
}) {
  if (!input.sources.length || !input.destinations.length) {
    return [] as number[][];
  }
  if (input.destinations.length > DRIVING_MAX_DESTINATIONS) {
    throw new Error(
      `Driving-distance batch size is limited to ${DRIVING_MAX_DESTINATIONS} destinations.`,
    );
  }
  return drivingDistanceProvider() === "openrouteservice"
    ? drivingDistancesViaOrs(input)
    : drivingDistancesViaOsrm(input);
}

async function drivingDistancesViaOrs(input: {
  sources: { lng: number; lat: number }[];
  destinations: { lng: number; lat: number }[];
}) {
  const apiKey = openRouteServiceKey();
  const locations = [
    ...input.sources.map((point) => [point.lng, point.lat]),
    ...input.destinations.map((point) => [point.lng, point.lat]),
  ];
  const sources = input.sources.map((_, index) => index);
  const destinations = input.destinations.map(
    (_, index) => input.sources.length + index,
  );

  const response = await fetch(
    "https://api.openrouteservice.org/v2/matrix/driving-car",
    {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        locations,
        sources,
        destinations,
        metrics: ["distance"],
        units: "m",
      }),
      signal: AbortSignal.timeout(30000),
    },
  );

  const payload = (await response.json()) as MatrixResponse;
  if (!response.ok) {
    throw new Error(
      payload.error ||
        payload.message ||
        `OpenRouteService request failed (${response.status}).`,
    );
  }
  return normalizeMatrix(payload.distances);
}

async function drivingDistancesViaOsrm(input: {
  sources: { lng: number; lat: number }[];
  destinations: { lng: number; lat: number }[];
}) {
  const coords = [
    ...input.sources.map((point) => `${point.lng},${point.lat}`),
    ...input.destinations.map((point) => `${point.lng},${point.lat}`),
  ].join(";");
  const sources = input.sources.map((_, index) => index).join(";");
  const destinations = input.destinations
    .map((_, index) => input.sources.length + index)
    .join(";");
  const url =
    `${OSRM_BASE}/table/v1/driving/${coords}` +
    `?annotations=distance&sources=${sources}&destinations=${destinations}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(45000),
    });
  } catch {
    throw new Error(
      "Could not reach the public OSRM routing service. Try again in a moment, or enter road km manually.",
    );
  }
  const payload = (await response.json()) as MatrixResponse;
  if (!response.ok || (payload.code && payload.code !== "Ok")) {
    throw new Error(
      payload.message ||
        payload.error ||
        `OSRM road-distance request failed (${response.status}).`,
    );
  }
  return normalizeMatrix(payload.distances);
}

function normalizeMatrix(distances?: (number | null)[][]) {
  if (!distances?.length) {
    throw new Error("Road routing returned no driving distances.");
  }
  return distances.map((row) =>
    row.map((value) => {
      if (value === null || !Number.isFinite(value)) return Number.NaN;
      return value;
    }),
  );
}
