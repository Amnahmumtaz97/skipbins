import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  selectedBookingExtras,
  type BookingExtraQuantities,
} from "@/lib/data/booking-extras";
import type { CustomerIdentity } from "@/lib/server/customer-service";
import { chooseSupplierForOrder } from "@/lib/server/assign-supplier";
import { verifiedBookingPayment } from "@/lib/server/checkout-policy";

export type BookingRecord = {
  address: string;
  binSize: string;
  wasteType: string;
  deliveryDate: string;
  pickupDate: string;
  hirePeriod: string;
  extras: BookingExtraQuantities;
  fullName: string;
  email: string;
  phone: string;
  streetAddress: string;
  deliveryAddressLabel?: string;
  placement: string;
  access: string;
  notes: string;
};

export type StoredBooking = {
  id: string;
  reference: string;
  status: "pending" | "paid";
  created_at?: string;
  amount_cents: number;
  stripe_session_id: string | null;
  stripe_payment_intent_id?: string | null;
  bin_size: string;
  postcode: string;
  waste_type: string;
  delivery_date: string;
  pickup_date: string;
  hire_period: string;
  full_name: string;
  email: string;
  phone: string;
  street_address: string;
  placement: string;
  access: string;
  notes: string;
  customer_id?: string | null;
  customer_code?: string;
  supplier_id?: string | null;
  operation_status?: string;
};

function writeKey() {
  const secretKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "";

  return secretKey;
}

export function orderYearSuffix(now = new Date()) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    year: "2-digit",
  }).format(now);
}

export function formatOrderNumber(sequence: number, year = orderYearSuffix()) {
  return `ORD-${year}-${String(sequence).padStart(4, "0")}`;
}

function sequenceFromReference(reference: string, year: string) {
  const match = new RegExp(`^ORD-${year}-(\\d+)$`).exec(reference);
  if (!match) return 0;
  const value = Number(match[1]);
  return Number.isInteger(value) && value > 0 ? value : 0;
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
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function databaseError(
  operation: string,
  error: { code?: string; message?: string },
) {
  const code = error.code ? ` (${error.code})` : "";
  return new Error(
    `${operation}${code}: ${error.message || "Unknown database error"}`,
  );
}

function fromRecord(
  data: BookingRecord,
  amountCents: number,
  customer?: CustomerIdentity,
  submissionId?: string,
): StoredBooking {
  const extras = selectedBookingExtras(data.extras);
  const extrasNote = extras.length
    ? `Disposal extras: ${extras.map((extra) => `${extra.label} x ${extra.quantity}${extra.total === 0 ? " (FREE)" : ""}`).join(", ")}`
    : "";
  return {
    id: submissionId ?? randomUUID(),
    reference: "",
    status: "pending",
    amount_cents: amountCents,
    stripe_session_id: null,
    bin_size: data.binSize,
    postcode: data.address,
    waste_type: data.wasteType,
    delivery_date: data.deliveryDate,
    pickup_date: data.pickupDate,
    hire_period: data.hirePeriod,
    full_name: data.fullName.trim(),
    email: data.email.trim(),
    phone: data.phone.trim(),
    street_address: (data.deliveryAddressLabel?.trim() || data.streetAddress).trim(),
    placement: data.placement,
    access: data.access.trim(),
    notes: [extrasNote, data.notes.trim()].filter(Boolean).join("\n"),
    ...(customer?.storage === "database" ? { customer_id: customer.id } : {}),
  };
}

async function nextOrderReference(client: SupabaseClient) {
  const year = orderYearSuffix();
  const { data, error } = await client
    .from("bookings")
    .select("reference")
    .like("reference", `ORD-${year}-%`)
    .limit(10000);
  if (error) throw databaseError("Could not allocate order number", error);
  const next =
    (data ?? []).reduce((max, row) => {
      const reference =
        row && typeof row.reference === "string" ? row.reference : "";
      return Math.max(max, sequenceFromReference(reference, year));
    }, 0) + 1;
  return formatOrderNumber(next, year);
}

async function persistLocally(row: StoredBooking) {
  const existing = await readLocal();
  const index = existing.findIndex((item) => item.id === row.id);
  if (index >= 0) existing[index] = row;
  else
    existing.push({
      ...row,
      created_at: new Date().toISOString(),
    } as StoredBooking);
  await writeLocal(existing);
}

export async function createPendingBooking(
  data: BookingRecord,
  amountCents: number,
  customer?: CustomerIdentity,
  source: "direct" | "ppc" | "manual" = "direct",
  submissionId?: string,
) {
  const row = fromRecord(data, amountCents, customer, submissionId);
  const client = supabase();
  if (!client) throw new Error("Booking provider is not configured");
  let saved: { reference?: string }[] | null = null;
  let error: { code?: string; message?: string } | null = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    row.reference = await nextOrderReference(client);
    const result = await client.rpc("reserve_booking_submission", {
      payload: { ...row, booking_source: source },
    });
    saved = result.data;
    error = result.error;
    if (!error && saved?.length) break;
    if (error?.code !== "23505") break;
  }
  if (error || !saved?.length)
    throw databaseError(
      "Could not reserve booking",
      error ?? { message: "Reservation not returned" },
    );
  if (saved[0]?.reference) row.reference = saved[0].reference;
  const existing = await getBookingById(row.id);
  if (process.env.NODE_ENV !== "production") {
    const local = await readLocal();
    const previous = local.find((item) => item.id === row.id);
    await persistLocally(existing
      ? { ...existing, ...(previous?.created_at ? { created_at: previous.created_at } : {}) }
      : row);
  }
  return existing ?? { ...row, reference: row.reference };
}

