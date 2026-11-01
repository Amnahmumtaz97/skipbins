const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...rest) {
  return resolve.call(
    this,
    name.startsWith("@/") ? path.join(__dirname, "..", name.slice(2)) : name,
    ...rest,
  );
};
require.extensions[".ts"] = (mod, filename) =>
  mod._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        resolveJsonModule: true,
      },
    }).outputText,
    filename,
  );

const {
  deliveryZoneFromKm,
  deliveryZoneForPoint,
  deliveryZoneForSuburb,
  distanceToNearestDispatch,
  DISPATCH_SUBURBS,
} = require("../lib/delivery-zones.ts");

test("zone bands use 25 / 50 / 75 km cutoffs by default", () => {
  assert.equal(deliveryZoneFromKm(0), 1);
  assert.equal(deliveryZoneFromKm(25), 1);
  assert.equal(deliveryZoneFromKm(25.01), 2);
  assert.equal(deliveryZoneFromKm(50), 2);
  assert.equal(deliveryZoneFromKm(50.01), 3);
  assert.equal(deliveryZoneFromKm(75), 3);
  assert.equal(deliveryZoneFromKm(75.01), 4);
});

test("zone cutoffs can be set manually for four zones", () => {
  const limits = { 1: 30, 2: 55, 3: 80 };
  assert.equal(deliveryZoneFromKm(30, limits), 1);
  assert.equal(deliveryZoneFromKm(30.01, limits), 2);
  assert.equal(deliveryZoneFromKm(55, limits), 2);
  assert.equal(deliveryZoneFromKm(55.01, limits), 3);
  assert.equal(deliveryZoneFromKm(80, limits), 3);
  assert.equal(deliveryZoneFromKm(80.01, limits), 4);
});

test("dispatch suburbs themselves are Zone 1", () => {
  for (const depot of DISPATCH_SUBURBS) {
    assert.equal(deliveryZoneForPoint(depot), 1);
    assert.ok(distanceToNearestDispatch(depot) < 0.1);
  }
  assert.equal(deliveryZoneForSuburb("Campbellfield", "3061"), 1);
  assert.equal(deliveryZoneForSuburb("Laverton", "3028"), 1);
});

test("zone uses the nearer of Campbellfield or Laverton", () => {
  assert.equal(deliveryZoneForPoint({ lat: -37.87, lng: 144.78 }), 1);
  assert.equal(deliveryZoneForPoint({ lat: -34.18, lng: 142.16 }), 4);
});
