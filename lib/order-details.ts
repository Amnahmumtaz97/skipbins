import {
  hireForDates,
  isValidAuPhone,
  isValidEmail,
} from "@/lib/booking-utils";
import { InputError } from "@/lib/server/request";

export type OrderDetailChanges = {
  full_name?: string;
  email?: string;
  phone?: string;
  street_address?: string;
  postcode?: string;
  delivery_date?: string;
  pickup_date?: string;
  hire_period?: string;
  placement?: string;
  access?: string;
  notes?: string;
};

type DetailInput = Record<string, unknown>;

function text(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== "string") throw new InputError(`Enter the ${label}.`);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max)
    throw new InputError(`Check the ${label}.`);
  return trimmed;
}

export function orderDetailChanges(
  input: DetailInput,
  scope: "admin" | "supplier",
): OrderDetailChanges {
  const streetAddress = text(input.streetAddress, "street address", 4, 300);
  const postcode = text(input.postcode, "postcode", 4, 4);
  if (!/^\d{4}$/.test(postcode))
    throw new InputError("Enter a 4-digit Victorian postcode.");
  const deliveryDate = text(input.deliveryDate, "delivery date", 10, 10);
  const pickupDate = text(input.pickupDate, "pickup date", 10, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate))
    throw new InputError("Choose a delivery date.");
  const hire = hireForDates(deliveryDate, pickupDate);
  if (!hire)
    throw new InputError(
      "Choose a pickup date from the delivery date, up to 24 days later.",
    );
  const changes: OrderDetailChanges = {
    street_address: streetAddress,
    postcode,
    delivery_date: deliveryDate,
    pickup_date: pickupDate,
    hire_period: hire.period,
  };
  if (scope === "supplier") return changes;
  const email = text(input.email, "email", 3, 254);
  if (!isValidEmail(email)) throw new InputError("Enter a valid email.");
  const phone = text(input.phone, "phone", 8, 30);
  if (!isValidAuPhone(phone)) throw new InputError("Enter a valid phone number.");
  return {
    ...changes,
    full_name: text(input.fullName, "customer name", 2, 100),
    email,
    phone,
    placement: text(input.placement, "placement", 0, 80),
    access: typeof input.access === "string" ? input.access.trim().slice(0, 200) : "",
    notes:
      typeof input.customerNotes === "string"
        ? input.customerNotes.trim().slice(0, 2000)
        : "",
  };
}
