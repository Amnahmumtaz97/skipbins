"use client";

import { useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { bins, acceptedWaste } from "@/lib/data/skip-bins";
import type { BinRate, Coverage } from "@/lib/admin-config";
import { money } from "@/components/admin/portal-ui";
import type { SuburbMatch } from "@/lib/suburb-search";
import {
  deliveryZoneForSuburb,
  distanceModeLabel,
  findLocalityCoords,
  nearestDispatch,
  ZONE_MARKER_COLORS,
  ZONE_SHORT_LABELS,
  zoneDeliveryFee,
  type ZoneDeliveryFees,
  type ZoneMaxKm,
} from "@/lib/delivery-zones";

type Props = {
  zoneMaxKm: ZoneMaxKm;
  zoneDeliveryFees: ZoneDeliveryFees;
  rates: BinRate[];
  coverage: Coverage[];
};

type TesterMatch = SuburbMatch & { active: boolean };

export function ZonePriceTester({
  zoneMaxKm,
  zoneDeliveryFees,
  rates,
  coverage,
}: Props) {
  const id = useId();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SuburbMatch | null>(null);
  const [wasteId, setWasteId] = useState(acceptedWaste[0]?.id ?? "general");
  const [showExcluded, setShowExcluded] = useState(false);

  const searchable = useMemo(() => {
    const seen = new Set<string>();
    const rows: TesterMatch[] = [];
    for (const row of coverage) {
      if (!showExcluded && !row.active) continue;
      const suburb = row.suburb.trim().toUpperCase();
      const key = `${row.postcode}-${suburb}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        suburb,
        postcode: row.postcode,
        state: "VIC",
        active: row.active,
      });
    }
    return rows.sort(
      (a, b) =>
        a.suburb.localeCompare(b.suburb) ||
        a.postcode.localeCompare(b.postcode),
    );
  }, [coverage, showExcluded]);

  const matches = useMemo(() => {
    const term = text.trim().toUpperCase();
    if (term.length < 2) return [] as TesterMatch[];
    const byPostcode = /^\d+$/.test(term);
    const rank = (row: TesterMatch) => {
      if (row.suburb === term || row.postcode === term) return 0;
      if (row.suburb.startsWith(term) || row.postcode.startsWith(term)) return 1;
      return 2;
    };
    return searchable
      .filter((row) =>
        byPostcode
          ? row.postcode.startsWith(term)
          : row.suburb.includes(term),
      )
      .sort(
        (a, b) =>
          rank(a) - rank(b) ||
          a.suburb.localeCompare(b.suburb) ||
          a.postcode.localeCompare(b.postcode),
      )
      .slice(0, 8);
  }, [searchable, text]);

  const show = open && matches.length > 0;

  const quote = useMemo(() => {
    if (!selected) return null;
    const locality = findLocalityCoords(selected.suburb, selected.postcode);
    if (!locality) return null;
    const coverageRow = coverage.find(
      (row) =>
        row.postcode === selected.postcode &&
        row.suburb.toUpperCase() === selected.suburb.toUpperCase(),
    );
    const roadKm = coverageRow?.roadKm ?? null;
    const nearest = nearestDispatch(locality);
    const zone = deliveryZoneForSuburb(
      selected.suburb,
      selected.postcode,
      zoneMaxKm,
      roadKm,
    );
    if (!zone) return null;
    const fee = zoneDeliveryFee(zone, zoneDeliveryFees);
    const covered = coverage.some(
      (row) =>
        row.active &&
        row.postcode === selected.postcode &&
        row.suburb.toUpperCase() === selected.suburb.toUpperCase(),
    );
    const coveredByPostcode = coverage.some(
      (row) => row.active && row.postcode === selected.postcode,
    );
    return {
      nearest,
      zone,
      fee,
      roadKm,
      covered: covered || coveredByPostcode,
    };
  }, [coverage, selected, zoneDeliveryFees, zoneMaxKm]);

  const previewRates = rates
    .filter((rate) => rate.wasteId === wasteId && rate.active)
    .sort(
      (a, b) =>
        bins.findIndex((bin) => bin.id === a.binId) -
        bins.findIndex((bin) => bin.id === b.binId),
    );

  function choose(row: SuburbMatch) {
    setSelected(row);
    setText(`${titleCase(row.suburb)}, VIC ${row.postcode}`);
    setOpen(false);
  }

  return (
    <div className="portal-zone-tester">
      <div className="portal-zone-tester-head">
        <h3>Test zone pricing</h3>
        <p>
          Search included suburbs by name or postcode. Uses cached road km when
          available, otherwise straight-line.
        </p>
      </div>
      <div className="portal-zone-tester-search">
        <label className="portal-field">
          <span>Suburb or postcode</span>
          <div className="portal-zone-tester-input">
            <Search size={15} aria-hidden="true" />
            <input
              id={id}
              value={text}
              autoComplete="off"
              placeholder={
                showExcluded
                  ? "Search included or excluded…"
                  : "Search included suburbs…"
              }
              role="combobox"
              aria-expanded={show}
              aria-controls={`${id}-results`}
              onChange={(event) => {
                setText(event.target.value);
                setSelected(null);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setOpen(false)}
            />
            {show ? (
              <ul
                id={`${id}-results`}
                role="listbox"
                className="portal-zone-tester-results"
              >
                {matches.map((row) => (
                  <li key={`${row.postcode}-${row.suburb}`}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => choose(row)}
                    >
                      <strong>
                        {titleCase(row.suburb)}, VIC {row.postcode}
                      </strong>
                      {!row.active ? <em>Excluded</em> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </label>
        <label className="portal-check portal-zone-tester-excluded">
          <input
            type="checkbox"
            checked={showExcluded}
            onChange={(event) => {
              setShowExcluded(event.target.checked);
              setOpen(true);
            }}
          />
          Show excluded
        </label>
      </div>

      {selected && quote ? (
        <div className="portal-zone-tester-result">
          <div className="portal-zone-tester-summary">
            <div>
              <span>Location</span>
              <strong>
                {titleCase(selected.suburb)}, VIC {selected.postcode}
              </strong>
            </div>
            <div>
              <span>Distance</span>
              <strong>
                {typeof quote.roadKm === "number"
                  ? `${quote.roadKm.toFixed(1)} km road`
                  : `${quote.nearest.km.toFixed(1)} km straight-line`}
              </strong>
              <small className="portal-zone-tester-note">
                {distanceModeLabel(quote.roadKm)}
                {typeof quote.roadKm !== "number"
                  ? ` · nearest yard ${quote.nearest.depot.name}`
                  : ""}
              </small>
            </div>
            <div>
              <span>Zone</span>
              <strong className="portal-zone-tester-zone">
                <i
                  style={{
                    background: ZONE_MARKER_COLORS[quote.zone].fill,
                    boxShadow: `0 0 0 1px ${ZONE_MARKER_COLORS[quote.zone].stroke}`,
                  }}
                />
                {ZONE_SHORT_LABELS[quote.zone]}
              </strong>
            </div>
            <div>
              <span>Zone fee</span>
              <strong>{money(quote.fee * 100)}</strong>
            </div>
            <div>
              <span>Coverage</span>
              <strong>{quote.covered ? "Included" : "Not in selected area"}</strong>
            </div>
          </div>

          <label className="portal-field">
            <span>Preview waste type</span>
            <select
              value={wasteId}
              onChange={(event) => setWasteId(event.target.value)}
            >
              {acceptedWaste.map((waste) => (
                <option key={waste.id} value={waste.id}>
                  {waste.label}
                </option>
              ))}
            </select>
          </label>

          {previewRates.length ? (
            <div className="portal-table-wrap portal-zone-tester-prices">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Bin</th>
                    <th>Base hire</th>
                    <th>Zone fee</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRates.map((rate) => (
                    <tr key={rate.id}>
                      <td>
                        <strong>
                          {bins.find((bin) => bin.id === rate.binId)?.size ??
                            rate.binId}
                        </strong>
                      </td>
                      <td>{money(rate.price * 100)}</td>
                      <td>{money(quote.fee * 100)}</td>
                      <td>
                        <strong>{money((rate.price + quote.fee) * 100)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="portal-help">
              No active bin prices for this waste type.
            </p>
          )}
        </div>
      ) : selected ? (
        <p className="portal-help">
          Could not resolve coordinates for that suburb.
        </p>
      ) : null}
    </div>
  );
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/(^|[\s'-])(\w)/g, (_match, separator: string, letter: string) =>
      separator + letter.toUpperCase(),
    );
}
