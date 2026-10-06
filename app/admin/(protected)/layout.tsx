import "./admin.css";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { isAdminUser } from "@/lib/server/admin-auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user) redirect("/admin/login");
  if (!isAdminUser(user)) redirect("/admin/login?error=not-authorized");

  return (
    <div className="portal-root">
      <AdminShell email={user.email ?? "Admin"} />
      <main className="portal-main">{children}</main>
    </div>
  );
}
