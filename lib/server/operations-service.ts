import { readAllRows } from "@/lib/server/admin-database";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { InputError } from "@/lib/server/request";
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

  auth_user_id: string | null;
  abn?: string;
  rating?: number;
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
  booking_source?: "direct" | "ppc" | "manual";
};

export type OperationsSnapshot = {
  bookings: OperationsBooking[];
  suppliers: SupplierRecord[];
  setupRequired: boolean;
  serverConfigured: boolean;
  supplierSchemaReady: boolean;
  error: string;
};

function adminDatabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function localBookingsFile() {
  return path.join(process.cwd(), ".data", "bookings.json");
}

async function localRows(): Promise<Record<string, unknown>[]> {
  try {
    const parsed = JSON.parse(
      await readFile(localBookingsFile(), "utf8"),
    ) as unknown;
    return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
  } catch {
    return [];
  }
}

function text(row: Record<string, unknown>, key: string, fallback = "") {
  return typeof row[key] === "string" ? (row[key] as string) : fallback;
}

function number(row: Record<string, unknown>, key: string) {
  return typeof row[key] === "number" ? (row[key] as number) : 0;
}

function normalizeSupplier(row: Record<string, unknown>): SupplierRecord {
  return {
    id: text(row, "id"),
    name: text(row, "name", "Unnamed supplier"),
    contact_name: text(row, "contact_name"),
    email: text(row, "email"),
    phone: text(row, "phone"),
    service_area: text(row, "service_area"),
    status: text(row, "status") === "paused" ? "paused" : "active",

    auth_user_id: text(row, "auth_user_id") || null,
    abn: text(row, "abn"),
    rating: number(row, "rating"),
  };
}

function normalizeBooking(
  row: Record<string, unknown>,
  index: number,
  suppliers: Map<string, SupplierRecord>,
): OperationsBooking {
  const paymentStatus = text(row, "status", "pending");
  const storedOperation = row.operation_status;
  const supplierId = text(row, "supplier_id") || null;
  const operationStatus: OperationStatus =
    supplierId && isOperationStatus(storedOperation)
      ? storedOperation
      : paymentStatus !== "paid"
        ? "payment_pending"
        : isOperationStatus(storedOperation) &&
            storedOperation !== "payment_pending"
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
    supplier_name: supplierId
      ? (suppliers.get(supplierId)?.name ?? "Unknown supplier")
      : null,
    supplier_notes: text(row, "supplier_notes"),
    created_at: text(row, "created_at"),
    manageable: Boolean(text(row, "id")),
    booking_source:
      row.booking_source === "ppc" || row.booking_source === "manual"
        ? row.booking_source
        : "direct",
  };
}

export async function getOperationsSnapshot(): Promise<OperationsSnapshot> {
  const client = adminDatabase();
  let setupRequired = false;
  let snapshotError = "";
  let supplierSchemaReady = false;
  let bookingRows: Record<string, unknown>[] = [];
  let supplierRows: Record<string, unknown>[] = [];

  if (client) {
    const [bookingsResult, suppliersResult] = await Promise.all([
      readAllRows(client, "bookings"),
      readAllRows(client, "suppliers", "*", "name", true),
    ]);
    if (!bookingsResult.error) bookingRows = bookingsResult.data;
    else
      snapshotError =
        "Booking records could not be loaded. Reports are unavailable until the database connection is restored.";
    if (!suppliersResult.error) {
      supplierRows = (suppliersResult.data ?? []) as Record<string, unknown>[];
      supplierSchemaReady = true;
    } else setupRequired = true;
  }

  if (!client && process.env.NODE_ENV !== "production")
    bookingRows = await localRows();
  const suppliers = supplierRows.map(normalizeSupplier);
  const supplierMap = new Map(
    suppliers.map((supplier) => [supplier.id, supplier]),
  );
  const bookings = bookingRows.map((row, index) =>
    normalizeBooking(row, index, supplierMap),
  );
  return {
    bookings,
    suppliers,
    setupRequired: setupRequired || !client,
    serverConfigured: Boolean(client),
    supplierSchemaReady,
    error: snapshotError,
  };
}

