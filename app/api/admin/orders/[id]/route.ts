import { isAdminUser } from "@/lib/server/admin-auth";
import { isOperationStatus } from "@/lib/data/operations";
import { InputError, apiError, readJson } from "@/lib/server/request";
import { updateOrderOperations } from "@/lib/server/operations-service";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { data: { user } } = await (await createClient()).auth.getUser();
    if (!user) return Response.json({ error: "Please sign in as an admin." }, { status: 401 });
    if (!isAdminUser(user)) return Response.json({ error: "Admin access is required." }, { status: 403 });
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new InputError("This order cannot be updated.");
    const body = await readJson(request);
    const supplierId = body.supplierId === null || body.supplierId === "" ? null : typeof body.supplierId === "string" ? body.supplierId : undefined;
    const status = body.status === undefined ? undefined : isOperationStatus(body.status) ? body.status : null;
    if (status === null) throw new InputError("Choose a valid workflow status.");
    if (supplierId !== undefined && supplierId !== null && !/^[0-9a-f-]{36}$/i.test(supplierId)) throw new InputError("Choose a valid supplier.");
    if (supplierId === undefined && status === undefined) throw new InputError("Choose a supplier or workflow status.");
    await updateOrderOperations({ bookingId: id, supplierId, status });
    return Response.json({ updated: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
