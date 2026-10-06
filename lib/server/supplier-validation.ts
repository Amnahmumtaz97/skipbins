import { InputError } from "@/lib/server/request";
import { victorianLocalities } from "@/lib/server/victorian-localities";
export async function validateSupplierFields(
  body: Record<string, unknown>,
  partial = false,
) {
  const changes: Record<string, string | number> = {};
  for (const [key, column, max] of [
    ["name", "name", 100],
    ["contactName", "contact_name", 100],
    ["email", "email", 254],
    ["phone", "phone", 30],
    ["abn", "abn", 30],
    ["serviceArea", "service_area", 250],
  ] as const) {
    if (partial && body[key] === undefined) continue;
    const value = body[key] ?? "";
    if (typeof value !== "string" || value.length > max)
      throw new InputError(`Check the supplier ${key}.`);
    const text = value.trim();
    if (key === "name" && text.length < 2)
      throw new InputError("Enter a business name.");
    if (key === "email" && text && !/^\S+@\S+\.\S+$/.test(text))
      throw new InputError("Enter a valid supplier email.");
    if (key === "abn" && text && !/^\d{11}$/.test(text.replace(/\s/g, "")))
      throw new InputError("ABN must have 11 digits.");
    if (key === "serviceArea" && text) {
      const codes = text.split(",").map((p) => p.trim());
      if (codes.length > 30 || codes.some((p) => !/^\d{4}$/.test(p)))
        throw new InputError("Enter Victorian postcodes separated by commas.");
      const matches = await Promise.all(
        codes.map((p) => victorianLocalities(p)),
      );
      if (matches.some((l, i) => !l.some((v) => v.postcode === codes[i])))
        throw new InputError(
          "Supplier coverage must contain only verified Victorian postcodes.",
        );
      changes[column] = [...new Set(codes)].join(", ");
    } else changes[column] = text;
  }
  if (body.rating !== undefined) {
    if (
      typeof body.rating !== "number" ||
      !Number.isFinite(body.rating) ||
      body.rating < 0 ||
      body.rating > 5
    )
      throw new InputError("Rating must be between 0 and 5.");
    changes.rating = body.rating;
  }
  return changes;
}
