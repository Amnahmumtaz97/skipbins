const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
// Load server TypeScript without adding a production dependency/test framework.
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...rest) {
  return resolve.call(this, name.startsWith('@/') ? path.join(__dirname, '..', name.slice(2)) : name, ...rest);
};
require.extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);

const { isValidPostcode } = require('../lib/postcode.ts');
const { validateQuote } = require('../lib/server/quote-service.ts');
const { bins, formatBinLabel } = require('../lib/data/skip-bins.ts');
const { rateLimit } = require('../lib/server/rate-limit.ts');
const quotes = require('../app/api/quotes/route.ts');
const bookings = require('../app/api/bookings/route.ts');
const stripeWebhook = require('../app/api/stripe/webhook/route.ts');
const contact = require('../app/api/contact/route.ts');
const postcodes = require('../app/api/postcodes/route.ts');
const addresses = require('../app/api/addresses/route.ts');
const { NextRequest } = require('next/server');
const valid = { postcode: '0800', size: '2m3', waste: 'green' };
const request = (body, headers = {}) => new Request('https://skipbins.test/api/quotes', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
});

test('location searches accept suburbs and partial postcodes while rejecting empty and unsafe input', () => {
  for (const value of ['0800', '4000', '400', '40000', 'Brisbane', 'Mount Gravatt', '4000 ']) assert.equal(isValidPostcode(value), true);
  for (const value of ['', ' ', '90', '４０００', 4000, null, "' OR 1=1", '<script>']) assert.equal(isValidPostcode(value), false);
});
test('catalogue allowlists, pickup order and non-Sunday dates are required', () => {
  assert.equal(validateQuote(valid).postcode, '0800');
  for (const changes of [{size:'10m3'}, {waste:'asbestos'}, {waste:'cleanfill'}, {date:'2027-02-30'}, {date:'2000-01-01'}, {date:'2099-01-04'}, {date:'2099-01-03',pickupDate:'2099-01-03'}, {date:'2099-01-03',pickupDate:'2099-01-11'}, {hirePeriod:'forever'}, {hirePeriod:'Long-term (ask us)'}]) assert.throws(() => validateQuote({...valid,...changes}));
});
test('bin catalogue uses the approved names and centralized dimensions', () => {
  assert.deepEqual(bins.map((bin) => bin.size), ['2m³', '3m³', '4m³', '6m³', '8m³', '9m³']);
  for (const bin of bins) {
    assert.equal(formatBinLabel(bin.id), `${bin.size} — SKIP BIN`);
    assert.match(bin.dimensions, /^\d(?:\.\d)?m × \d(?:\.\d)?m × \d(?:\.\d)?m$/);
  }
});
test('quote route rejects invalid JSON, body shape, size and cross-origin requests', async () => {
  assert.equal((await quotes.POST(request({...valid, postcode:''}))).status, 400);
  assert.equal((await quotes.POST(request([]))).status, 400);
  assert.equal((await quotes.POST(request({...valid, extra:'x'.repeat(9000)}))).status, 400);
  assert.equal((await quotes.POST(request(valid, {Origin:'https://other.test'}))).status, 400);
  assert.equal((await quotes.POST(new Request('https://skipbins.test/api/quotes',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'}))).status, 400);
});
test('quotes return catalogue bin prices and fail closed on invalid input', async () => {
  const response = await quotes.POST(request(valid));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.serviceable, true);
  assert.equal(data.total, 149);
  const extended = await quotes.POST(request({ ...valid, hirePeriod: 'Extended (14 days)' }));
  assert.equal((await extended.json()).total, 209);
});
test('rate quota cannot be bypassed with caller-controlled IPs and resets after one minute', () => {
  assert.equal(rateLimit('test-only', 2, 0), null);
  assert.equal(rateLimit('test-only', 2, 1), null);
  const denied = rateLimit('test-only', 2, 2);
  assert.equal(denied.status, 429);
  assert.equal(denied.headers.get('Retry-After'), '60');
  assert.equal(rateLimit('test-only', 2, 60000), null);
});
test('contact validates input and cannot acknowledge an undelivered message', async () => {
  assert.equal((await contact.POST(request({name:'',email:'bad',message:''}))).status, 400);
  assert.equal((await contact.POST(request({name:'Test',email:'test@example.com',message:'Testing'}))).status, 503);
});
test('booking validates all inputs and never returns a simulated reference', async () => {
  assert.equal((await bookings.POST(request({}))).status, 400);
  const body = {address:'0800',binSize:'2m3',wasteType:'green',deliveryDate:'2099-01-01',pickupDate:'2099-01-03',hirePeriod:'Standard (7 days)',fullName:'Test',email:'test@example.com',phone:'0400000000',streetAddress:'Test address',access:'',notes:'',placement:'Driveway'};
  assert.equal((await bookings.POST(request({...body,phone:'bad'}))).status, 400);
  const missingPlacement = await bookings.POST(request({...body,placement:''}));
  assert.equal(missingPlacement.status, 400);
  assert.match((await missingPlacement.json()).error, /placement/i);
  const invalidPlacement = await bookings.POST(request({...body,placement:'Footpath'}));
  assert.equal(invalidPlacement.status, 400);
  assert.match((await invalidPlacement.json()).error, /placement/i);
  const response = await bookings.POST(request(body));
  assert.ok(response.status === 400 || response.status === 503);
  const data = await response.json();
  assert.equal(data.reference, undefined);
  assert.equal(data.checkoutUrl, undefined);
});
test('stripe webhook rejects missing signatures', async () => {
  const response = await stripeWebhook.POST(new Request('https://skipbins.test/api/stripe/webhook', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  }));
  assert.equal(response.status, 400);
});
test('postcode endpoint rejects unsafe queries and returns only Victorian localities', async () => {
  const shortResponse = await postcodes.GET(new NextRequest('https://skipbins.test/api/postcodes?q=90'));
  assert.equal(shortResponse.status, 400);
  assert.match((await shortResponse.json()).error, /at least 3 characters/i);
  assert.equal((await postcodes.GET(new NextRequest('https://skipbins.test/api/postcodes?q=%3Cscript%3E'))).status, 400);
  const originalFetch = global.fetch;
  const originalKey = process.env.AUSPOST_API_KEY;
  process.env.AUSPOST_API_KEY = 'test-only';
  global.fetch = async (url, options) => {
    assert.ok(url.startsWith('https://digitalapi.auspost.com.au/'));
    assert.equal(new URL(url).searchParams.get('state'), 'VIC');
    assert.equal(options.redirect, 'error');
    return Response.json({ localities: { locality: [
      { postcode:3000, location:'MELBOURNE',state:'VIC' },
      { postcode:800, location:'DARWIN',state:'NT' },
    ] } });
  };
  try {
    const response = await postcodes.GET(new NextRequest('https://skipbins.test/api/postcodes?q=Melbourne'));
    assert.deepEqual(await response.json(), [{ postcode:'3000', suburb:'MELBOURNE', state:'VIC' }]);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.AUSPOST_API_KEY; else process.env.AUSPOST_API_KEY = originalKey;
  }
});
test('address endpoint requires a street and postcode and keeps only that Victorian postcode', async () => {
  const shortResponse = await addresses.GET(new NextRequest('https://skipbins.test/api/addresses?q=&postcode=3121'));
  assert.equal(shortResponse.status, 400);
  assert.match((await shortResponse.json()).error, /street address/i);
  assert.equal((await addresses.GET(new NextRequest('https://skipbins.test/api/addresses?q=%3Cscript%3E&postcode=3121'))).status, 400);
  assert.equal((await addresses.GET(new NextRequest('https://skipbins.test/api/addresses?q=12+george'))).status, 400);
  assert.equal((await addresses.GET(new NextRequest('https://skipbins.test/api/addresses?q=12+george&postcode=312'))).status, 400);

  const originalFetch = global.fetch;
  const originalKey = process.env.GEOSCAPE_API_KEY;
  delete process.env.GEOSCAPE_API_KEY;
  assert.equal((await addresses.GET(new NextRequest('https://skipbins.test/api/addresses?q=12+george&postcode=3121'))).status, 503);

  process.env.GEOSCAPE_API_KEY = 'test-only';
  global.fetch = async () => new Response('{"error":{"code":"PPSS-0029"}}', { status: 401 });
  const denied = await addresses.GET(new NextRequest('https://skipbins.test/api/addresses?q=12+george&postcode=3121'));
  assert.equal(denied.status, 503);
  assert.match((await denied.json()).error, /Predictive API/i);

  global.fetch = async (url, options) => {
    assert.ok(String(url).startsWith('https://api.psma.com.au/v1/predictive/address'));
    const params = new URL(url).searchParams;
    assert.equal(params.get('query'), '12 george');
    assert.equal(params.get('stateTerritory'), 'VIC');
    assert.equal(options.headers.Authorization, 'test-only');
    assert.equal(options.redirect, 'error');
    return Response.json({ suggest: [
      { address: '12 GEORGE ST, RICHMOND VIC 3121' },
      { address: 'UNIT 2, 12 GEORGE ST, RICHMOND VIC 3121' },
      { address: '12 GEORGE ST, SYDNEY NSW 2000' },
      { address: '12 GEORGE ST, FITZROY VIC 3065' },
      { address: 'NOT AN ADDRESS' },
      { address: 3121 },
    ] });
  };
  try {
    const response = await addresses.GET(new NextRequest('https://skipbins.test/api/addresses?q=12+george&postcode=3121'));
    assert.deepEqual(await response.json(), [
      { street: '12 GEORGE ST', label: '12 GEORGE ST, RICHMOND VIC 3121' },
      { street: 'UNIT 2, 12 GEORGE ST', label: 'UNIT 2, 12 GEORGE ST, RICHMOND VIC 3121' },
    ]);
    global.fetch = async () => Response.json({ suggest: [
      { address: '12 GEORGE ST, FITZROY VIC 3065' },
      { address: '12 GEORGE ST, SYDNEY NSW 2000' },
    ] });
    const wrongPostcode = await addresses.GET(new NextRequest('https://skipbins.test/api/addresses?q=12+george&postcode=3121'));
    assert.deepEqual(await wrongPostcode.json(), []);
    global.fetch = async (url) => {
      const query = new URL(url).searchParams.get('query');
      if (query === '248 sw') return Response.json({ suggest: [{ address: '248 SWAN ST, RICHMOND VIC 3121' }, { address: '248 SWANSTON ST, MELBOURNE VIC 3000' }] });
      if (query === '248') return Response.json({ suggest: [{ address: '248 ADDERLEY ST, WEST MELBOURNE VIC 3003' }] });
      return Response.json({ suggest: [] });
    };
    const numberOnly = await addresses.GET(new NextRequest('https://skipbins.test/api/addresses?q=248&postcode=3121'));
    assert.deepEqual(await numberOnly.json(), [
      { street: '248 SWAN ST', label: '248 SWAN ST, RICHMOND VIC 3121' },
    ]);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEOSCAPE_API_KEY; else process.env.GEOSCAPE_API_KEY = originalKey;
  }
});
