import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
export function adminDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return url && key
    ? createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
}
/** Page through the provider limit so financial reports never silently stop at 500/1000 rows. */
export async function readAllRows(
  db: SupabaseClient,
  table: string,
  columns = "*",
  order = "created_at",
  ascending = false,
) {
  const rows: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await db
      .from(table)
      .select(columns)
      .order(order, { ascending })
      .order("id", { ascending: true })
      .range(offset, offset + 999);
    if (result.error)
      return {
        data: [] as Record<string, unknown>[],
        error: result.error.message,
      };
    const page = (result.data ?? []) as unknown as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < 1000) return { data: rows, error: null };
  }
}
