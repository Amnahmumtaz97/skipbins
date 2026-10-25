import { isAdminUser } from "@/lib/server/admin-auth";
import { isOperationStatus } from "@/lib/data/operations";
import { verifiedOrderDetails } from "@/lib/server/order-details";
import { InputError, apiError, readJson } from "@/lib/server/request";
import { updateOrderOperations } from "@/lib/server/operations-service";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const {
      data: { user },
    } = await (await createClient()).auth.getUser();
    if (!user)
      return Response.json(
        { error: "Please sign in as an admin." },
        { status: 401 },
      );
    if (!isAdminUser(user))
      return Response.json(
        { error: "Admin access is required." },
        { status: 403 },
      );
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id))
      throw new InputError("This order cannot be updated.");
    const body = await readJson(request);
    const supplierId =
      body.supplierId === null || body.supplierId === ""
        ? null
        : typeof body.supplierId === "string"
          ? body.supplierId
          : undefined;
    const status =
      body.status === undefined
        ? undefined
        : isOperationStatus(body.status)
          ? body.status
          : null;
    if (status === null)
      throw new InputError("Choose a valid workflow status.");
    if (
      supplierId !== undefined &&
      supplierId !== null &&
      !/^[0-9a-f-]{36}$/i.test(supplierId)
    )
      throw new InputError("Choose a valid supplier.");
    const notes =
      body.notes === undefined
        ? undefined
        : typeof body.notes === "string" && body.notes.length <= 2000
          ? body.notes
          : null;
    const source =
      body.source === undefined
        ? undefined
        : body.source === "direct" ||
            body.source === "ppc" ||
            body.source === "manual"
          ? body.source
          : null;
    if (source === null) throw new InputError("Choose a valid booking source.");
    if (notes === null)
      throw new InputError("Notes must be no more than 2,000 characters.");
    const mark =
      body.mark === undefined
        ? undefined
        : body.mark === "deleted" ||
            body.mark === "refunded" ||
            body.mark === "restored"
          ? body.mark
          : null;
    if (mark === null)
      throw new InputError("Choose deleted, restored, or refunded.");
    const details = await verifiedOrderDetails(body.details, "admin");
    if (
      supplierId === undefined &&
      status === undefined &&
      notes === undefined &&
      source === undefined &&
      details === undefined &&
      mark === undefined
    )
      throw new InputError("Choose a change to save.");
    await updateOrderOperations({
      bookingId: id,
      supplierId,
      status,
      notes,
      source,
      details,
      mark,
    });
    return Response.json(
      { updated: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
