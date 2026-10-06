import {
  bins,
  acceptedWaste,
  isWasteAllowedForBin,
} from "@/lib/data/skip-bins";
export type DateRule = {
  id: string;
  start: string;
  end: string;
  blocked: boolean;
  price: number | null;
};
export type BinRate = {
  id: string;
  binId: string;
  wasteId: string;
  price: number;
  stock: number | null;
  turnaround: number;
  active: boolean;
  includedTonnes: number;
  perTonne: number;
  overrides: DateRule[];
};
export type Coverage = {
  id: string;
  suburb: string;
  postcode: string;
  state: "VIC";
  active: boolean;
};
export type BusinessProfile = {
  businessName: string;
  abn: string;
  contactName: string;
  email: string;
  phone: string;
  mobile: string;
  streetAddress: string;
  suburb: string;
  postcode: string;
  bankName: string;
  accountName: string;
  bsb: string;
  accountNumber: string;
  publicHolidays: boolean;
  hours: { day: string; open: boolean; from: string; to: string }[];
};
export type PortalSettings = {
  profile: BusinessProfile;
  commissionPercent: number;
  stripeFeePercent: number;
  coverageMode: "victoria" | "selected";
  blockedDates: DateRule[];
};
export const defaultSettings: PortalSettings = {
  profile: {
    businessName: "Premium Skip Bins",
    abn: "",
    contactName: "",
    email: "",
    phone: "",
    mobile: "",
    streetAddress: "",
    suburb: "",
    postcode: "",
    bankName: "",
    accountName: "",
    bsb: "",
    accountNumber: "",
    publicHolidays: false,
    hours: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ].map((day, i) => ({ day, open: i < 6, from: "07:00", to: "17:00" })),
  },
  commissionPercent: 0,
  stripeFeePercent: 0,
  coverageMode: "victoria",
  blockedDates: [],
};
export function defaultRates(): BinRate[] {
  return acceptedWaste.flatMap((waste) =>
    bins
      .filter((bin) => isWasteAllowedForBin(bin.id, waste.id))
      .map((bin) => ({
        id: `${bin.id}-${waste.id}`,
        binId: bin.id,
        wasteId: waste.id,
        price: Number(bin.price.replace(/[^0-9.]/g, "")),
        stock: null,
        turnaround: 1,
        active: true,
        includedTonnes: 0,
        perTonne: 0,
        overrides: [],
      })),
  );
}
export function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function rateForDate(
  rate: BinRate,
  date?: string,
): { available: boolean; price: number } {
  const rule = date
    ? rate.overrides.find((r) => r.start <= date && r.end >= date)
    : undefined;
  return {
    available: rate.active && !rule?.blocked,
    price: rule?.price ?? rate.price,
  };
}
export function exportCsv(
  filename: string,
  headings: string[],
  rows: (string | number)[][],
) {
  const escape = (v: string | number) =>
    '"' +
    String(v)
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replace(/"/g, '""') +
    '"';
  const blob = new Blob(
    [
      "\uFEFF" +
        [headings, ...rows]
          .map((row) => row.map(escape).join(","))
          .join("\r\n"),
    ],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
export function money(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}
export function melbourneDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("en-CA", {
        timeZone: "Australia/Melbourne",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
}
