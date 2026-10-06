import { isAdminUser } from "@/lib/server/admin-auth";
import { adminDatabase } from "@/lib/server/admin-database";
import {
  createSupplier,
  type SupplierInput,
} from "@/lib/server/operations-service";
import { validateSupplierFields } from "@/lib/server/supplier-validation";
import { InputError, apiError, readJson } from "@/lib/server/request";
import { createClient } from "@/lib/supabase/server";
export async function POST(request: Request) {
  let createdUserId: string | undefined;
  const db = adminDatabase();
  try {
    const {
      data: { user },
    } = await (await createClient()).auth.getUser();
    if (!user)
      return Response.json({ error: "Please sign in." }, { status: 401 });
    if (!isAdminUser(user))
      return Response.json(
        { error: "Admin access is required." },
        { status: 403 },
      );
    const body = await readJson(request);
    const fields = await validateSupplierFields(body);
    let authUserId =
      typeof body.authUserId === "string" ? body.authUserId.trim() : "";
    if (authUserId && !/^[0-9a-f-]{36}$/i.test(authUserId))
      throw new InputError("Choose a valid account ID.");
    if (body.password !== undefined) {
      if (!db) throw new Error("Database unavailable");
      if (
        typeof body.password !== "string" ||
        body.password.length < 12 ||
        body.password.length > 128 ||
        !fields.email
      )
        throw new InputError(
          "Use a valid email and a password of 12 to 128 characters.",
        );
      const { data, error } = await db.auth.admin.createUser({
        email: String(fields.email),
        password: body.password,
        email_confirm: true,
        app_metadata: { role: "supplier" },
      });
      if (error || !data.user)
        throw new InputError(
          "Could not create the supplier account. Check the email is not already registered.",
        );
      authUserId = data.user.id;
      createdUserId = data.user.id;
    }
    const supplier = await createSupplier({
      ...fields,
      status: "active",
      auth_user_id: authUserId || null,
    } as SupplierInput);
    return Response.json(
      { supplier },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (createdUserId && db) await db.auth.admin.deleteUser(createdUserId);
    return apiError(error);
  }
}
