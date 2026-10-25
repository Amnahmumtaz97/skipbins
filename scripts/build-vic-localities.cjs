const fs = require("node:fs");
const path = require("node:path");

const source =
  process.argv[2] || path.join(process.env.TEMP || "/tmp", "au-postcodes.csv");
const text = fs.readFileSync(source, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);
const header = lines.shift().split(",");
const index = Object.fromEntries(header.map((name, i) => [name, i]));

function unquote(value) {
  if (value.startsWith('"') && value.endsWith('"'))
    return value.slice(1, -1).replaceAll('""', '"');
  return value;
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
  const lat = Number(value[index.lat]);
  const lng = Number(value[index.long]);
  if (!suburb || !/^\d{4}$/.test(postcode)) continue;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
  if (lat < -40 || lat > -33 || lng < 140 || lng > 151) continue;
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
console.log(`Wrote ${rows.length} localities to ${out} (${fs.statSync(out).size} bytes)`);
