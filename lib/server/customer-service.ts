import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

export type CustomerIdentity = {
  id: string;
  code: string;
  stripeCustomerId: string | null;
  storage: "database" | "local" | "ephemeral";
};

type CustomerDetails = {
  fullName: string;
  email: string;
  phone: string;
};

type CustomerRow = {
  id: string;
  customer_code: string;
  full_name: string;
  email: string;
  normalized_email: string;
  phone: string;
  stripe_customer_id: string | null;
  created_at?: string;
  updated_at?: string;
};

function secretKey() {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ""
  );
}

function supabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = secretKey();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function normalizeCustomerEmail(email: string) {
  return email.trim().toLowerCase();
}

export function newCustomerCode() {
  return `CUS-${randomBytes(6).toString("hex").toUpperCase()}`;
}

function toIdentity(row: CustomerRow, storage: CustomerIdentity["storage"]): CustomerIdentity {
  return {
    id: row.id,
    code: row.customer_code,
    stripeCustomerId: row.stripe_customer_id,
    storage,
  };
}

function customerFile() {
  return path.join(process.cwd(), ".data", "customers.json");
}

async function readLocal(): Promise<CustomerRow[]> {
  try {
    const parsed = JSON.parse(await readFile(customerFile(), "utf8")) as unknown;
    return Array.isArray(parsed) ? (parsed as CustomerRow[]) : [];
  } catch {
    return [];
  }
}

async function writeLocal(rows: CustomerRow[]) {
  await mkdir(path.dirname(customerFile()), { recursive: true });
  await writeFile(customerFile(), `${JSON.stringify(rows, null, 2)}\n`);
}

function createRow(details: CustomerDetails): CustomerRow {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    customer_code: newCustomerCode(),
    full_name: details.fullName.trim(),
    email: details.email.trim(),
    normalized_email: normalizeCustomerEmail(details.email),
    phone: details.phone.trim(),
    stripe_customer_id: null,
    created_at: now,
    updated_at: now,
  };
}

async function resolveLocalCustomer(details: CustomerDetails) {
  const rows = await readLocal();
  const normalizedEmail = normalizeCustomerEmail(details.email);
  const existing = rows.find((row) => row.normalized_email === normalizedEmail);
  if (existing) {
    existing.full_name = details.fullName.trim();
    existing.email = details.email.trim();
    existing.phone = details.phone.trim();
    existing.updated_at = new Date().toISOString();
    await writeLocal(rows);
    return toIdentity(existing, "local");
  }

  const row = createRow(details);
  rows.push(row);
  await writeLocal(rows);
  return toIdentity(row, "local");
}

export async function resolveCustomer(details: CustomerDetails): Promise<CustomerIdentity> {
  const client = supabase();
  const normalizedEmail = normalizeCustomerEmail(details.email);

  if (client) {
    const fields = "id, customer_code, full_name, email, normalized_email, phone, stripe_customer_id";
    const { data: existing, error: lookupError } = await client
      .from("customers")
      .select(fields)
      .eq("normalized_email", normalizedEmail)
      .maybeSingle();

    if (!lookupError && existing) {
      const { data: updated, error: updateError } = await client
        .from("customers")
        .update({
          full_name: details.fullName.trim(),
          email: details.email.trim(),
          phone: details.phone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select(fields)
        .single();
      return toIdentity((!updateError && updated ? updated : existing) as CustomerRow, "database");
    }

    if (!lookupError) {
      const row = createRow(details);
      let createError: { code?: string } | null = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const result = await client.from("customers").insert(row).select(fields).single();
        createError = result.error;
        if (!result.error && result.data) return toIdentity(result.data as CustomerRow, "database");

        if (result.error?.code !== "23505") break;

        // A simultaneous request can create the same normalized email first.
        const { data: winner } = await client
          .from("customers")
          .select(fields)
          .eq("normalized_email", normalizedEmail)
          .maybeSingle();
        if (winner) return toIdentity(winner as CustomerRow, "database");

        // Otherwise the readable code collided; keep the UUID and retry a code.
        row.customer_code = newCustomerCode();
      }

      console.warn("[customers] Customer table write unavailable", { code: createError?.code });
    } else {
      console.warn("[customers] Customer table unavailable", { code: lookupError.code });
    }
  }

  if (process.env.NODE_ENV !== "production") return resolveLocalCustomer(details);

  const row = createRow(details);
  return toIdentity(row, "ephemeral");
}

async function saveStripeCustomerId(customer: CustomerIdentity, stripeCustomerId: string) {
  if (customer.storage === "database") {
    const client = supabase();
    if (!client) return;
    const { error } = await client
      .from("customers")
      .update({ stripe_customer_id: stripeCustomerId, updated_at: new Date().toISOString() })
      .eq("id", customer.id);
    if (error) console.warn("[customers] Could not save Stripe customer ID", { code: error.code });
    return;
  }

  if (customer.storage === "local") {
    const rows = await readLocal();
    const row = rows.find((item) => item.id === customer.id);
    if (row) {
      row.stripe_customer_id = stripeCustomerId;
      row.updated_at = new Date().toISOString();
      await writeLocal(rows);
    }
  }
}

export async function ensureStripeCustomer(
  stripe: Stripe,
  customer: CustomerIdentity,
  details: CustomerDetails,
) {
  if (customer.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(customer.stripeCustomerId);
      if (!existing.deleted) return existing.id;
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? error.code : undefined;
      if (code !== "resource_missing") throw error;
    }
  }

  const created = await stripe.customers.create(
    {
      email: normalizeCustomerEmail(details.email),
      name: details.fullName.trim(),
      phone: details.phone.trim(),
      metadata: {
        customerId: customer.id,
        customerCode: customer.code,
      },
    },
    { idempotencyKey: `skipbins-customer-${customer.id}-${customer.stripeCustomerId ?? "new"}` },
  );
  await saveStripeCustomerId(customer, created.id);
  return created.id;
}