export async function getSupplierByUser(
  userId: string,
  metadataSupplierId?: string,
) {
  const client = adminDatabase();
  if (!client) return null;
  let query = client.from("suppliers").select("*");
  query = metadataSupplierId
    ? query.eq("id", metadataSupplierId)
    : query.eq("auth_user_id", userId);
  const { data, error } = await query.maybeSingle();
  return error || !data
    ? null
    : normalizeSupplier(data as Record<string, unknown>);
}

export async function getSupplierOperations(
  userId: string,
  metadataSupplierId?: string,
) {
  const supplier = await getSupplierByUser(userId, metadataSupplierId);
  if (!supplier)
    return { supplier: null, bookings: [] as OperationsBooking[], error: "" };
  const snapshot = await getOperationsSnapshot();
  return {
    supplier,
    error: snapshot.error,
    bookings: snapshot.bookings.filter(
      (booking) => booking.supplier_id === supplier.id,
    ),
  };
}

export async function updateOrderOperations(input: {
  bookingId: string;
  supplierId?: string | null;
  status?: OperationStatus;
  notes?: string;
  source?: "direct" | "ppc" | "manual";
}) {
  const db = adminDatabase();
  if (db) {
    const { data: current, error: readError } = await db
      .from("bookings")
      .select("status,supplier_id,postcode")
      .eq("id", input.bookingId)
      .single();
    if (readError || !current) throw new Error("Order not found");
    if (input.supplierId) {
      const { data: supplier, error } = await db
        .from("suppliers")
        .select("status,service_area")
        .eq("id", input.supplierId)
        .single();
      if (error || supplier?.status !== "active")
        throw new InputError("Choose an active supplier.");
      if (
        supplier.service_area &&
        !supplier.service_area
          .split(",")
          .map((p: string) => p.trim())
          .includes(current.postcode)
      )
        throw new InputError(
          "This supplier does not cover the booking postcode.",
        );
    }
    const nextSupplier =
      input.supplierId === undefined ? current.supplier_id : input.supplierId;
    if (
      input.status &&
      !["payment_pending", "cancelled", "issue", "unassigned"].includes(
        input.status,
      ) &&
      !nextSupplier
    )
      throw new InputError("Assign a supplier before advancing this booking.");
    if (
      current.status !== "paid" &&
      ((input.status &&
        !["payment_pending", "cancelled", "issue"].includes(input.status)) ||
        input.supplierId)
    )
      throw new InputError("Payment is required before dispatch.");
    if (
      input.supplierId === null &&
      input.status === undefined &&
      current.status !== "paid"
    )
      input.status = "payment_pending";
  }
  const changes: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.supplierId !== undefined) {
    changes.supplier_id = input.supplierId;
    changes.assigned_at = input.supplierId ? new Date().toISOString() : null;
    if (input.status === undefined)
      changes.operation_status = input.supplierId ? "assigned" : "unassigned";
  }
  if (input.status !== undefined) changes.operation_status = input.status;
  if (input.notes !== undefined) changes.supplier_notes = input.notes;
  if (input.source !== undefined) changes.booking_source = input.source;

  const client = adminDatabase();
  if (client) {
    const { data, error } = await client
      .from("bookings")
      .update(changes)
      .eq("id", input.bookingId)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`Could not update order: ${error.message}`);
    if (!data) throw new Error("Order not found");
    return;
  }
  if (process.env.NODE_ENV === "production")
    throw new Error("Operations database is not configured");
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
  const { data, error } = await client
    .from("suppliers")
    .insert(input)
    .select("*")
    .single();
  if (error) throw new Error(`Could not create supplier: ${error.message}`);
  return normalizeSupplier(data as Record<string, unknown>);
}

export async function updateSupplier(
  supplierId: string,
  changes: Partial<SupplierInput>,
) {
  const client = adminDatabase();
  if (!client) throw new Error("Operations database is not configured");
  const { data, error } = await client
    .from("suppliers")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("id", supplierId)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`Could not update supplier: ${error.message}`);
  if (!data) throw new Error("Supplier not found");
  return normalizeSupplier(data as Record<string, unknown>);
}

