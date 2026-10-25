import "server-only";
import { searchSuburbs, type SuburbMatch } from "@/lib/suburb-search";

export type VictorianLocality = SuburbMatch;

export async function victorianLocalities(
  query: string,
): Promise<VictorianLocality[]> {
  if (query.trim().length < 2) return [];
  return searchSuburbs(query);
}
