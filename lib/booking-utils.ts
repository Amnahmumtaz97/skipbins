import { acceptedWaste, getBinBySizeOrId } from "@/lib/data/skip-bins";
import type { HirePeriod } from "@/types/skip-bin";


export function todayIsoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function isSundayIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getDay() === 0;
}

export function addDaysIso(value: string, days: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function tomorrowIsoDate() {
  return addDaysIso(todayIsoDate(), 1);
}

export function earliestPickupDate(deliveryDate: string) {
  return deliveryDate;
}

export function standardPickupDate(deliveryDate: string) {
  const tenthDay = addDaysIso(deliveryDate, 10);
  return isSundayIso(tenthDay) ? addDaysIso(tenthDay, -1) : tenthDay;
}

export function maxPickupDate(deliveryDate: string) {
  return addDaysIso(deliveryDate, 24);
}

export function daysAfterDelivery(deliveryDate: string, pickupDate: string) {
  const start = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deliveryDate);
  const end = /^(\d{4})-(\d{2})-(\d{2})$/.exec(pickupDate);
  if (!start || !end) return Number.NaN;
  const from = Date.UTC(Number(start[1]), Number(start[2]) - 1, Number(start[3]));
  const to = Date.UTC(Number(end[1]), Number(end[2]) - 1, Number(end[3]));
  return Math.round((to - from) / 86_400_000);
}

export function hireForDates(deliveryDate: string, pickupDate: string) {
  const days = daysAfterDelivery(deliveryDate, pickupDate);
  if (!Number.isFinite(days) || days < 0 || days > 24) return null;
  if (days <= 10)
    return { period: "Standard (10 days)" as HirePeriod, fee: 0 };
  if (days <= 17)
    return { period: "Extended (7 days)" as HirePeriod, fee: 50 };
  return { period: "Extended (14 days)" as HirePeriod, fee: 75 };
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


