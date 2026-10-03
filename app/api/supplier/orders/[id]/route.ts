import { isOperationStatus, supplierActionStatuses } from "@/lib/data/operations";
import { isSupplierUser, supplierIdFromUser } from "@/lib/server/admin-auth";
import { getSupplierOperations, updateOrderOperations } from "@/lib/server/operations-service";
import { InputError, apiError, readJson } from "@/lib/server/request";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const { data: { user } } = await (await createClient()).auth.getUser(); if (!user) return Response.json({ error: "Please sign in as a supplier." }, { status: 401 }); if (!isSupplierUser(user)) return Response.json({ error: "Supplier access is required." }, { status: 403 }); const { id } = await params; const body = await readJson(request); if (!isOperationStatus(body.status) || !supplierActionStatuses.includes(body.status)) throw new InputError("Choose a valid job status."); const { bookings } = await getSupplierOperations(user.id, supplierIdFromUser(user)); if (!bookings.some((booking) => booking.id === id)) return Response.json({ error: "This order is not assigned to your supplier account." }, { status: 403 }); await updateOrderOperations({ bookingId: id, status: body.status }); return Response.json({ updated: true }, { headers: { "Cache-Control": "no-store" } }); } catch (error) { return apiError(error); }
}
