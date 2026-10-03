import { bins } from "@/lib/data/skip-bins";
import { isAdminUser } from "@/lib/server/admin-auth";
import { updateSupplier } from "@/lib/server/operations-service";
import { InputError, apiError, readJson } from "@/lib/server/request";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { data: { user } } = await (await createClient()).auth.getUser();
    if (!user) return Response.json({ error: "Please sign in as an admin." }, { status: 401 });
    if (!isAdminUser(user)) return Response.json({ error: "Admin access is required." }, { status: 403 });
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new InputError("Choose a valid supplier.");
    const body = await readJson(request);
    const changes: Record<string, unknown> = {};
    if (body.status !== undefined) {
      if (body.status !== "active" && body.status !== "paused") throw new InputError("Choose a valid supplier status.");
      changes.status = body.status;
    }
    if (body.binInventory !== undefined) {
      if (!body.binInventory || typeof body.binInventory !== "object" || Array.isArray(body.binInventory)) throw new InputError("Enter valid bin availability.");
      const values = body.binInventory as Record<string, unknown>;
      changes.bin_inventory = Object.fromEntries(bins.map((bin) => {
        const quantity = Number(values[bin.id] ?? 0);
        if (!Number.isInteger(quantity) || quantity < 0 || quantity > 999) throw new InputError("Bin quantities must be whole numbers between 0 and 999.");
        return [bin.id, quantity];
      }));
    }
    if (!Object.keys(changes).length) throw new InputError("Choose a supplier update.");
    const supplier = await updateSupplier(id, changes);
    return Response.json({ supplier }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
