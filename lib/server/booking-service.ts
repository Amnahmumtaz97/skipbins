import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";

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

function writeKey() {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    ""
  );
}

function newReference() {
  return `SB-${randomBytes(4).toString("hex").toUpperCase()}`;
}

async function persistLocally(row: Record<string, string>) {
  const dir = path.join(process.cwd(), ".data");
  const file = path.join(dir, "bookings.json");
  await mkdir(dir, { recursive: true });
  let existing: unknown[] = [];
  try {
    const parsed = JSON.parse(await readFile(file, "utf8")) as unknown;
    if (Array.isArray(parsed)) existing = parsed;
  } catch {
    existing = [];
  }
  existing.push({ ...row, created_at: new Date().toISOString() });
  await writeFile(file, `${JSON.stringify(existing, null, 2)}\n`);
}

export async function createBooking(data: BookingRecord) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = writeKey();
  if (!url || !key) throw new Error("Booking provider is not configured");

  const row = {
    reference: newReference(),
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

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.from("bookings").insert(row);
  if (!error) return { reference: row.reference };
  if (process.env.NODE_ENV === "production") throw error;

  await persistLocally(row);
  return { reference: row.reference };
}