const bookingFields =
  "id, reference, status, amount_cents, stripe_session_id, stripe_payment_intent_id, bin_size, postcode, waste_type, delivery_date, pickup_date, hire_period, full_name, email, phone, street_address, placement, access, notes";

export async function getBookingById(id: string) {
  const client = supabase();
  if (client) {
    const { data, error } = await client
      .from("bookings")
      .select(bookingFields)
      .eq("id", id)
      .maybeSingle();
    if (!error && data) return data as StoredBooking;
    if (error && process.env.NODE_ENV === "production")
      throw databaseError("Could not read booking", error);
  }
  return (await readLocal()).find((item) => item.id === id) ?? null;
}

export type CheckoutAttempt = {
  attempt: number;
  stripe_session_id: string | null;
  attempt_status: "creating" | "open" | "processing" | "expired" | "failed" | "paid";
  booking_status: string;
  amount_cents: number;
};

export async function beginCheckoutAttempt(
  bookingId: string,
  expiredSessionId?: string,
): Promise<CheckoutAttempt> {
  const client = supabase();
  if (!client) throw new Error("Booking provider is not configured");
  const { data, error } = await client.rpc("begin_booking_checkout", {
    p_booking_id: bookingId,
    p_expired_session_id: expiredSessionId ?? null,
  });
  if (error) throw databaseError("Could not reserve payment attempt", error);
  const attempt = Array.isArray(data) ? data[0] : data;
  if (!attempt) throw new Error("Could not reserve payment attempt");
  return attempt as CheckoutAttempt;
}

export async function recordCheckoutAttempt(input: {
  bookingId: string;
  attempt: number;
  sessionId: string;
  paymentIntentId?: string | null;
  status: CheckoutAttempt["attempt_status"];
}) {
  const client = supabase();
  if (!client) throw new Error("Booking provider is not configured");
  const { error } = await client.rpc("record_booking_checkout_attempt", {
    p_booking_id: input.bookingId,
    p_attempt: input.attempt,
    p_session_id: input.sessionId,
    p_payment_intent_id: input.paymentIntentId ?? null,
    p_status: input.status,
  });
  if (error) throw databaseError("Could not record payment attempt", error);
}

export async function getCheckoutAttemptBySession(sessionId: string) {
  const client = supabase();
  if (client) {
    const { data, error } = await client
      .from("booking_checkout_attempts")
      .select("booking_id, attempt, status")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();
    if (!error && data) return data as { booking_id: string; attempt: number; status: CheckoutAttempt["attempt_status"] };
    if (error && process.env.NODE_ENV === "production")
      throw databaseError("Could not read payment attempt", error);
  }
  return null;
}
export async function attachCheckoutSession(
  bookingId: string,
  sessionId: string,
) {
  const client = supabase();
  if (client) {
    const { data, error } = await client
      .from("bookings")
      .update({ stripe_session_id: sessionId })
      .eq("id", bookingId)
      .select("id")
      .maybeSingle();
    if (error && process.env.NODE_ENV === "production")
      throw databaseError("Could not attach Stripe session", error);
    if (data) return;
  }
  const existing = await readLocal();
  const row = existing.find((item) => item.id === bookingId);
  if (row) {
    row.stripe_session_id = sessionId;
    await writeLocal(existing);
    return;
  }
  if (process.env.NODE_ENV === "production")
    throw new Error("Booking not found");
}

