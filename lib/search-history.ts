export type FrequentPostcode = {
  postcode: string;
  suburb: string;
  state: string;
};

export type FrequentAddress = {
  street: string;
  label: string;
  postcode: string;
};

type StoredEntry<T> = {
  id: string;
  value: T;
  count: number;
  lastUsed: number;
};

const POSTCODE_KEY = "skipbins-frequent-postcodes";
const ADDRESS_KEY = "skipbins-frequent-addresses";
const MAX_STORED = 20;
const MAX_SUGGESTIONS = 5;

function readEntries<T>(key: string): StoredEntry<T>[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is StoredEntry<T> => Boolean(
      entry
      && typeof entry === "object"
      && "id" in entry
      && typeof entry.id === "string"
      && "value" in entry
      && "count" in entry
      && typeof entry.count === "number"
      && "lastUsed" in entry
      && typeof entry.lastUsed === "number",
    ));
  } catch {
    return [];
  }
}

function ranked<T>(entries: StoredEntry<T>[]) {
  return [...entries].sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed);
}

function remember<T>(key: string, id: string, value: T) {
  try {
    const entries = readEntries<T>(key);
    const existing = entries.find((entry) => entry.id === id);
    if (existing) {
      existing.value = value;
      existing.count += 1;
      existing.lastUsed = Date.now();
    } else {
      entries.push({ id, value, count: 1, lastUsed: Date.now() });
    }
    localStorage.setItem(key, JSON.stringify(ranked(entries).slice(0, MAX_STORED)));
  } catch {
    // Browsers can disable local storage; search still works without history.
  }
}

export function frequentPostcodes() {
  return ranked(readEntries<FrequentPostcode>(POSTCODE_KEY))
    .map((entry) => entry.value)
    .filter((item) => /^\d{4}$/.test(item.postcode) && item.suburb && item.state)
    .slice(0, MAX_SUGGESTIONS);
}

export function rememberPostcode(value: FrequentPostcode) {
  remember(POSTCODE_KEY, `${value.postcode}:${value.suburb.toUpperCase()}:${value.state.toUpperCase()}`, value);
}

export function frequentAddresses(postcode: string) {
  return ranked(readEntries<FrequentAddress>(ADDRESS_KEY))
    .map((entry) => entry.value)
    .filter((item) => item.postcode === postcode && item.street && item.label)
    .slice(0, MAX_SUGGESTIONS);
}

export function rememberAddress(value: FrequentAddress) {
  remember(ADDRESS_KEY, `${value.postcode}:${value.label.toUpperCase()}`, value);
}
