import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isOperationStatus, type OperationStatus } from "@/lib/data/operations";

export type SupplierRecord = {
  id: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  service_area: string;
  status: "active" | "paused";
  bin_inventory: Record<string, number>;
  auth_user_id: string | null;
};

export type OperationsBooking = {
  id: string;
  reference: string;
  payment_status: string;
  operation_status: OperationStatus;
  amount_cents: number;
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
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_notes: string;
  created_at: string;
  manageable: boolean;
};

export type OperationsSnapshot = {
  bookings: OperationsBooking[];
  suppliers: SupplierRecord[];
  setupRequired: boolean;
  serverConfigured: boolean;
  supplierSchemaReady: boolean;
};

function adminDatabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function localBookingsFile() {
  return path.join(process.cwd(), ".data", "bookings.json");
}

async function localRows(): Promise<Record<string, unknown>[]> {
  try {
    const parsed = JSON.parse(await readFile(localBookingsFile(), "utf8")) as unknown;
    return Array.isArray(parsed) ? parsed as Record<string, unknown>[] : [];
  } catch {
    return [];
  }
}

function text(row: Record<string, unknown>, key: string, fallback = "") {
  return typeof row[key] === "string" ? row[key] as string : fallback;
}

function number(row: Record<string, unknown>, key: string) {
  return typeof row[key] === "number" ? row[key] as number : 0;
}

function normalizeSupplier(row: Record<string, unknown>): SupplierRecord {
  const inventory = row.bin_inventory && typeof row.bin_inventory === "object" && !Array.isArray(row.bin_inventory)
    ? row.bin_inventory as Record<string, number>
    : {};
  return {
    id: text(row, "id"),
    name: text(row, "name", "Unnamed supplier"),
    contact_name: text(row, "contact_name"),
    email: text(row, "email"),
    phone: text(row, "phone"),
    service_area: text(row, "service_area"),
    status: text(row, "status") === "paused" ? "paused" : "active",
    bin_inventory: inventory,
    auth_user_id: text(row, "auth_user_id") || null,
  };
}

function normalizeBooking(row: Record<string, unknown>, index: number, suppliers: Map<string, SupplierRecord>): OperationsBooking {
  const paymentStatus = text(row, "status", "pending");
  const storedOperation = row.operation_status;
  const supplierId = text(row, "supplier_id") || null;
  const operationStatus: OperationStatus = supplierId && isOperationStatus(storedOperation)
    ? storedOperation
    : paymentStatus !== "paid"
      ? "payment_pending"
      : isOperationStatus(storedOperation) && storedOperation !== "payment_pending"
        ? storedOperation
        : "unassigned";
  return {
    id: text(row, "id", `legacy-${index}`),
    reference: text(row, "reference", "Legacy booking"),
    payment_status: paymentStatus,
    operation_status: operationStatus,
    amount_cents: number(row, "amount_cents"),
    bin_size: text(row, "bin_size"),
    postcode: text(row, "postcode"),
    waste_type: text(row, "waste_type"),
    delivery_date: text(row, "delivery_date"),
    pickup_date: text(row, "pickup_date"),
    hire_period: text(row, "hire_period"),
    full_name: text(row, "full_name"),
    email: text(row, "email"),
    phone: text(row, "phone"),
    street_address: text(row, "street_address"),
    placement: text(row, "placement"),
    access: text(row, "access"),
    notes: text(row, "notes"),
    supplier_id: supplierId,
    supplier_name: supplierId ? suppliers.get(supplierId)?.name ?? "Unknown supplier" : null,
    supplier_notes: text(row, "supplier_notes"),
    created_at: text(row, "created_at"),
    manageable: Boolean(text(row, "id")),
  };
}

