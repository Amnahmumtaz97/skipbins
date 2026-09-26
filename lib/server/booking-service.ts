import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type BookingRecord = {
  address: string;
  binSize: string;
  wasteType: string;
  deliveryDate: string;
  hirePeriod: string;
  fullName: string;
  email: string;
  phone: string;
  streetAddress: string;
  placement: string;
  access: string;
  notes: string;
};

export type StoredBooking = {
  id: string;
  reference: string;
  status: "pending" | "paid";
  amount_cents: number;
  stripe_session_id: string;
  bin_size: string;
  postcode: string;
  waste_type: string;
  delivery_date: string;
  hire_period: string;
  full_name: string;
  email: string;
  phone: string;
  street_address: string;
  placement: string;
  access: string;
  notes: string;
};

function writeKey() {
  const secretKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "";

  if (secretKey || process.env.NODE_ENV === "production") return secretKey;

  // Local development also mirrors bookings to .data. The publishable key can
  // insert a row under RLS, while the local mirror supports the update flow.
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || "";
}

function newReference() {
  return `SB-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function localFile() {
  return path.join(process.cwd(), ".data", "bookings.json");
}

async function readLocal(): Promise<StoredBooking[]> {
  try {
    const parsed = JSON.parse(await readFile(localFile(), "utf8")) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredBooking[]) : [];
  } catch {
    return [];
  }
}

async function writeLocal(rows: StoredBooking[]) {
  await mkdir(path.dirname(localFile()), { recursive: true });
  await writeFile(localFile(), `${JSON.stringify(rows, null, 2)}\n`);
}

function supabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = writeKey();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function fromRecord(data: BookingRecord, amountCents: number): StoredBooking {
  return {
    id: randomUUID(),
    reference: newReference(),
    status: "pending",
    amount_cents: amountCents,
    stripe_session_id: "",
    bin_size: data.binSize,
    postcode: data.address,
    waste_type: data.wasteType,
    delivery_date: data.deliveryDate,
    hire_period: data.hirePeriod,
    full_name: data.fullName.trim(),
    email: data.email.trim(),
    phone: data.phone.trim(),
    street_address: data.streetAddress.trim(),
    placement: data.placement,
    access: data.access.trim(),
    notes: data.notes.trim(),
  };
}

async function persistLocally(row: StoredBooking) {
  const existing = await readLocal();
  const index = existing.findIndex((item) => item.id === row.id);
  if (index >= 0) existing[index] = row;
  else existing.push({ ...row, created_at: new Date().toISOString() } as StoredBooking);
  await writeLocal(existing);
}

export async function createPendingBooking(data: BookingRecord, amountCents: number) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = writeKey();
  if (!url || !key) throw new Error("Booking provider is not configured");

  const row = fromRecord(data, amountCents);
  const client = supabase();
  if (client) {
    const { error } = await client.from("bookings").insert(row);
    if (!error) {
      if (process.env.NODE_ENV !== "production") await persistLocally(row);
      return { id: row.id, reference: row.reference };
    }
    if (process.env.NODE_ENV === "production") throw error;
  }

  await persistLocally(row);
  return { id: row.id, reference: row.reference };
}

export async function attachCheckoutSession(bookingId: string, sessionId: string) {
  const client = supabase();
  if (client) {
    const { data, error } = await client
      .from("bookings")
      .update({ stripe_session_id: sessionId })
      .eq("id", bookingId)
      .select("id")
      .maybeSingle();
    if (error && process.env.NODE_ENV === "production") throw error;
    if (data) return;
  }
  const existing = await readLocal();
  const row = existing.find((item) => item.id === bookingId);
  if (row) {
    row.stripe_session_id = sessionId;
    await writeLocal(existing);
    return;
  }
  if (process.env.NODE_ENV === "production") throw new Error("Booking not found");
}

export async function markBookingPaid(lookup: { id?: string; stripeSessionId?: string }) {
  const client = supabase();
  if (client) {
    let query = client.from("bookings").update({ status: "paid" }).eq("status", "pending");
    if (lookup.stripeSessionId) query = query.eq("stripe_session_id", lookup.stripeSessionId);
    else if (lookup.id) query = query.eq("id", lookup.id);
    else return null;
    const { data, error } = await query.select("id, reference, status, amount_cents, stripe_session_id, bin_size, postcode, waste_type, delivery_date, hire_period, full_name, email, phone, street_address, placement, access, notes").maybeSingle();
    if (!error && data) return data as StoredBooking;
    if (error && process.env.NODE_ENV === "production") throw error;
  }

  const existing = await readLocal();
  const row = existing.find((item) =>
    Boolean((lookup.id && item.id === lookup.id) || (lookup.stripeSessionId && item.stripe_session_id === lookup.stripeSessionId)),
  );
  if (!row) return null;
  if (lookup.stripeSessionId) row.stripe_session_id = lookup.stripeSessionId;
  row.status = "paid";
  await writeLocal(existing);
  return row;
}

export async function getBookingByCheckoutSession(sessionId: string) {
  const client = supabase();
  if (client) {
    const { data, error } = await client
      .from("bookings")
      .select("id, reference, status, amount_cents, stripe_session_id, bin_size, postcode, waste_type, delivery_date, hire_period, full_name, email, phone, street_address, placement, access, notes")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();
    if (!error && data) return data as StoredBooking;
  }
  const existing = await readLocal();
  return existing.find((item) => item.stripe_session_id === sessionId) ?? null;
}
