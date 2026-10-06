// Fictional sample records only. Run: npm run seed:demo (uses .env).
const { loadEnvConfig } = require("@next/env");
const { createClient } = require("@supabase/supabase-js");
const { createHash } = require("node:crypto");
loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const id = (kind, i) => {
  const h = createHash("sha256")
    .update("skipbins-demo-v1-" + kind + "-" + i)
    .digest("hex");
  return (
    h.slice(0, 8) +
    "-" +
    h.slice(8, 12) +
    "-4" +
    h.slice(13, 16) +
    "-a" +
    h.slice(17, 20) +
    "-" +
    h.slice(20, 32)
  );
};
const localities = [
  { suburb: "Melbourne", postcode: "3000" },
  { suburb: "Richmond", postcode: "3121" },
  { suburb: "Brunswick", postcode: "3056" },
  { suburb: "Footscray", postcode: "3011" },
];
function date(offset) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const d = new Date(today + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Configure the server Supabase URL and secret key in .env.",
    );
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const existing = await db
    .from("suppliers")
    .select("id")
    .not("auth_user_id", "is", null)
    .eq("status", "active")
    .order("created_at")
    .limit(1);
  if (existing.error)
    throw new Error(
      "Supplier schema unavailable. Apply the operations and admin migrations first.",
    );
  const suppliers = localities.map((place, i) => ({
    id: id("supplier", i),
    name: "DEMO " + place.suburb + " Skip Bins",
    contact_name: "Demo Partner " + (i + 1),
    email: "supplier" + (i + 1) + "@example.invalid",
    phone: "0000000000",
    service_area: place.postcode,
    status: "active",

    abn: "",
    rating: 4 + i / 10,
  }));
  const customers = localities.map((_, i) => ({
    id: id("customer", i),
    customer_code: "DEMO-CUST-00" + (i + 1),
    full_name: "Demo Customer " + (i + 1),
    email: "customer" + (i + 1) + "@example.invalid",
    normalized_email: "customer" + (i + 1) + "@example.invalid",
    phone: "0000000000",
    status: "active",
  }));
  const linkedSupplier = existing.data?.[0]?.id || suppliers[0].id;
  const states = ["scheduled", "collection_due", "issue", "collected"];
  const sizes = ["2m3", "4m3", "6m3", "3m3"];
  const bookings = localities.map((place, i) => ({
    id: id("booking", i),
    reference: "DEMO-JOB-00" + (i + 1),
    customer_id: customers[i].id,
    bin_size: sizes[i],
    postcode: place.postcode,
    waste_type: i === 1 ? "green" : "general",
    delivery_date: date(i === 0 ? 0 : -10 - i),
    pickup_date: date(i === 0 ? 10 : i === 1 ? 0 : -i),
    hire_period: "Standard (10 days)",
    full_name: customers[i].full_name,
    email: customers[i].email,
    phone: "0000000000",
    street_address: "Demo site " + (i + 1) + ", " + place.suburb,
    placement: "Driveway",
    access: "Fictional sample address; do not dispatch.",
    notes:
      "DEMO ONLY: fictional test job and payment. No real customer or payment exists.",
    status: "paid",
    amount_cents: [35000, 55000, 75000, 45000][i],
    operation_status: states[i],
    supplier_id: linkedSupplier,
    supplier_notes:
      i === 2
        ? "DEMO: collection access blocked; follow up with sample customer."
        : "",
    booking_source: i === 1 ? "ppc" : i === 2 ? "manual" : "direct",
  }));
  for (const [table, rows] of [
    ["suppliers", suppliers],
    ["customers", customers],
    ["bookings", bookings],
  ]) {
    const result = await db
      .from(table)
      .upsert(rows, { onConflict: "id", ignoreDuplicates: true })
      .select("id");
    if (result.error)
      throw new Error(
        "Could not seed " +
          table +
          ". Check schema and server database access. Code: " +
          result.error.code,
      );
    console.log(
      table + ": " + (result.data?.length ?? 0) + " new sample records.",
    );
  }
  console.log(
    "Four DEMO jobs are assigned to " +
      (existing.data?.length
        ? "the earliest active linked supplier account."
        : "DEMO Melbourne Skip Bins. Link its Auth user ID in admin Suppliers to view the jobs in the supplier portal."),
  );
  console.log(
    "Existing records and previously edited demo records were preserved. Sample payments are fictional and appear in reports.",
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
