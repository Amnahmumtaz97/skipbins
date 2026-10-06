import {
  acceptedWaste,
  bins,
  isWasteAllowedForBin,
} from "@/lib/data/skip-bins";
import {
  defaultSettings,
  isIsoDate,
  type BinRate,
  type PortalSettings,
  type DateRule,
} from "@/lib/admin-config";
import { InputError } from "@/lib/server/request";
function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InputError("Check the submitted settings.");
  return value as Record<string, unknown>;
}
function str(value: unknown, max = 240) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    /[\u0000-\u001f]/.test(value)
  )
    throw new InputError("Check the text fields.");
  return value.trim();
}
function num(value: unknown, max = 100000, integer = false) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    throw new InputError("Check the numeric fields.");
  return value;
}
function bool(value: unknown) {
  if (typeof value !== "boolean")
    throw new InputError("Check the selected options.");
  return value;
}
export function validateRules(value: unknown): DateRule[] {
  if (!Array.isArray(value) || value.length > 100)
    throw new InputError("Use up to 100 date rules.");
  const rules = value.map((raw) => {
    const r = record(raw);
    if (!isIsoDate(r.start) || !isIsoDate(r.end) || r.start > r.end)
      throw new InputError("Enter a valid date range.");
    return {
      id: str(r.id, 80),
      start: r.start,
      end: r.end,
      blocked: bool(r.blocked),
      price: r.price === null ? null : num(r.price),
    };
  });
  if (new Set(rules.map((r) => r.id)).size !== rules.length)
    throw new InputError("Date rule identifiers must be unique.");
  for (let i = 0; i < rules.length; i++)
    for (let j = i + 1; j < rules.length; j++)
      if (rules[i].start <= rules[j].end && rules[j].start <= rules[i].end)
        throw new InputError(
          "Date overrides cannot overlap. Edit the existing rule instead.",
        );
  return rules;
}
export function validateRate(value: unknown): BinRate {
  const r = record(value);
  const binId = str(r.binId, 20),
    wasteId = str(r.wasteId, 20);
  if (
    !bins.some((b) => b.id === binId) ||
    !acceptedWaste.some((w) => w.id === wasteId) ||
    !isWasteAllowedForBin(binId, wasteId)
  )
    throw new InputError("Choose a supported bin and waste combination.");
  return {
    id: `${binId}-${wasteId}`,
    binId,
    wasteId,
    price: Math.round(num(r.price) * 100) / 100,
    stock: r.stock === null ? null : num(r.stock, 9999, true),
    turnaround: num(r.turnaround, 30, true),
    active: bool(r.active),
    includedTonnes: num(r.includedTonnes, 100),
    perTonne: num(r.perTonne),
    overrides: validateRules(r.overrides),
  };
}
export function validateSettings(value: unknown): PortalSettings {
  const s = record(value),
    p = record(s.profile);
  const profile = { ...defaultSettings.profile };
  for (const key of [
    "businessName",
    "abn",
    "contactName",
    "email",
    "phone",
    "mobile",
    "streetAddress",
    "suburb",
    "postcode",
    "bankName",
    "accountName",
    "bsb",
    "accountNumber",
  ] as const)
    profile[key] = str(p[key]);
  if (profile.businessName.length < 2)
    throw new InputError("Enter your business name.");
  if (profile.email && !/^\S+@\S+\.\S+$/.test(profile.email))
    throw new InputError("Enter a valid email.");
  if (profile.abn && !/^\d{11}$/.test(profile.abn.replace(/\s/g, "")))
    throw new InputError("ABN must have 11 digits.");
  if (profile.bsb && !/^\d{6}$/.test(profile.bsb.replace(/[-\s]/g, "")))
    throw new InputError("BSB must have six digits.");
  if (profile.accountNumber && !/^\d{4,12}$/.test(profile.accountNumber))
    throw new InputError("Check the bank account number.");
  if (!Array.isArray(p.hours) || p.hours.length !== 7)
    throw new InputError("Set operating hours for all seven days.");
  profile.hours = p.hours.map((raw, i) => {
    const h = record(raw),
      from = str(h.from, 5),
      to = str(h.to, 5),
      open = bool(h.open);
    if (
      !/^\d{2}:\d{2}$/.test(from) ||
      !/^\d{2}:\d{2}$/.test(to) ||
      Number(from.slice(0, 2)) > 23 ||
      Number(to.slice(0, 2)) > 23 ||
      Number(from.slice(3)) > 59 ||
      Number(to.slice(3)) > 59 ||
      (open && from >= to)
    )
      throw new InputError("Check opening and closing times.");
    return { day: defaultSettings.profile.hours[i].day, open, from, to };
  });
  if (!profile.hours.some((h) => h.open))
    throw new InputError("Open at least one day per week.");
  profile.publicHolidays = bool(p.publicHolidays);
  if (s.coverageMode !== "victoria" && s.coverageMode !== "selected")
    throw new InputError("Choose a coverage mode.");
  if (num(s.commissionPercent, 100) + num(s.stripeFeePercent, 100) > 100)
    throw new InputError(
      "Commission and processing fees cannot exceed 100% together.",
    );
  return {
    profile,
    coverageMode: s.coverageMode,
    commissionPercent: num(s.commissionPercent, 100),
    stripeFeePercent: num(s.stripeFeePercent, 100),
    blockedDates: validateRules(s.blockedDates).map((r) => ({
      ...r,
      blocked: true,
      price: null,
    })),
  };
}