export type SupplierApplication = {
  id: string;
  auth_user_id: string;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  abn: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

function normalizeApplication(
  row: Record<string, unknown>,
): SupplierApplication {
  const status = text(row, "status");
  return {
    id: text(row, "id"),
    auth_user_id: text(row, "auth_user_id"),
    company_name: text(row, "company_name"),
    contact_name: text(row, "contact_name"),
    phone: text(row, "phone"),
    email: text(row, "email"),
    abn: text(row, "abn"),
    status: status === "approved" || status === "rejected" ? status : "pending",
    created_at: text(row, "created_at"),
  };
}

export async function listSupplierApplications() {
  const client = adminDatabase();
  if (!client) return [] as SupplierApplication[];
  const { data, error } = await client
    .from("supplier_applications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [] as SupplierApplication[];
  return (data as Record<string, unknown>[]).map(normalizeApplication);
}

export async function createSupplierApplication(input: {
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  abn: string;
  password: string;
}) {
  const client = adminDatabase();
  if (!client) throw new Error("Supplier applications are not configured");
  const { data: authData, error: authError } =
    await client.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      app_metadata: { role: "supplier_pending" },
    });
  if (authError || !authData.user)
    throw new Error(authError?.message || "Could not create supplier account");
  const { data, error } = await client
    .from("supplier_applications")
    .insert({
      auth_user_id: authData.user.id,
      company_name: input.companyName,
      contact_name: input.contactName,
      phone: input.phone,
      email: input.email,
      abn: input.abn,
    })
    .select("*")
    .single();
  if (error) {
    await client.auth.admin.deleteUser(authData.user.id).catch(() => undefined);
    throw new Error(`Could not submit supplier application: ${error.message}`);
  }
  return normalizeApplication(data as Record<string, unknown>);
}

export async function reviewSupplierApplication(
  applicationId: string,
  decision: "approved" | "rejected",
  adminUserId: string,
) {
  const client = adminDatabase();
  if (!client) throw new Error("Operations database is not configured");
  const { data, error } = await client
    .from("supplier_applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();
  if (error || !data) throw new Error("Supplier application not found");
  const application = normalizeApplication(data as Record<string, unknown>);
  if (application.status !== "pending")
    throw new Error("This application has already been reviewed");

  if (decision === "approved") {
    const { data: supplierData, error: supplierError } = await client
      .from("suppliers")
      .insert({
        auth_user_id: application.auth_user_id,
        name: application.company_name,
        contact_name: application.contact_name,
        email: application.email,
        phone: application.phone,
        service_area: "",
        status: "active",
      })
      .select("*")
      .single();
    if (supplierError || !supplierData)
      throw new Error(
        supplierError?.message || "Could not create supplier profile",
      );
    const supplier = normalizeSupplier(supplierData as Record<string, unknown>);
    const { data: authData } = await client.auth.admin.getUserById(
      application.auth_user_id,
    );
    const metadata = authData.user?.app_metadata ?? {};
    const { error: metadataError } = await client.auth.admin.updateUserById(
      application.auth_user_id,
      {
        app_metadata: {
          ...metadata,
          role: "supplier",
          supplier_id: supplier.id,
        },
      },
    );
    if (metadataError) {
      await client.from("suppliers").delete().eq("id", supplier.id);
      throw new Error(
        `Could not activate supplier login: ${metadataError.message}`,
      );
    }
  } else {
    const { data: authData } = await client.auth.admin.getUserById(
      application.auth_user_id,
    );
    const metadata = authData.user?.app_metadata ?? {};
    const { error: metadataError } = await client.auth.admin.updateUserById(
      application.auth_user_id,
      { app_metadata: { ...metadata, role: "supplier_rejected" } },
    );
    if (metadataError)
      throw new Error(
        `Could not update supplier login: ${metadataError.message}`,
      );
  }

  const { error: reviewError } = await client
    .from("supplier_applications")
    .update({
      status: decision,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUserId,
    })
    .eq("id", applicationId);
  if (reviewError)
    throw new Error(`Could not complete review: ${reviewError.message}`);
}
