const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  assert = require("node:assert/strict"),
  ts = require("typescript");
const root = path.resolve(__dirname, ".."),
  originalLoad = Module._load;
let user = null,
  linked = true,
  saved = null,
  scopedId = null;
Module._load = function (id, parent, isMain) {
  if (id === "server-only") return {};
  if (id === "@/lib/supabase/server")
    return {
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user } }) },
      }),
    };
  if (id === "@/lib/server/operations-service")
    return {
      getSupplierByUser: async () => (linked ? { id: "owned-supplier" } : null),
    };
  if (id === "@/lib/server/victorian-localities")
    return {
      victorianLocalities: async (code) =>
        code === "3000" ? [{ postcode: "3000", state: "VIC" }] : [],
    };
  if (id === "@/lib/server/admin-database")
    return {
      adminDatabase: () => ({
        from: () => ({
          update(value) {
            saved = value;
            return this;
          },
          eq(key, value) {
            scopedId = [key, value];
            return this;
          },
          select() {
            return this;
          },
          single: async () => ({ data: { id: "owned-supplier" }, error: null }),
        }),
      }),
    };
  if (id.startsWith("@/")) id = path.join(root, id.slice(2));
  return originalLoad.call(this, id, parent, isMain);
};
require.extensions[".ts"] = (module, file) =>
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
const {
  supplierEarnings,
  supplierDispatch,
} = require("../lib/supplier-workspace.ts");
const { PATCH } = require("../app/api/supplier/profile/route.ts");
const booking = {
  id: "job",
  payment_status: "paid",
  operation_status: "scheduled",
  amount_cents: 35001,
  bin_size: "2m3",
  delivery_date: "2026-10-07",
  pickup_date: "2026-10-17",
};
let checks = 0;
function check(label, fn) {
  fn();
  checks++;
  console.log("PASS " + label);
}
const request = (body) =>
  new Request("http://localhost/api/supplier/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
(async () => {
  check("fee rounding and net estimate", () =>
    assert.equal(supplierEarnings([booking], 10, 2)[0].net, 30801),
  );
  check("exclude cancelled and unpaid earnings", () =>
    assert.equal(
      supplierEarnings(
        [
          { ...booking, payment_status: "pending" },
          { ...booking, operation_status: "cancelled" },
        ],
        10,
        2,
      ).length,
      0,
    ),
  );
  check("dispatch includes scheduled delivery", () =>
    assert.equal(supplierDispatch([booking], "2026-10-07")[0].kind, "Delivery"),
  );
  check("already delivered job does not repeat delivery", () =>
    assert.equal(
      supplierDispatch(
        [{ ...booking, operation_status: "delivered" }],
        "2026-10-07",
      ).length,
      0,
    ),
  );
  check("collection and completed dispatch", () => {
    assert.equal(
      supplierDispatch([booking], "2026-10-17")[0].kind,
      "Collection",
    );
    assert.equal(
      supplierDispatch(
        [{ ...booking, operation_status: "collected" }],
        "2026-10-17",
      ).length,
      0,
    );
  });

  assert.equal((await PATCH(request({ inventory: { "2m3": 5 } }))).status, 401);
  checks++;
  console.log("PASS authentication required");
  user = { id: "auth-id", app_metadata: { role: "admin" } };
  assert.equal((await PATCH(request({ inventory: {} }))).status, 403);
  checks++;
  console.log("PASS supplier role required");
  user.app_metadata.role = "supplier";
  linked = false;
  assert.equal((await PATCH(request({ inventory: {} }))).status, 403);
  checks++;
  console.log("PASS linked profile required");
  linked = true;
  for (const inventory of [
    { "2m3": -1 },
    { "2m3": 1.5 },
    { "2m3": 10001 },
    { unknown: 5 },
  ])
    assert.equal((await PATCH(request({ inventory }))).status, 400);
  checks++;
  console.log("PASS removed bin quantity updates rejected");
  assert.equal(
    (await PATCH(request({ profile: { serviceArea: "2000" } }))).status,
    400,
  );
  checks++;
  console.log("PASS non-Victorian coverage rejected");
  assert.equal(
    (
      await PATCH(
        request({
          profile: {
            name: "Demo business",
            serviceArea: "3000",
            rating: 5,
            auth_user_id: "other-user",
            status: "paused",
          },
          supplier_id: "other-supplier",
        }),
      )
    ).status,
    200,
  );
  check("profile save stays scoped and excludes privileged fields", () => {
    assert.deepEqual(scopedId, ["id", "owned-supplier"]);
    assert.equal(saved.rating, undefined);
    assert.equal(saved.auth_user_id, undefined);
    assert.equal(saved.status, undefined);
    assert.equal(saved.service_area, "3000");
  });
  assert.equal((await PATCH(request({ inventory: { "2m3": 8 } }))).status, 400);

  console.log(checks + " supplier checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
