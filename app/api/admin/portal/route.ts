import { isAdminUser } from "@/lib/server/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { adminDatabase } from "@/lib/server/admin-database";
import { savePortalSettings, saveRate } from "@/lib/server/portal-service";
import { validateSettings, validateRate } from "@/lib/server/portal-validation";
import { victorianLocalities } from "@/lib/server/victorian-localities";
import { InputError, apiError, readJson } from "@/lib/server/request";
export async function POST(request: Request) {
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
    const body = await readJson(request, 32768);
    const db = adminDatabase();
    if (!db) throw new Error("Database unavailable");
    if (body.action === "settings") {
      const settings = validateSettings(body.data);
      if (settings.profile.postcode || settings.profile.suburb) {
        const localities = await victorianLocalities(settings.profile.postcode);
        if (
          !localities.some(
            (l) =>
              l.postcode === settings.profile.postcode &&
              l.suburb === settings.profile.suburb.toUpperCase(),
          )
        )
          throw new InputError(
            "Choose a Victorian suburb and its matching postcode.",
          );
      }
      if (settings.coverageMode === "selected") {
        const { count, error } = await db
          .from("service_suburbs")
          .select("id", { count: "exact", head: true })
          .eq("active", true);
        if (error) throw error;
        if (!count)
          throw new InputError(
            "Add at least one active suburb before switching to selected coverage.",
          );
      }
      await savePortalSettings(settings);
      return Response.json({ settings });
    }
    if (body.action === "rate") {
      const rate = validateRate(body.data);
      await saveRate(rate);
      return Response.json({ rate });
    }
    if (body.action === "coverage") {
      const p = body.data as Record<string, unknown>;
      if (
        !p ||
        typeof p.postcode !== "string" ||
        !/^\d{4}$/.test(p.postcode) ||
        typeof p.suburb !== "string" ||
        typeof p.active !== "boolean"
      )
        throw new InputError("Select a Victorian suburb from the suggestions.");
      const localities = await victorianLocalities(p.postcode);
      const locality = localities.find(
        (l) =>
          l.postcode === p.postcode &&
          l.suburb === String(p.suburb).toUpperCase(),
      );
      if (!locality)
        throw new InputError("Only verified Victorian suburbs are supported.");
      const row = {
        ...locality,
        id: `${locality.postcode}-${locality.suburb}`,
        active: p.active,
      };
      const { error } = await db.from("service_suburbs").upsert(row);
      if (error) throw error;
      return Response.json({ coverage: row });
    }
    if (body.action === "customer") {
      const p = body.data as Record<string, unknown>;
      if (
        !p ||
        typeof p.id !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(p.id) ||
        !["active", "inactive"].includes(String(p.status))
      )
        throw new InputError("Choose a valid customer status.");
      const { data, error } = await db
        .from("customers")
        .update({ status: p.status, updated_at: new Date().toISOString() })
        .eq("id", p.id)
        .select("id")
        .single();
      if (error || !data) throw error || new Error("Customer not found");
      return Response.json({ updated: true });
    }
    throw new InputError("Choose a valid admin action.");
  } catch (error) {
    return apiError(error);
  }
}