export async function getOperationsSnapshot(): Promise<OperationsSnapshot> {
  const client = adminDatabase();
  let setupRequired = false;
  let supplierSchemaReady = false;
  let bookingRows: Record<string, unknown>[] = [];
  let supplierRows: Record<string, unknown>[] = [];

  if (client) {
    const [bookingsResult, suppliersResult] = await Promise.all([
      client.from("bookings").select("*").order("created_at", { ascending: false }).limit(500),
      client.from("suppliers").select("*").order("name", { ascending: true }),
    ]);
    if (!bookingsResult.error) bookingRows = (bookingsResult.data ?? []) as Record<string, unknown>[];
    if (!suppliersResult.error) {
      supplierRows = (suppliersResult.data ?? []) as Record<string, unknown>[];
      supplierSchemaReady = true;
    }
    else setupRequired = true;
  }

  if (!bookingRows.length && process.env.NODE_ENV !== "production") bookingRows = await localRows();
  const suppliers = supplierRows.map(normalizeSupplier);
  const supplierMap = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  const bookings = bookingRows.map((row, index) => normalizeBooking(row, index, supplierMap));
  return {
    bookings,
    suppliers,
    setupRequired: setupRequired || !client,
    serverConfigured: Boolean(client),
    supplierSchemaReady,
  };
}

export async function getSupplierByUser(userId: string, metadataSupplierId?: string) {
  const client = adminDatabase();
  if (!client) return null;
  let query = client.from("suppliers").select("*");
  query = metadataSupplierId ? query.eq("id", metadataSupplierId) : query.eq("auth_user_id", userId);
  const { data, error } = await query.maybeSingle();
  return error || !data ? null : normalizeSupplier(data as Record<string, unknown>);
}

export async function getSupplierOperations(userId: string, metadataSupplierId?: string) {
  const supplier = await getSupplierByUser(userId, metadataSupplierId);
  if (!supplier) return { supplier: null, bookings: [] as OperationsBooking[] };
  const snapshot = await getOperationsSnapshot();
  return { supplier, bookings: snapshot.bookings.filter((booking) => booking.supplier_id === supplier.id) };
}

export async function updateOrderOperations(input: { bookingId: string; supplierId?: string | null; status?: OperationStatus; notes?: string }) {
  const changes: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.supplierId !== undefined) {
    changes.supplier_id = input.supplierId;
    changes.assigned_at = input.supplierId ? new Date().toISOString() : null;
    if (input.status === undefined) changes.operation_status = input.supplierId ? "assigned" : "unassigned";
  }
  if (input.status !== undefined) changes.operation_status = input.status;
  if (input.notes !== undefined) changes.supplier_notes = input.notes;

  const client = adminDatabase();
  if (client) {
    const { data, error } = await client.from("bookings").update(changes).eq("id", input.bookingId).select("id").maybeSingle();
    if (error) throw new Error(`Could not update order: ${error.message}`);
    if (!data) throw new Error("Order not found");
    return;
  }
  if (process.env.NODE_ENV === "production") throw new Error("Operations database is not configured");
  const rows = await localRows();
  const row = rows.find((item) => item.id === input.bookingId);
  if (!row) throw new Error("Order not found");
  Object.assign(row, changes);
  await writeFile(localBookingsFile(), `${JSON.stringify(rows, null, 2)}\n`);
}

export type SupplierInput = Omit<SupplierRecord, "id">;

export async function createSupplier(input: SupplierInput) {
  const client = adminDatabase();
  if (!client) throw new Error("Operations database is not configured");
  const { data, error } = await client.from("suppliers").insert(input).select("*").single();
  if (error) throw new Error(`Could not create supplier: ${error.message}`);
  return normalizeSupplier(data as Record<string, unknown>);
}

export async function updateSupplier(supplierId: string, changes: Partial<SupplierInput>) {
  const client = adminDatabase();
  if (!client) throw new Error("Operations database is not configured");
  const { data, error } = await client.from("suppliers").update({ ...changes, updated_at: new Date().toISOString() }).eq("id", supplierId).select("*").maybeSingle();
  if (error) throw new Error(`Could not update supplier: ${error.message}`);
  if (!data) throw new Error("Supplier not found");
  return normalizeSupplier(data as Record<string, unknown>);
}
