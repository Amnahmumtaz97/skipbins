"use client";

import { useMemo } from "react";
import { CoverageMap } from "@/components/admin/coverage-map";
import type { Coverage } from "@/lib/admin-config";
import { vicLocalities, type VicLocality } from "@/lib/data/vic-localities";
import {
  formatSupplierPostcodes,
  parseSupplierPostcodes,
} from "@/lib/supplier-area";

export function SupplierCoverageMap({
  value,
  adminCoverage,
  sameAsAdmin,
  onChange,
}: {
  value: string;
  adminCoverage: Coverage[];
  sameAsAdmin: boolean;
  onChange: (value: string) => void;
}) {
  const coverage = useMemo(() => {
    if (sameAsAdmin) return adminCoverage;
    const enabled = new Set(parseSupplierPostcodes(value));
    const adminEnabled = new Set(
      adminCoverage.filter((row) => row.active).map((row) => row.postcode),
    );
    const represented = new Set(adminCoverage.map((row) => row.postcode));
    const rows = adminCoverage.map((row) => ({
      ...row,
      active: enabled.has(row.postcode)
        ? adminEnabled.has(row.postcode)
          ? row.active
          : true
        : false,
    }));
    const seen = new Set(rows.map((row) => row.id));
    for (const locality of vicLocalities) {
      if (!enabled.has(locality.postcode) || represented.has(locality.postcode))
        continue;
      if (seen.has(locality.id)) continue;
      seen.add(locality.id);
      rows.push({
        id: locality.id,
        suburb: locality.suburb,
        postcode: locality.postcode,
        state: "VIC",
        active: true,
      });
    }
    return rows;
  }, [adminCoverage, sameAsAdmin, value]);

  function apply(rows: VicLocality[], active: boolean) {
    const next = new Set(parseSupplierPostcodes(value));
    for (const row of rows) {
      if (active) next.add(row.postcode);
      else next.delete(row.postcode);
    }
    onChange(formatSupplierPostcodes([...next]));
  }

  return (
    <CoverageMap
      coverage={coverage}
      mode="selected"
      disabled={false}
      preserveDots
      onApply={apply}
    />
  );
}
