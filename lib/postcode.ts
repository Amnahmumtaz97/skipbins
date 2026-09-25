/** Accept a suburb or postcode search; preserve leading zeroes and resolve via the lookup API. */
export function isValidPostcode(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9 '\-]{3,60}$/.test(value.trim());
}

export const postcodeError = "Enter at least 3 characters of a suburb or postcode.";
