import { isSupplierUser, supplierIdFromUser } from "@/lib/server/admin-auth";
import { getSupplierByUser } from "@/lib/server/operations-service";
import { adminDatabase } from "@/lib/server/admin-database";
import { validateSupplierFields } from "@/lib/server/supplier-validation";
import { InputError, apiError, readJson } from "@/lib/server/request";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  try {
    const {
      data: { user },
    } = await (await createClient()).auth.getUser();
    if (!user)
      return Response.json(
        { error: "Please sign in as a supplier." },
        { status: 401 },
      );
    if (!isSupplierUser(user))
      return Response.json(
        { error: "Supplier access is required." },
        { status: 403 },
      );
    const supplier = await getSupplierByUser(user.id, supplierIdFromUser(user));
    if (!supplier)
      return Response.json(
        { error: "Your supplier profile is not linked." },
        { status: 403 },
      );
    const body = await readJson(request);
    const changes: Record<string, unknown> = {};
    if (body.profile !== undefined) {
      if (
        !body.profile ||
        typeof body.profile !== "object" ||
        Array.isArray(body.profile)
      )
        throw new InputError("Check your business details.");
      const source = body.profile as Record<string, unknown>;
      const allowed = Object.fromEntries(
        ["name", "contactName", "email", "phone", "abn", "serviceArea"]
          .filter((key) => source[key] !== undefined)
          .map((key) => [key, source[key]]),
      );
      Object.assign(changes, await validateSupplierFields(allowed, true));
    }

    if (!Object.keys(changes).length)
      throw new InputError("Make a change before saving.");
    const db = adminDatabase();
    if (!db) throw new Error("Database unavailable");
    const { data, error } = await db
      .from("suppliers")
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq("id", supplier.id)
      .select("id")
      .single();
    if (error || !data) throw new Error("Save failed");
    return Response.json(
      { updated: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
