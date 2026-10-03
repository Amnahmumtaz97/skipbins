import { isAdminUser } from "@/lib/server/admin-auth";
import { reviewSupplierApplication } from "@/lib/server/operations-service";
import { InputError, apiError, readJson } from "@/lib/server/request";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { data: { user } } = await (await createClient()).auth.getUser();
    if (!user) return Response.json({ error: "Please sign in as an admin." }, { status: 401 });
    if (!isAdminUser(user)) return Response.json({ error: "Admin access is required." }, { status: 403 });
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new InputError("This supplier application cannot be reviewed.");
    const body = await readJson(request);
    if (body.decision !== "approved" && body.decision !== "rejected") throw new InputError("Choose approve or reject.");
    await reviewSupplierApplication(id, body.decision, user.id);
    return Response.json({ updated: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
