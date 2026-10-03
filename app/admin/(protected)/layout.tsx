import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { isAdminUser } from "@/lib/server/admin-auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) redirect("/admin/login");
  if (!isAdminUser(user)) redirect("/admin/login?error=not-authorized");

  return (
    <div className="min-h-screen bg-[#F6F2E7] text-[#16241C]">
      <AdminShell email={user.email ?? "Admin"} />
      <main className="px-4 py-6 sm:px-7 sm:py-8 lg:ml-[250px] lg:px-9">{children}</main>
    </div>
  );
}
