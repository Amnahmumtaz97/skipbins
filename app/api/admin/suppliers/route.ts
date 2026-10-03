import { bins } from "@/lib/data/skip-bins";
import { isAdminUser } from "@/lib/server/admin-auth";
import { createSupplier } from "@/lib/server/operations-service";
import { InputError, apiError, readJson } from "@/lib/server/request";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { data: { user } } = await (await createClient()).auth.getUser();
    if (!user) return Response.json({ error: "Please sign in as an admin." }, { status: 401 });
    if (!isAdminUser(user)) return Response.json({ error: "Admin access is required." }, { status: 403 });
    const body = await readJson(request);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const authUserId = typeof body.authUserId === "string" ? body.authUserId.trim() : "";
    if (name.length < 2 || name.length > 100) throw new InputError("Enter the supplier business name.");
    if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new InputError("Enter a valid supplier email.");
    if (authUserId && !/^[0-9a-f-]{36}$/i.test(authUserId)) throw new InputError("The Auth user ID must be a UUID.");
    const supplier = await createSupplier({
      name,
      contact_name: typeof body.contactName === "string" ? body.contactName.trim().slice(0, 100) : "",
      email,
      phone: typeof body.phone === "string" ? body.phone.trim().slice(0, 30) : "",
      service_area: typeof body.serviceArea === "string" ? body.serviceArea.trim().slice(0, 250) : "",
      status: "active",
      auth_user_id: authUserId || null,
      bin_inventory: Object.fromEntries(bins.map((bin) => [bin.id, 0])),
    });
    return Response.json({ supplier }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
