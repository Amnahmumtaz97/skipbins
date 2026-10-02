import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { isAdminUser } from "@/lib/server/admin-auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) redirect("/admin/login");
  if (!isAdminUser(user)) redirect("/admin/login?error=not-authorized");

  return (
    <div className="min-h-screen bg-[#F6F2E7] text-[#16241C]">
      <AdminNav email={user.email ?? "Admin"} />
      <main className="px-5 py-9 sm:px-8 sm:py-12">{children}</main>
    </div>
  );
}
