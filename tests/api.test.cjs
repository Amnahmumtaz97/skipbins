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
const { rateLimit } = require('../lib/server/rate-limit.ts');
const quotes = require('../app/api/quotes/route.ts');
const bookings = require('../app/api/bookings/route.ts');
const contact = require('../app/api/contact/route.ts');
const postcodes = require('../app/api/postcodes/route.ts');
const { NextRequest } = require('next/server');
const valid = { postcode: '0800', size: '2m3', waste: 'green' };
const request = (body, headers = {}) => new Request('https://skipbins.test/api/quotes', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
});

test('location searches accept suburbs and partial postcodes while rejecting empty and unsafe input', () => {
  for (const value of ['0800', '4000', '400', '40000', 'Brisbane', 'Mount Gravatt', '4000 ']) assert.equal(isValidPostcode(value), true);
  for (const value of ['', ' ', '90', '４０００', 4000, null, "' OR 1=1", '<script>']) assert.equal(isValidPostcode(value), false);
});
test('catalogue allowlists and real calendar dates are required', () => {
  assert.equal(validateQuote(valid).postcode, '0800');
  for (const changes of [{size:'8m3'}, {waste:'asbestos'}, {date:'2027-02-30'}, {date:'2000-01-01'}, {hirePeriod:'forever'}]) assert.throws(() => validateQuote({...valid,...changes}));
});
test('quote route rejects invalid JSON, body shape, size and cross-origin requests', async () => {
  assert.equal((await quotes.POST(request({...valid, postcode:''}))).status, 400);
  assert.equal((await quotes.POST(request([]))).status, 400);
  assert.equal((await quotes.POST(request({...valid, extra:'x'.repeat(9000)}))).status, 400);
  assert.equal((await quotes.POST(request(valid, {Origin:'https://other.test'}))).status, 400);
  assert.equal((await quotes.POST(new Request('https://skipbins.test/api/quotes',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'}))).status, 400);
});
test('missing pricing integration fails closed with no price or internal error', async () => {
  const response = await quotes.POST(request(valid));
  assert.equal(response.status, 503);
  const data = await response.json();
  assert.deepEqual(Object.keys(data), ['error']);
  assert.match(data.error, /temporarily unavailable/);
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
  const body = {address:'0800',binSize:'2m3',wasteType:'green',deliveryDate:'2099-01-01',hirePeriod:'Standard (7 days)',fullName:'Test',email:'test@example.com',phone:'0400000000',streetAddress:'Test address',access:'',notes:'',placement:'Driveway'};
  assert.equal((await bookings.POST(request({...body,phone:'bad'}))).status, 400);
  const response = await bookings.POST(request(body));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).reference, undefined);
});
test('postcode endpoint rejects unsafe queries and preserves 0800 from provider', async () => {
  const shortResponse = await postcodes.GET(new NextRequest('https://skipbins.test/api/postcodes?q=90'));
  assert.equal(shortResponse.status, 400);
  assert.match((await shortResponse.json()).error, /at least 3 characters/i);
  assert.equal((await postcodes.GET(new NextRequest('https://skipbins.test/api/postcodes?q=%3Cscript%3E'))).status, 400);
  const originalFetch = global.fetch;
  const originalKey = process.env.AUSPOST_API_KEY;
  process.env.AUSPOST_API_KEY = 'test-only';
  global.fetch = async (url, options) => {
    assert.ok(url.startsWith('https://digitalapi.auspost.com.au/'));
    assert.equal(options.redirect, 'error');
    return Response.json({ localities: { locality: { postcode:800, location:'DARWIN',state:'NT' } } });
  };
  try {
    const response = await postcodes.GET(new NextRequest('https://skipbins.test/api/postcodes?q=0800'));
    assert.equal((await response.json())[0].postcode,'0800');
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.AUSPOST_API_KEY; else process.env.AUSPOST_API_KEY = originalKey;
  }
});
