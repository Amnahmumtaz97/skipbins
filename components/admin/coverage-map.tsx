"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Coverage } from "@/lib/admin-config";
import {
  DEFAULT_MAP_RANGE_KM,
  deliversTo,
  localitiesInRectangle,
  localitiesInView,
  retainShownLocalities,
  MAP_RANGES_KM,
  MELBOURNE_CENTER,
  samePlace,
} from "@/lib/coverage-selection";
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
  onApply: (rows: VicLocality[], active: boolean) => void;
};

export function CoverageMap({
  coverage,
  mode,
  disabled,
  preserveDots = false,
  onApply,
}: CoverageMapProps) {
  const mapNode = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markers = useRef<Map<string, import("leaflet").CircleMarker>>(new Map());
  const drawBox = useRef<import("leaflet").Rectangle | null>(null);
  const drawStart = useRef<import("leaflet").LatLng | null>(null);
  const rendererRef = useRef<import("leaflet").Canvas | null>(null);
  const [tool, setTool] = useState<Tool>("click");
  const [rangeKm, setRangeKm] = useState<number>(DEFAULT_MAP_RANGE_KM);
  const shownIds = useRef<Set<string>>(new Set());
  const shownRange = useRef<number | null>(null);
  const [draftCount, setDraftCount] = useState<number | null>(null);
  const toolRef = useRef(tool);
  const stateRef = useRef({ coverage, mode, disabled, onApply });
  const syncRef = useRef<(fit: boolean) => void>(() => {});
  toolRef.current = tool;
  stateRef.current = { coverage, mode, disabled, onApply };

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
      map.on("zoomend moveend", () => paint(map.getZoom()));
      mapRef.current = map;
      syncRef.current(true);
    });
    return () => {
      disposed = true;
      map?.remove();
      mapRef.current = null;
      markers.current.clear();
    };
  }, []);

  function paint(zoom = mapRef.current?.getZoom() ?? 10) {
    const map = mapRef.current;
    const radius = zoom >= 11 ? 7 : zoom >= 8 ? 5 : 3.5;
    const { coverage: rows, mode: coverageMode } = stateRef.current;
    const activeById = new Map(rows.map((row) => [row.id, row.active]));
    const bounds = map?.getBounds();
    const occupied: { x: number; y: number }[] = [];
    const placedNames = new Set<string>();
    for (const [id, marker] of markers.current) {
      const delivers = deliversTo(coverageMode, activeById.get(id));
      marker.setStyle({
        radius,
        fillColor: delivers ? "#65A30D" : "#FECACA",
        color: delivers ? "#3F6212" : "#F87171",
      });
      const tip = marker.getTooltip();
      if (!map || !bounds || !tip) continue;
      const latlng = marker.getLatLng();
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
    const shown = new Set(rows.map((row) => row.id));
    for (const [id, marker] of markers.current) {
      if (shown.has(id)) continue;
      marker.remove();
      markers.current.delete(id);
    }
    for (const locality of rows) {
      if (markers.current.has(locality.id)) continue;
      const marker = L.circleMarker([locality.lat, locality.lng], {
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
      L.latLngBounds(rows.map((row) => [row.lat, row.lng])),
      { padding: [28, 28], maxZoom: 12 },
    );
  };

  useEffect(() => {
    syncRef.current(true);
  }, [rangeKm]);

  useEffect(() => {
    syncRef.current(false);
  }, [coverage, mode]);

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
      localitiesInRectangle(visibleRef.current, boundsFrom(start, end)).length,
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
    const rows = localitiesInRectangle(visibleRef.current, boundsFrom(start, end));
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
            Green suburbs are in your delivery area. The map shows suburbs
            within {rangeKm} km of the Melbourne CBD. Names appear as you zoom in. Click a suburb to
            include or exclude it, or drag a box to do the same for every suburb inside it.
            {preserveDots ? " Excluded suburbs stay on the map." : ""}
          </p>
        </div>
        <strong>
          {delivered.toLocaleString("en-AU")} served · {visible.length.toLocaleString("en-AU")} on the map
        </strong>
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
