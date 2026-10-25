const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...rest) {
  return resolve.call(this, name.startsWith("@/") ? path.join(__dirname, "..", name.slice(2)) : name, ...rest);
};
require.extensions[".ts"] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true },
}).outputText, filename);

const { deliversTo, selectionChanges, localitiesInRectangle, samePlace, distanceKm, localitiesInView, retainShownLocalities } = require("../lib/coverage-selection.ts");
const melbourne = { id: "3000-MELBOURNE", suburb: "MELBOURNE", postcode: "3000", lat: -37.81, lng: 144.96 };
const melbourneGpo = { id: "3001-MELBOURNE", suburb: "MELBOURNE", postcode: "3001", lat: -37.81, lng: 144.96 };
const richmond = { id: "3121-RICHMOND", suburb: "RICHMOND", postcode: "3121", lat: -37.82, lng: 145.0 };

test("coverage selection toggles delivery and keeps suburbs inside a rectangle", () => {
  assert.equal(deliversTo("selected", undefined), false);
  assert.equal(deliversTo("selected", true), true);
  assert.equal(deliversTo("victoria", undefined), true);
  assert.equal(deliversTo("victoria", false), false);
  assert.deepEqual(
    selectionChanges([melbourne, richmond], [{ id: melbourne.id, active: true }], "selected", true).map((row) => row.id),
    [richmond.id],
  );
  assert.deepEqual(
    localitiesInRectangle([melbourne, richmond], { south: -37.9, west: 144.9, north: -37.8, east: 144.99 }).map((row) => row.id),
    [melbourne.id],
  );
  assert.deepEqual(samePlace(melbourne, [melbourne, melbourneGpo, richmond]).map((row) => row.id), [melbourne.id, melbourneGpo.id]);
});

test("excluding suburbs keeps their dots in the shown set", () => {
  const mildura = { id: "3500-MILDURA", suburb: "MILDURA", postcode: "3500", lat: -34.18, lng: 142.16 };
  const all = [melbourne, richmond, mildura];
  const shown = new Set();
  const first = retainShownLocalities(shown, [melbourne, richmond], all);
  assert.deepEqual(first.map((row) => row.id), [melbourne.id, richmond.id]);
  const afterExclude = retainShownLocalities(shown, [melbourne], all);
  assert.deepEqual(afterExclude.map((row) => row.id), [melbourne.id, richmond.id]);
});

test("map view keeps suburbs inside the kilometre range and drops distant ones", () => {
  const mildura = { id: "3500-MILDURA", suburb: "MILDURA", postcode: "3500", lat: -34.18, lng: 142.16 };
  const rows = [melbourne, richmond, mildura];
  assert.ok(distanceKm(melbourne, richmond) < 10);
  assert.ok(distanceKm(melbourne, mildura) > 200);
  assert.deepEqual(
    localitiesInView(rows, 20).map((row) => row.id),
    [melbourne.id, richmond.id],
  );
  assert.deepEqual(
    localitiesInView(rows, 30).map((row) => row.id),
    [melbourne.id, richmond.id],
  );
  assert.deepEqual(
    localitiesInView(rows, 30, { lat: mildura.lat, lng: mildura.lng }).map((row) => row.id),
    [mildura.id],
  );
});
