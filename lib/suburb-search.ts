import { vicLocalities } from "@/lib/data/vic-localities";

export type SuburbMatch = {
  suburb: string;
  postcode: string;
  state: "VIC";
};

export function searchSuburbs(query: string): SuburbMatch[] {
  const term = query.trim().toUpperCase();
  if (!term) return [];
  const byPostcode = /^\d+$/.test(term);
  return vicLocalities
    .filter((row) =>
      byPostcode ? row.postcode.startsWith(term) : row.suburb.includes(term),
    )
    .sort((a, b) => {
      const rank = (row: { suburb: string; postcode: string }) => {
        if (row.suburb === term || row.postcode === term) return 0;
        if (row.suburb.startsWith(term) || row.postcode.startsWith(term)) return 1;
        return 2;
      };
      return (
        rank(a) - rank(b) ||
        a.suburb.localeCompare(b.suburb) ||
        a.postcode.localeCompare(b.postcode)
      );
    })
    .map(({ suburb, postcode }) => ({
      suburb,
      postcode,
      state: "VIC" as const,
    }));
}
