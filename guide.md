# SkipBins product guide

Quick reference for bins, waste types, pricing, and delivery zones.
Live admin values in the database override catalogue defaults below.

---

## Dispatch yards

Zones are measured from the **nearer** of:

| Yard | Postcode | Coords |
|------|----------|--------|
| Campbellfield | 3061 | -37.66627, 144.95676 |
| Laverton | 3028 | -37.87507, 144.77717 |

- Prefer **cached road km** (`suburb_road_distances` table when migrated).
- Until that migration is applied, distances are cached in a `bin_rates` row (`_road_distances`).
- If road km is missing, fall back to **straight-line (haversine)** km.
- **Compute road km** uses public **OSRM** (no signup) by default; about 40 suburbs per click.
- Manual entry: type km in Coverage → **Road km** column and press Enter / blur to save.
- Optional env: `OSRM_BASE_URL` (defaults to public demo). To force ORS later: `ROAD_DISTANCE_PROVIDER=openrouteservice` + `OPENROUTESERVICE_API_KEY`.

---

## Delivery zones (DB: `portal_settings.data`)

Editable in Admin → **Pricing & availability → Delivery zones**.

| Zone | Default cutoff | Fee field |
|------|----------------|-----------|
| Zone 1 | ≤ 25 km | `zoneDeliveryFees[1]` |
| Zone 2 | ≤ 50 km | `zoneDeliveryFees[2]` |
| Zone 3 | ≤ 75 km | `zoneDeliveryFees[3]` |
| Zone 4 | > Zone 3 cutoff | `zoneDeliveryFees[4]` |

Settings keys:

- `zoneMaxKm`: `{ 1, 2, 3 }` upper bounds (km)
- `zoneDeliveryFees`: `{ 1, 2, 3, 4 }` AUD fees added on top of bin hire

Quote total ≈ **base hire + hire extension + zone fee**.

---

## Bin catalogue (defaults)

Source of truth for dimensions/marketing: `lib/data/skip-bins.ts`.  
Live hire prices by bin × waste: DB table `bin_rates` (admin Pricing matrix).

| ID | Size | Dimensions (L × W × H) | Door | Default base | Heavy waste |
|----|------|------------------------|------|--------------|-------------|
| `2m3` | 2m³ | 1.8m × 1.5m × 0.9m | No walk-in | $350 | Yes |
| `3m3` | 3m³ | 2.4m × 1.5m × 0.9m | Walk-in | $450 | Yes |
| `4m3` | 4m³ | 3.2m × 1.5m × 0.9m | Walk-in | $550 | Yes |
| `6m3` | 6m³ | 3.6m × 1.5m × 1.2m | Walk-in | $750 | Yes (popular) |
| `8m3` | 8m³ | 3.7m × 1.6m × 1.4m | Walk-in | $850 | Yes |
| `9m3` | 9m³ | 4.0m × 1.6m × 1.5m | Walk-in | $950 | Yes |
| `10m3` | 10m³ | 4.1m × 1.6m × 1.9m | Walk-in | $1050 | **No** (`mixed`, `concrete`, `soil` blocked) |
| `12m3` | 12m³ | 5.0m × 2.0m × 1.5m | Walk-in | $1200 | **No** (`mixed`, `concrete`, `soil` blocked) |

Standard hire: up to **10 days**. Extensions: up to 7 extra days **$50**, 8–14 extra **$75**.

---

## Waste types

| ID | Label |
|----|--------|
| `general` | General Waste |
| `mixed` | Mixed Heavy Waste |
| `concrete` | Concrete / Bricks |
| `green` | Green Garden Waste |
| `soil` | Soil / Dirt |

Rate row id pattern: `{binId}-{wasteId}` (e.g. `6m3-general`).

---

## Where things live

| Data | Storage |
|------|---------|
| Bin dimensions / catalogue copy | `lib/data/skip-bins.ts` |
| Bin × waste prices, stock, overrides | `bin_rates` |
| Zone cutoffs + zone fees | `portal_settings` (`id = main`) |
| Serviceable suburbs | `service_suburbs` |
| Cached road km | `suburb_road_distances` |
| Migration for road cache | `supabase/road-distances-migration.sql` |

Key code:

- Zones: `lib/delivery-zones.ts`
- Road distance: `lib/server/road-distance.ts`, `lib/server/driving-distance.ts`
- Quotes: `lib/server/quote-service.ts`
- Admin UI: `components/admin/config-manager.tsx`

---

## Admin UX notes

- Pricing page: price matrix is **bin rows × waste columns** (list, not cards).
- Zone panel: one row per zone (km + fee) + suburb/postcode price tester.
- Coverage map: Include area / Exclude area (exclude does not remove dots when `preserveDots`).
- Edit bin dialog: does **not** close on outside click (Cancel / X / Esc only).
