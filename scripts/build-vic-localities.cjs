const fs = require("node:fs");
const path = require("node:path");

const source =
  process.argv[2] || path.join(process.env.TEMP || "/tmp", "au-postcodes.csv");
const text = fs.readFileSync(source, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);
const header = columns(lines.shift());
const index = Object.fromEntries(header.map((name, i) => [name, i]));

function unquote(value) {
  if (value.startsWith('"') && value.endsWith('"'))
    return value.slice(1, -1).replaceAll('""', '"');
  return value;
}

function coordinatePair(latValue, lngValue) {
  const lat = Number(latValue);
  const lng = Number(lngValue);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0)
    return null;
  if (lat < -40 || lat > -33 || lng < 140 || lng > 151) return null;
  return [lat, lng];
}

function columns(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
      current += char;
    } else if (char === "," && !quoted) {
      values.push(unquote(current));
      current = "";
    } else current += char;
  }
  values.push(unquote(current));
  return values;
}

const seen = new Set();
const rows = [];
for (const line of lines) {
  const value = columns(line);
  if (value[index.state] !== "VIC") continue;
  const suburb = value[index.locality].trim().toUpperCase();
  const postcode = value[index.postcode].padStart(4, "0");
  if (!suburb || !/^\d{4}$/.test(postcode)) continue;
  // Australia Post lat/long is often one point for every locality in a postcode.
  // The precise pair is per locality, so suburbs that share a postcode get separate dots.
  const precise = coordinatePair(value[index.Lat_precise], value[index.Long_precise]);
  const fallback = coordinatePair(value[index.lat], value[index.long]);
  const chosen = precise ?? fallback;
  if (!chosen) continue;
  const [lat, lng] = chosen;
  const id = `${postcode}-${suburb}`;
  if (seen.has(id)) continue;
  seen.add(id);
  rows.push({
    id,
    suburb,
    postcode,
    lat: Math.round(lat * 1e5) / 1e5,
    lng: Math.round(lng * 1e5) / 1e5,
  });
}
rows.sort((a, b) => a.suburb.localeCompare(b.suburb) || a.postcode.localeCompare(b.postcode));
const out = path.join(__dirname, "..", "lib", "data", "vic-localities.json");
fs.writeFileSync(out, JSON.stringify(rows));
const byPostcode = new Map();
for (const row of rows) {
  if (!byPostcode.has(row.postcode)) byPostcode.set(row.postcode, new Set());
  byPostcode.get(row.postcode).add(`${row.lat},${row.lng}`);
}
let shared = 0;
let collapsed = 0;
for (const [postcode, coords] of byPostcode) {
  const suburbs = rows.filter((row) => row.postcode === postcode);
  if (new Set(suburbs.map((row) => row.suburb)).size < 2) continue;
  shared += 1;
  if (coords.size < new Set(suburbs.map((row) => row.suburb)).size) collapsed += 1;
}
console.log(`Wrote ${rows.length} localities to ${out} (${fs.statSync(out).size} bytes)`);
console.log(`${shared} postcodes cover more than one suburb; ${collapsed} still share a coordinate`);
