import localities from "@/lib/data/vic-localities.json";

const suburbForPostcode = new Map<string, string | null>();
for (const locality of localities as { postcode: string; suburb: string }[]) {
  const current = suburbForPostcode.get(locality.postcode);
  if (current === undefined) suburbForPostcode.set(locality.postcode, locality.suburb);
  else if (current !== locality.suburb) suburbForPostcode.set(locality.postcode, null);
}

/** Street line plus suburb, state and postcode from the booking. */
export function formatBookingAddress(street: string, postcode: string) {
  const line = street.trim();
  const code = postcode.trim();
  if (!line) return code ? `VIC ${code}` : "";
  if (/\bVIC\s+\d{4}\s*$/i.test(line)) return line;
  const suburb = /^\d{4}$/.test(code) ? suburbForPostcode.get(code) : null;
  if (suburb && !line.toUpperCase().includes(suburb)) {
    return `${line}, ${suburb} VIC ${code}`;
  }
  return code ? `${line}, VIC ${code}` : line;
}