export async function markBookingPaid(lookup: {
  id?: string;
  stripeSessionId?: string;
  metadataBookingId?: string;
  paymentIntentId?: string;
  amountTotal: number | null;
  currency: string | null;
}) {
  if (!lookup.id || !lookup.stripeSessionId || !lookup.metadataBookingId || !lookup.paymentIntentId ||
      !Number.isInteger(lookup.amountTotal) || lookup.currency?.toLowerCase() !== "aud")
    return null;
  const existingBooking = await getBookingById(lookup.id);
  if (!existingBooking || !verifiedBookingPayment({
    expectedBookingId: existingBooking.id,
    metadataBookingId: lookup.metadataBookingId,
    expectedAmount: existingBooking.amount_cents,
    amountTotal: lookup.amountTotal,
    currency: lookup.currency,
  }))
    return null;
  const client = supabase();
  if (client) {
    const { data: attempt, error: attemptError } = await client
      .from("booking_checkout_attempts")
      .select("booking_id, stripe_session_id")
      .eq("stripe_session_id", lookup.stripeSessionId)
      .maybeSingle();
    if (attemptError && process.env.NODE_ENV === "production")
      throw databaseError("Could not verify payment session", attemptError);
    if (attempt && attempt.booking_id !== lookup.id) return null;
    if (!attempt && process.env.NODE_ENV === "production") return null;
    if (existingBooking.status === "paid") {
      if (existingBooking.stripe_payment_intent_id && lookup.paymentIntentId &&
          existingBooking.stripe_payment_intent_id !== lookup.paymentIntentId) return existingBooking;
      return existingBooking;
    }
    const supplierId =
      existingBooking.postcode
        ? await chooseSupplierForOrder(client, {
            postcode: String(existingBooking.postcode),
            deliveryDate: existingBooking.delivery_date,
            pickupDate: existingBooking.pickup_date,
          })
        : null;
    const changes: Record<string, string> = {
      status: "paid",
      stripe_session_id: lookup.stripeSessionId,
    };
    if (lookup.paymentIntentId) changes.stripe_payment_intent_id = lookup.paymentIntentId;
    if (supplierId) {
      changes.supplier_id = supplierId;
      changes.operation_status = "assigned";
      changes.assigned_at = new Date().toISOString();
    }
    const query = client.from("bookings").update(changes)
      .eq("status", "pending").eq("id", lookup.id);
    const { data, error } = await query
      .select(
        bookingFields,
      )
      .maybeSingle();
    if (!error && data) return data as StoredBooking;
    if (error && process.env.NODE_ENV === "production")
      throw databaseError("Could not mark booking paid", error);
    if (!data) return getBookingById(lookup.id);
  }

  const existing = await readLocal();
  const row = existing.find((item) =>
    Boolean(
      (lookup.id && item.id === lookup.id) ||
        (lookup.stripeSessionId &&
          item.stripe_session_id === lookup.stripeSessionId),
    ),
  );
  if (!row) return null;
  row.stripe_session_id = lookup.stripeSessionId;
  if (lookup.paymentIntentId) row.stripe_payment_intent_id = lookup.paymentIntentId;
  if (row.amount_cents !== lookup.amountTotal) return null;
  row.status = "paid";
  await writeLocal(existing);
  return row;
}

export async function getBookingByCheckoutSession(sessionId: string) {
  const client = supabase();
  if (client) {
    const { data, error } = await client
      .from("booking_checkout_attempts")
      .select("booking_id")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();
    if (!error && data) return getBookingById(String(data.booking_id));
    if (error && process.env.NODE_ENV === "production")
      throw databaseError("Could not find payment session", error);
    const legacy = await client.from("bookings").select(bookingFields)
      .eq("stripe_session_id", sessionId).maybeSingle();
    if (!legacy.error && legacy.data) return legacy.data as StoredBooking;
  }
  const existing = await readLocal();
  return existing.find((item) => item.stripe_session_id === sessionId) ?? null;
}
