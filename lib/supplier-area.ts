export const clearedSupplierArea = "none";

export function supplierUsesAdminArea(value: string) {
  return value.trim() === "";
}

export function parseSupplierPostcodes(value: string) {
  return [
    ...new Set(
      value
        .split(",")
        .map((part) => part.trim())
        .filter((part) => /^\d{4}$/.test(part)),
    ),
  ];
}

export function formatSupplierPostcodes(codes: string[]) {
  return parseSupplierPostcodes(codes.join(",")).join(", ") || clearedSupplierArea;
}

export function supplierAreaLabel(value: string) {
  if (supplierUsesAdminArea(value)) return "Admin delivery area";
  const codes = parseSupplierPostcodes(value);
  return codes.length ? codes.join(", ") : "No postcodes";
}

export function effectiveSupplierPostcodes(
  serviceArea: string,
  adminPostcodes: Iterable<string>,
) {
  if (supplierUsesAdminArea(serviceArea))
    return [...new Set([...adminPostcodes].filter((code) => /^\d{4}$/.test(code)))];
  return parseSupplierPostcodes(serviceArea);
}

export function unionSupplierPostcodes(
  areas: string[],
  adminPostcodes: Iterable<string>,
) {
  const codes = new Set<string>();
  for (const area of areas) {
    for (const code of effectiveSupplierPostcodes(area, adminPostcodes))
      codes.add(code);
  }
  return [...codes].sort();
}

export function supplierCoversPostcode(
  serviceArea: string,
  postcode: string,
  adminPostcodes: Iterable<string>,
) {
  return effectiveSupplierPostcodes(serviceArea, adminPostcodes).includes(
    postcode,
  );
}
