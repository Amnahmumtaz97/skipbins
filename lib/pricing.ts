import { getBinBySizeOrId } from "@/lib/data/skip-bins";
import type { HirePeriod } from "@/types/skip-bin";

const hireUplift: Record<HirePeriod, number> = {
  "Standard (7 days)": 0,
  "Extended (14 days)": 0.4,
  "Long-term (ask us)": 0.4,
};

export function parseBinPrice(price: string) {
  const amount = Number(price.replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) ? amount : null;
}

export function quoteTotal(size?: string | null, hirePeriod?: string | null) {
  const bin = getBinBySizeOrId(size);
  if (!bin) return null;
  const base = parseBinPrice(bin.price);
  if (base == null) return null;
  const uplift = hirePeriod && hirePeriod in hireUplift ? hireUplift[hirePeriod as HirePeriod] : 0;
  return Math.round(base * (1 + uplift));
}
