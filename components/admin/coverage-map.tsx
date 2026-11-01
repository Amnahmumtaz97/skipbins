"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Coverage } from "@/lib/admin-config";
import {
  DEFAULT_MAP_RANGE_KM,
  deliversTo,
  localitiesInRectangle,
  localitiesInView,
  markerPositions,
  retainShownLocalities,
  MAP_RANGES_KM,
  MELBOURNE_CENTER,
  samePlace,
} from "@/lib/coverage-selection";
import {
  defaultZoneMaxKm,
  deliveryZoneForPoint,
  deliveryZoneForSuburb,
  DISPATCH_SUBURBS,
  DELIVERY_ZONES,
  zoneLabels,
  ZONE_MARKER_COLORS,
  ZONE_SHORT_LABELS,
  type ZoneMaxKm,
} from "@/lib/delivery-zones";
import {
  vicLocalities,
  type VicLocality,
} from "@/lib/data/vic-localities";

type Tool = "click" | "include" | "exclude";

function suburbName(value: string) {
  return value
    .toLowerCase()
    .replace(/(^|[\s'-])(\w)/g, (_match, separator: string, letter: string) => separator + letter.toUpperCase());
}

type CoverageMapProps = {
  coverage: Coverage[];
  mode: "victoria" | "selected";
  disabled: boolean;
  preserveDots?: boolean;
  zoneMaxKm?: ZoneMaxKm;
  onApply: (rows: VicLocality[], active: boolean) => void;
};

export function CoverageMap({
  coverage,
  mode,
  disabled,
  preserveDots = false,
  zoneMaxKm = defaultZoneMaxKm,
  onApply,
}: CoverageMapProps) {
  const mapNode = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markers = useRef<Map<string, import("leaflet").CircleMarker>>(new Map());
  const depotMarkers = useRef<import("leaflet").CircleMarker[]>([]);
  const drawBox = useRef<import("leaflet").Rectangle | null>(null);
  const drawStart = useRef<import("leaflet").LatLng | null>(null);
  const rendererRef = useRef<import("leaflet").Canvas | null>(null);
  const [tool, setTool] = useState<Tool>("click");
  const [rangeKm, setRangeKm] = useState<number>(DEFAULT_MAP_RANGE_KM);
  const shownIds = useRef<Set<string>>(new Set());
  const shownRange = useRef<number | null>(null);
  const positionsRef = useRef(new Map<string, { lat: number; lng: number }>());
  const sourcePoints = useRef(new Map<string, { lat: number; lng: number }>());
  const [draftCount, setDraftCount] = useState<number | null>(null);
  const toolRef = useRef(tool);
  const stateRef = useRef({ coverage, mode, disabled, onApply, zoneMaxKm });
  const syncRef = useRef<(fit: boolean) => void>(() => {});
  toolRef.current = tool;
  stateRef.current = { coverage, mode, disabled, onApply, zoneMaxKm };
  const labels = zoneLabels(zoneMaxKm);

  const ranged = localitiesInView(vicLocalities, rangeKm);
  if (preserveDots && shownRange.current !== rangeKm) {
    shownRange.current = rangeKm;
    shownIds.current = new Set();
  }
  const visible = preserveDots
    ? retainShownLocalities(shownIds.current, ranged, vicLocalities)
    : ranged;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    const node = mapNode.current;
    if (!node || mapRef.current) return;
    let disposed = false;
    let map: import("leaflet").Map;
    void import("leaflet").then((L) => {
      if (disposed || !node) return;
      leafletRef.current = L;
      map = L.map(node, {
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true,
        maxZoom: 16,
      }).setView([MELBOURNE_CENTER.lat, MELBOURNE_CENTER.lng], 10);
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 16,
          attribution:
            'Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, and the GIS user community',
        },
      ).addTo(map);
      rendererRef.current = L.canvas({ padding: 0.5 });
      depotMarkers.current = DISPATCH_SUBURBS.map((depot) =>
        L.circleMarker([depot.lat, depot.lng], {
          radius: 9,
          weight: 2,
          color: "#0B3B24",
          fillColor: "#C7F34A",
          fillOpacity: 1,
          interactive: false,
        })
          .bindTooltip(`${depot.name} dispatch`, {
            direction: "top",
            offset: [0, -6],
            className: "coverage-suburb-label",
            permanent: true,
            opacity: 1,
          })
          .addTo(map),
      );
      map.on("zoomend moveend", () => paint(map.getZoom()));
      mapRef.current = map;
      syncRef.current(true);
    });
    return () => {
      disposed = true;
      map?.remove();
      mapRef.current = null;
      markers.current.clear();
      depotMarkers.current = [];
    };
  }, []);

  function paint(zoom = mapRef.current?.getZoom() ?? 10) {
    const map = mapRef.current;
    const radius = zoom >= 11 ? 7 : zoom >= 8 ? 5 : 3.5;
    const { coverage: rows, mode: coverageMode, zoneMaxKm: limits } =
      stateRef.current;
    const coverageById = new Map(rows.map((row) => [row.id, row]));
    const bounds = map?.getBounds();
    const occupied: { x: number; y: number }[] = [];
    const placedNames = new Set<string>();
    for (const [id, marker] of markers.current) {
      const coverageRow = coverageById.get(id);
      const delivers = deliversTo(coverageMode, coverageRow?.active);
      const latlng = marker.getLatLng();
      const zone =
        coverageRow != null
          ? (deliveryZoneForSuburb(
              coverageRow.suburb,
              coverageRow.postcode,
              limits,
              coverageRow.roadKm,
            ) ??
            deliveryZoneForPoint(
              sourcePoints.current.get(id) ?? latlng,
              limits,
            ))
          : deliveryZoneForPoint(
              sourcePoints.current.get(id) ?? latlng,
              limits,
            );
      const colors = delivers
        ? ZONE_MARKER_COLORS[zone]
        : { fill: "#FECACA", stroke: "#F87171" };
      marker.setStyle({
        radius,
        fillColor: colors.fill,
        color: colors.stroke,
      });
      const tip = marker.getTooltip();
      if (!map || !bounds || !tip) continue;
      const name = tip.getContent();
      let show = false;
      if (typeof name === "string" && bounds.contains(latlng) && zoom >= 10 && !placedNames.has(name)) {
        const point = map.latLngToContainerPoint(latlng);
        const blocked = occupied.some(
          (item) => Math.hypot(item.x - point.x, item.y - point.y) < 58,
        );
        if (!blocked) {
          occupied.push(point);
          placedNames.add(name);
          show = true;
        }
      }
      tip.options.permanent = show;
      if (show) marker.openTooltip();
      else marker.closeTooltip();
    }
  }

  syncRef.current = (fit: boolean) => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const renderer = rendererRef.current;
    if (!L || !map || !renderer) return;
    const rows = visibleRef.current;
    const positions = markerPositions(rows);
    positionsRef.current = positions;
    const shown = new Set(rows.map((row) => row.id));
    for (const [id, marker] of markers.current) {
      if (shown.has(id)) continue;
      marker.remove();
      markers.current.delete(id);
      sourcePoints.current.delete(id);
    }
    for (const locality of rows) {
      const at = positions.get(locality.id) ?? locality;
      sourcePoints.current.set(locality.id, {
        lat: locality.lat,
        lng: locality.lng,
      });
      const existing = markers.current.get(locality.id);
      if (existing) {
        const current = existing.getLatLng();
        if (
          Math.abs(current.lat - at.lat) > 1e-7 ||
          Math.abs(current.lng - at.lng) > 1e-7
        ) {
          existing.setLatLng([at.lat, at.lng]);
        }
        continue;
      }
      const marker = L.circleMarker([at.lat, at.lng], {
        renderer,
        radius: 4,
        weight: 1,
        color: "#F87171",
        fillColor: "#FECACA",
        fillOpacity: 0.92,
      }).addTo(map);
      marker.bindTooltip(suburbName(locality.suburb), {
        direction: "top",
        offset: [0, -4],
        className: "coverage-suburb-label",
        opacity: 1,
      });
      marker.on("click", () => {
        const current = stateRef.current;
        if (current.disabled || toolRef.current !== "click") return;
        const group = samePlace(locality, vicLocalities);
        const active = !group.every((row) =>
          deliversTo(
            current.mode,
            current.coverage.find((item) => item.id === row.id)?.active,
          ),
        );
        current.onApply(group, active);
      });
      markers.current.set(locality.id, marker);
    }
    paint(map.getZoom());
    if (!fit || !rows.length) return;
    map.invalidateSize();
    map.fitBounds(
      L.latLngBounds(
        rows.map((row) => {
          const at = positions.get(row.id) ?? row;
          return [at.lat, at.lng];
        }),
      ),
      { padding: [28, 28], maxZoom: 12 },
    );
  };

  useEffect(() => {
    syncRef.current(true);
  }, [rangeKm]);

  useEffect(() => {
    syncRef.current(false);
  }, [coverage, mode, zoneMaxKm]);

  function boundsFrom(start: import("leaflet").LatLng, end: import("leaflet").LatLng) {
    return {
      south: start.lat,
      north: end.lat,
      west: start.lng,
      east: end.lng,
    };
  }

  function startDraw(event: React.PointerEvent<HTMLDivElement>) {
    const map = mapRef.current;
    if (!map || disabled || tool === "click") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = latLngFrom(event);
    drawStart.current = start;
    const L = leafletRef.current;
    if (!L) return;
    drawBox.current?.remove();
    drawBox.current = L.rectangle(L.latLngBounds(start, start), {
        color: tool === "exclude" ? "#B45309" : "#14532D",
        weight: 1.5,
        fillColor: tool === "exclude" ? "#F59E0B" : "#65A30D",
        fillOpacity: 0.18,
    }).addTo(map);
  }

  function latLngFrom(event: React.PointerEvent<HTMLDivElement>) {
    const map = mapRef.current;
    const rect = map!.getContainer().getBoundingClientRect();
    return map!.containerPointToLatLng([
      event.clientX - rect.left,
      event.clientY - rect.top,
    ]);
  }

  function moveDraw(event: React.PointerEvent<HTMLDivElement>) {
    const start = drawStart.current;
    const map = mapRef.current;
    if (!start || !map || !drawBox.current) return;
    const end = latLngFrom(event);
    const L = leafletRef.current;
    if (L) drawBox.current?.setBounds(L.latLngBounds(start, end));
    setDraftCount(
      localitiesInRectangle(
        visibleRef.current,
        boundsFrom(start, end),
        positionsRef.current,
      ).length,
    );
  }

  function endDraw(event: React.PointerEvent<HTMLDivElement>) {
    const start = drawStart.current;
    const map = mapRef.current;
    if (!start || !map) return;
    const end = latLngFrom(event);
    drawStart.current = null;
    drawBox.current?.remove();
    drawBox.current = null;
    setDraftCount(null);
    if (disabled) return;
    const rows = localitiesInRectangle(
      visibleRef.current,
      boundsFrom(start, end),
      positionsRef.current,
    );
    if (rows.length) onApply(rows, tool === "include");
  }

  const activeById = new Map(coverage.map((row) => [row.id, row.active]));
  const delivered = vicLocalities.filter((row) =>
    deliversTo(mode, activeById.get(row.id)),
  ).length;

  return (
    <section className="portal-panel coverage-map-panel">
      <div className="coverage-map-heading">
        <div>
          <h2>Map selection</h2>
          <p>
            Included suburbs are coloured by delivery zone using stored road km
            when available, otherwise straight-line from Campbellfield and
            Laverton. {labels[1]}, {labels[2]}, {labels[3]}. The map shows
            suburbs within {rangeKm} km of Melbourne. Click a suburb to include
            or exclude it, or drag a box to do the same for every suburb inside
            it.
            {preserveDots ? " Excluded suburbs stay on the map." : ""}
          </p>
        </div>
        <strong>
          {delivered.toLocaleString("en-AU")} served · {visible.length.toLocaleString("en-AU")} on the map
        </strong>
      </div>
      <div className="coverage-zone-legend" aria-label="Delivery zone colours">
        {DELIVERY_ZONES.map((zone) => (
          <span key={zone}>
            <i style={{ background: ZONE_MARKER_COLORS[zone].fill }} />
            {ZONE_SHORT_LABELS[zone]}
          </span>
        ))}
        <span>
          <i style={{ background: "#C7F34A", borderColor: "#0B3B24" }} />
          Dispatch yard
        </span>
        <span>
          <i style={{ background: "#FECACA" }} />
          Excluded
        </span>
      </div>
      <div className="coverage-tools" role="group" aria-label="Map range">
        <span className="coverage-range-label">Show within</span>
        {MAP_RANGES_KM.map((km) => (
          <button
            key={km}
            type="button"
            className={rangeKm === km ? "portal-button" : "portal-button-secondary"}
            onClick={() => {
              setRangeKm(km);
              if (km === rangeKm) syncRef.current(true);
            }}
          >
            {km} km
          </button>
        ))}
      </div>
      <div className="coverage-tools" role="group" aria-label="Map selection tools">
        <button
          type="button"
          className={tool === "click" ? "portal-button" : "portal-button-secondary"}
          onClick={() => setTool("click")}
        >
          Click suburb
        </button>
        <button
          type="button"
          className={tool === "include" ? "portal-button" : "portal-button-secondary"}
          title="Drag a box to include every suburb inside it"
          onClick={() => setTool("include")}
        >
          Include area
        </button>
        <button
          type="button"
          className={tool === "exclude" ? "portal-button" : "portal-button-secondary"}
          title="Drag a box to exclude every suburb inside it"
          onClick={() => setTool("exclude")}
        >
          Exclude area
        </button>
      </div>
      <div className={`coverage-map${disabled ? " is-busy" : ""}`}>
        <div ref={mapNode} className="coverage-canvas" />
        {tool !== "click" ? (
          <div
            className="coverage-draw"
            onPointerDown={startDraw}
            onPointerMove={moveDraw}
            onPointerUp={endDraw}
            onPointerCancel={endDraw}
          />
        ) : null}
        {draftCount !== null ? (
          <p className="coverage-draft">{draftCount.toLocaleString("en-AU")} suburbs in this box</p>
        ) : null}
      </div>
    </section>
  );
}
