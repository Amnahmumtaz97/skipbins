"use client";

import dynamic from "next/dynamic";
import { useId, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Coverage } from "@/lib/admin-config";
import { searchSuburbs } from "@/lib/suburb-search";
import {
  formatSupplierPostcodes,
  parseSupplierPostcodes,
  supplierUsesAdminArea,
} from "@/lib/supplier-area";

const SupplierCoverageMap = dynamic(
  () =>
    import("@/components/supplier/supplier-coverage-map").then(
      (mod) => mod.SupplierCoverageMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="coverage-map coverage-map-loading">Loading map…</div>
    ),
  },
);

export function SupplierPostcodePicker({
  value,
  adminPostcodes,
  adminCoverage,
  onChange,
}: {
  value: string;
  adminPostcodes: string[];
  adminCoverage: Coverage[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const source = draft ?? value;
  const own = parseSupplierPostcodes(source);
  const usingDefault = supplierUsesAdminArea(source);
  const codes = usingDefault ? adminPostcodes : own;

  function update(next: string) {
    setDraft(next);
    onChange(next);
  }
  const matches = useMemo(() => {
    const term = text.trim();
    if (!term) return [];
    const seen = new Set<string>();
    const found = [];
    for (const row of searchSuburbs(term)) {
      if (seen.has(row.postcode) || codes.includes(row.postcode)) continue;
      seen.add(row.postcode);
      found.push(row);
      if (found.length === 8) break;
    }
    return found;
  }, [codes, text]);
  const show = open && matches.length > 0;

  function add(postcode: string) {
    update(formatSupplierPostcodes([...codes, postcode]));
    setText("");
    setOpen(false);
  }

  return (
    <div className="supplier-field supplier-wide">
      <SupplierCoverageMap
        value={formatSupplierPostcodes(codes)}
        adminCoverage={adminCoverage}
        sameAsAdmin={usingDefault}
        onChange={update}
      />
      <span>Your postcodes</span>
      <div className="supplier-postcode-picker">
        <input
          id={id}
          value={text}
          autoComplete="off"
          placeholder="Search a suburb or postcode to add"
          role="combobox"
          aria-expanded={show}
          aria-controls={`${id}-results`}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        />
        <ul id={`${id}-results`} role="listbox" hidden={!show}>
          {matches.map((row) => (
            <li key={row.postcode}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => add(row.postcode)}
              >
                {row.suburb}, VIC {row.postcode}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {codes.length ? (
        <ul className="supplier-postcode-list">
          {codes.map((code) => (
            <li key={code}>
              <span>{code}</span>
              <button
                type="button"
                aria-label={`Remove ${code}`}
                onClick={() =>
                  update(formatSupplierPostcodes(codes.filter((item) => item !== code)))
                }
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>
          {usingDefault
            ? "No postcodes are included in the admin portal yet."
            : "No postcodes in this supplier’s area."}
        </p>
      )}
      <p>
        {usingDefault
          ? "This is the admin delivery area. The map works the same way. Turning suburbs on or off overrides the postcodes for this supplier. Save to keep the change."
          : "These postcodes replace the admin area for this supplier. Save the profile to keep the change."}
      </p>
    </div>
  );
}
