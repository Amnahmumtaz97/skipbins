import type { User } from "@supabase/supabase-js";

function configuredAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminUser(user: User | null | undefined) {
  if (!user) return false;

  const role = user.app_metadata?.role;
  const roles = user.app_metadata?.roles;
  if (role === "admin" || (Array.isArray(roles) && roles.includes("admin"))) return true;

  const email = user.email?.trim().toLowerCase();
  return Boolean(email && configuredAdminEmails().has(email));
}

export function isSupplierUser(user: User | null | undefined) {
  if (!user) return false;
  const role = user.app_metadata?.role;
  const roles = user.app_metadata?.roles;
  return role === "supplier" || (Array.isArray(roles) && roles.includes("supplier"));
}

export function supplierIdFromUser(user: User | null | undefined) {
  const value = user?.app_metadata?.supplier_id;
  return typeof value === "string" && value ? value : undefined;
}
