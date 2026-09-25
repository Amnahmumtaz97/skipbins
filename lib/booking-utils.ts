import { acceptedWaste, getBinBySizeOrId } from "@/lib/data/skip-bins";


export function todayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}


export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidAuPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^1800\d{6}$/.test(digits) || /^13\d{8}$/.test(digits) || /^1300\d{6}$/.test(digits)) return true;
  if (/^61[2-478]\d{8}$/.test(digits)) return true;
  if (/^0[2-478]\d{8}$/.test(digits)) return true;
  return false;
}

export function resolveWasteId(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "";
  const first = raw.split(",")[0]?.trim();
  if (!first) return "";
  return acceptedWaste.find((waste) => waste.id === first || waste.label === first)?.id ?? "";
}

export function resolveBinId(value?: string | null) {
  return getBinBySizeOrId(value)?.id ?? "";
}


