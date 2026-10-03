import { isOperationStatus, supplierActionStatuses } from "@/lib/data/operations";
import { isSupplierUser, supplierIdFromUser } from "@/lib/server/admin-auth";
import { getSupplierOperations, updateOrderOperations } from "@/lib/server/operations-service";
import { InputError, apiError, readJson } from "@/lib/server/request";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { data: { user } } = await (await createClient()).auth.getUser();
    if (!user) return Response.json({ error: "Please sign in as a supplier." }, { status: 401 });
    if (!isSupplierUser(user)) return Response.json({ error: "Supplier access is required." }, { status: 403 });
    const { id } = await params;
    const body = await readJson(request);
    const status = body.status === undefined ? undefined : isOperationStatus(body.status) && supplierActionStatuses.includes(body.status) ? body.status : null;
    const notes = body.notes === undefined ? undefined : typeof body.notes === "string" ? body.notes.trim() : null;
    if (status === null) throw new InputError("Choose a valid job status.");
    if (notes === null || (notes !== undefined && notes.length > 500)) throw new InputError("Supplier notes must be 500 characters or fewer.");
    if (status === undefined && notes === undefined) throw new InputError("Choose a status or add a supplier note.");
    const { bookings } = await getSupplierOperations(user.id, supplierIdFromUser(user));
    if (!bookings.some((booking) => booking.id === id)) return Response.json({ error: "This order is not assigned to your supplier account." }, { status: 403 });
    await updateOrderOperations({ bookingId: id, status, notes });
    return Response.json({ updated: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
