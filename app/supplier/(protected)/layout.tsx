import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { SupplierShell } from "@/components/supplier/supplier-shell";
import { isSupplierUser, supplierIdFromUser } from "@/lib/server/admin-auth";
import { getSupplierByUser } from "@/lib/server/operations-service";
import { createClient } from "@/lib/supabase/server";
import "../../admin/(protected)/admin.css";
import "./supplier.css";
export default async function SupplierProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user) redirect("/supplier/login");
  if (!isSupplierUser(user)) redirect("/supplier/login?error=not-authorized");
  const supplier = await getSupplierByUser(user.id, supplierIdFromUser(user));
  return (
    <div className="portal-root supplier-root">
      <SupplierShell
        supplierName={supplier?.name ?? "Profile not linked"}
        email={user.email ?? "Supplier"}
      />
      <main className="portal-main">{children}</main>
    </div>
  );
}
