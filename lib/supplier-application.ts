import { isValidAuPhone, isValidEmail } from "@/lib/booking-utils";

export type SupplierApplicationInput = {
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  abn: string;
  password: string;
};

export class SupplierApplicationValidationError extends Error {}

function requiredText(value: unknown, label: string, maxLength = 100) {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length < 2) throw new SupplierApplicationValidationError(`Enter your ${label}.`);
  if (text.length > maxLength) throw new SupplierApplicationValidationError(`${label[0].toUpperCase()}${label.slice(1)} is too long.`);
  return text;
}

export function validateSupplierApplication(body: Record<string, unknown>): SupplierApplicationInput {
  const companyName = requiredText(body.companyName, "company name");
  const contactName = requiredText(body.contactName, "name");
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const abn = typeof body.abn === "string" ? body.abn.replace(/\s/g, "") : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

  if (!isValidAuPhone(phone)) throw new SupplierApplicationValidationError("Enter a valid Australian phone number.");
  if (!isValidEmail(email) || email.length > 254) throw new SupplierApplicationValidationError("Enter a valid business email.");
  if (abn && !/^\d{11}$/.test(abn)) throw new SupplierApplicationValidationError("Enter an 11-digit ABN, or leave it blank.");
  if (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    throw new SupplierApplicationValidationError("Use at least 10 characters with uppercase, lowercase and a number.");
  }
  if (password !== confirmPassword) throw new SupplierApplicationValidationError("Passwords do not match.");

  return { companyName, contactName, phone, email, abn, password };
}
