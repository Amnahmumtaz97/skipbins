const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  assert = require("node:assert/strict"),
  ts = require("typescript");
const root = path.resolve(__dirname, ".."),
  originalLoad = Module._load;
let config,
  localities = [{ suburb: "MELBOURNE", postcode: "3000", state: "VIC" }],
  stockRows = [],
  adminUser = null;
Module._load = function (id, parent, isMain) {
  if (id === "server-only") return {};
  if (id === "@/lib/server/portal-service")
    return {
      getPortalConfig: async () => config,
      savePortalSettings: async () => {},
      saveRate: async () => {},
    };
  if (id === "@/lib/server/victorian-localities")
    return { victorianLocalities: async () => localities };
  if (id === "@/lib/supabase/server")
    return {
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: adminUser } }) },
      }),
    };
  if (id === "@/lib/server/admin-database")
    return {
      adminDatabase: () => ({
        from: () => ({
          select() {
            return this;
          },
          eq() {
            return this;
          },
          neq() {
            return this;
          },
          lte() {
            return this;
          },
          gte: async () => ({ data: stockRows, error: null }),
        }),
      }),
    };
  if (id.startsWith("@/")) id = path.join(root, id.slice(2));
  return originalLoad.call(this, id, parent, isMain);
};
require.extensions[".ts"] = function (module, file) {
  module._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    file,
  );
};
const {
  defaultSettings,
  defaultRates,
  rateForDate,
  melbourneDate,
} = require("../lib/admin-config.ts");
const {
  validateRate,
  validateSettings,
  validateRules,
} = require("../lib/server/portal-validation.ts");
const { reportPeriod, summarizePayouts } = require("../lib/payouts.ts");
const {
  selectedAddressLocationError,
} = require("../lib/address-validation.ts");
const {
  validateQuote,
  lookupQuote,
} = require("../lib/server/quote-service.ts");
const {
  todayIsoDate,
  addDaysIso,
  standardPickupDate,
} = require("../lib/booking-utils.ts");
let passed = 0;
async function test(name, fn) {
  await fn();
  passed++;
  console.log("PASS", name);
}
const booking = (changes = {}) => ({
  id: "1",
  reference: "TEST-1",
  payment_status: "paid",
  operation_status: "delivered",
  amount_cents: 101,
  created_at: "2026-10-01T00:00:00Z",
  delivery_date: "2026-10-02",
  supplier_id: "s1",
  booking_source: "direct",
  ...changes,
});
(async () => {
  await test("Valid rates retain null (unlimited) and zero stock distinctly", () => {
    assert.equal(validateRate(defaultRates()[0]).stock, null);
    assert.equal(validateRate({ ...defaultRates()[0], stock: 0 }).stock, 0);
  });
  await test("Rates reject negative money, fractional stock and incompatible heavy waste", () => {
    assert.throws(() => validateRate({ ...defaultRates()[0], price: -1 }));
    assert.throws(() => validateRate({ ...defaultRates()[0], stock: 1.5 }));
    assert.throws(() =>
      validateRate({ ...defaultRates()[0], binId: "12m3", wasteId: "soil" }),
    );
  });
  await test("Invalid calendar dates and overlapping rules are rejected", () => {
    assert.throws(() =>
      validateRules([
        {
          id: "x",
          start: "2026-02-30",
          end: "2026-03-01",
          blocked: true,
          price: null,
        },
      ]),
    );
    assert.throws(() =>
      validateRules([
        {
          id: "a",
          start: "2026-10-01",
          end: "2026-10-05",
          blocked: true,
          price: null,
        },
        {
          id: "b",
          start: "2026-10-05",
          end: "2026-10-06",
          blocked: false,
          price: 300,
        },
      ]),
    );
  });
  await test("Date overrides include boundaries, block dates and restore base price", () => {
    const r = {
      ...defaultRates()[0],
      overrides: [
        {
          id: "a",
          start: "2026-10-01",
          end: "2026-10-02",
          blocked: false,
          price: 222,
        },
        {
          id: "b",
          start: "2026-10-03",
          end: "2026-10-03",
          blocked: true,
          price: null,
        },
      ],
    };
    assert.equal(rateForDate(r, "2026-10-02").price, 222);
    assert.equal(rateForDate(r, "2026-10-03").available, false);
    assert.equal(rateForDate(r, "2026-10-04").price, r.price);
  });
  await test("Settings reject invalid operating hours and excessive combined fees", () => {
    const s = structuredClone(defaultSettings);
    s.profile.hours[0].to = "06:00";
    assert.throws(() => validateSettings(s));
    assert.throws(() =>
      validateSettings({
        ...defaultSettings,
        commissionPercent: 80,
        stripeFeePercent: 30,
      }),
    );
  });
  await test("Fortnight shortcuts cross year and leap-month boundaries", () => {
    assert.deepEqual(reportPeriod("2027-01-04", "due"), {
      start: "2026-12-16",
      end: "2026-12-31",
    });
    assert.deepEqual(reportPeriod("2028-02-20", "fortnight"), {
      start: "2028-02-16",
      end: "2028-02-29",
    });
    assert.deepEqual(reportPeriod("2026-12-20", "next"), {
      start: "2027-01-01",
      end: "2027-01-15",
    });
  });
  await test("Reports distinguish creation and delivery, excluding cancellations, unpaid and future jobs", () => {
    const rows = [
      booking(),
      booking({ id: "2", operation_status: "cancelled" }),
      booking({ id: "3", payment_status: "pending" }),
      booking({ id: "4", delivery_date: "2026-10-20" }),
      booking({ id: "5", created_at: "2026-09-01T00:00:00Z" }),
    ];
    const r = summarizePayouts(
      rows,
      { start: "2026-10-01", end: "2026-10-31" },
      "2026-10-06",
      10,
      2,
    );
    assert.equal(r.created.length, 4);
    assert.equal(r.paidCreated.length, 2);
    assert.equal(r.payable.length, 2);
    assert.equal(r.revenue, 202);
    assert.equal(r.commissionCents, 20);
    assert.equal(r.feeCents, 4);
    assert.equal(r.net, 178);
  });
  await test("PPC exclusions apply per supplier", () => {
    const r = summarizePayouts(
      [
        booking({ booking_source: "ppc" }),
        booking({ id: "2", supplier_id: "s2", booking_source: "ppc" }),
        booking({ id: "3" }),
      ],
      { start: "2026-10-01", end: "2026-10-31" },
      "2026-10-06",
      0,
      0,
      ["s1"],
    );
    assert.equal(r.payable.length, 2);
  });
  await test("Timestamp reporting uses the Melbourne date", () =>
    assert.equal(melbourneDate("2026-09-30T15:00:00Z"), "2026-10-01"));
  await test("Delivery addresses reject non-Victorian states and wrong shared-postcode suburbs", () => {
    assert.ok(
      selectedAddressLocationError(
        "1 Example St, SYDNEY NSW 3000",
        "3000",
        "MELBOURNE, VIC 3000",
      ),
    );
    assert.ok(
      selectedAddressLocationError(
        "1 Example St, CARLTON VIC 3000",
        "3000",
        "MELBOURNE, VIC 3000",
      ),
    );
    assert.equal(
      selectedAddressLocationError(
        "1 Example St, MELBOURNE VIC 3000",
        "3000",
        "MELBOURNE, VIC 3000",
      ),
      "",
    );
  });
  let date = addDaysIso(todayIsoDate(), 1);
  while (new Date(date + "T00:00:00Z").getUTCDay() === 0)
    date = addDaysIso(date, 1);
  const input = validateQuote({
    postcode: "3000",
    locationLabel: "MELBOURNE, VIC 3000",
    size: "2m3",
    waste: "general",
    date,
    pickupDate: standardPickupDate(date),
    hirePeriod: "Standard (10 days)",
  });
  config = {
    ready: true,
    settings: structuredClone(defaultSettings),
    rates: defaultRates(),
    coverage: [],
  };
  await test("Quote validation requires a resolved postcode", () =>
    assert.throws(() =>
      validateQuote({ postcode: "Melbourne", size: "2m3", waste: "general" }),
    ));
  await test("Quotes enforce server-side Victorian locality verification", async () => {
    localities = [];
    await assert.rejects(() => lookupQuote(input));
    localities = [{ suburb: "MELBOURNE", postcode: "3000", state: "VIC" }];
  });
  await test("Selected coverage allows only explicitly included suburbs", async () => {
    config.settings.coverageMode = "selected";
    await assert.rejects(() => lookupQuote(input));
    config.coverage = [{ suburb: "MELBOURNE", postcode: "3000", active: true }];
    assert.equal((await lookupQuote(input)).serviceable, true);
    config.settings.coverageMode = "victoria";
    config.coverage = [];
  });
  await test("Pricing overrides feed quote totals and blocked dates reject booking", async () => {
    const rate = config.rates.find((r) => r.id === "2m3-general");
    rate.overrides = [
      { id: "x", start: date, end: date, price: 222, blocked: false },
    ];
    assert.equal((await lookupQuote(input)).total, 222);
    rate.overrides[0].blocked = true;
    await assert.rejects(() => lookupQuote(input));
    rate.overrides = [];
    config.settings.blockedDates = [{ start: date, end: date, blocked: true }];
    await assert.rejects(() => lookupQuote(input));
    config.settings.blockedDates = [];
  });
  await test("Zero stock, paid commitments and active holds reject sold-out bins", async () => {
    const rate = config.rates.find((r) => r.id === "2m3-general");
    rate.stock = 0;
    await assert.rejects(() => lookupQuote(input));
    rate.stock = 1;
    stockRows = [
      {
        status: "paid",
        delivery_date: date,
        pickup_date: input.pickupDate,
        booking_turnaround: 1,
      },
    ];
    await assert.rejects(() => lookupQuote(input));
    stockRows = [
      {
        status: "pending",
        delivery_date: date,
        pickup_date: input.pickupDate,
        reserved_until: new Date(Date.now() + 60000).toISOString(),
        booking_turnaround: 1,
      },
    ];
    await assert.rejects(() => lookupQuote(input));
    stockRows[0].reserved_until = new Date(Date.now() - 60000).toISOString();
    assert.equal((await lookupQuote(input)).serviceable, true);
    stockRows = [];
    rate.stock = null;
  });
  await test("Admin APIs reject unauthenticated and non-admin callers", async () => {
    const { POST } = require("../app/api/admin/portal/route.ts");
    const request = () =>
      new Request("https://example.invalid/api/admin/portal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
    assert.equal((await POST(request())).status, 401);
    adminUser = {
      app_metadata: { role: "supplier" },
      email: "sample@example.invalid",
    };
    assert.equal((await POST(request())).status, 403);
  });
  console.log(`\n${passed} admin behavior checks passed.`);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
