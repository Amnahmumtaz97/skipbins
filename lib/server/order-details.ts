import "server-only";
import {
  orderDetailChanges,
  type OrderDetailChanges,
} from "@/lib/order-details";
import { InputError } from "@/lib/server/request";
import { victorianLocalities } from "@/lib/server/victorian-localities";

export async function verifiedOrderDetails(
  input: unknown,
  scope: "admin" | "supplier",
): Promise<OrderDetailChanges | undefined> {
  if (input === undefined) return undefined;
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new InputError("Check the order details.");
  const changes = orderDetailChanges(input as Record<string, unknown>, scope);
  const matches = await victorianLocalities(changes.postcode ?? "");
  if (!matches.some((row) => row.postcode === changes.postcode))
    throw new InputError("Enter a Victorian postcode.");
  return changes;
}
