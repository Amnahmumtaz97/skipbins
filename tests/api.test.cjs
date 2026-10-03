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

const { isResolvedPostcode, isValidPostcode } = require('../lib/postcode.ts');
const { validateQuote } = require('../lib/server/quote-service.ts');
const { bins, formatBinLabel } = require('../lib/data/skip-bins.ts');
const { emptyBookingExtras } = require('../lib/data/booking-extras.ts');
const { selectedAddressLocationError } = require('../lib/address-validation.ts');
const { adminStripeTestAmountCents, adminStripeTestAmountLabel } = require('../lib/data/admin-stripe-test.ts');
const { quoteTotal } = require('../lib/pricing.ts');
const { rateLimit } = require('../lib/server/rate-limit.ts');
const { createPendingBooking } = require('../lib/server/booking-service.ts');
const { newCustomerCode, normalizeCustomerEmail } = require('../lib/server/customer-service.ts');
const { isAdminUser, isSupplierUser, supplierIdFromUser } = require('../lib/server/admin-auth.ts');
const { isOperationStatus, supplierActionStatuses } = require('../lib/data/operations.ts');
const { getTestStripe } = require('../lib/server/stripe.ts');
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
test('catalogue allowlists, next-day delivery and 10-to-14-day pickup rules are required', () => {
  assert.equal(validateQuote(valid).postcode, '0800');
  for (const changes of [{size:'14m3'}, {size:'10m3',waste:'mixed'}, {size:'12m3',waste:'soil'}, {waste:'asbestos'}, {waste:'cleanfill'}, {date:'2027-02-30'}, {date:'2000-01-01'}, {date:'2099-01-04'}, {date:'2099-01-01',pickupDate:'2099-01-03'}, {date:'2099-01-01',pickupDate:'2099-01-16'}, {date:'2099-01-01',pickupDate:'2099-01-12',hirePeriod:'Extended (14 days)'}, {hirePeriod:'forever'}, {hirePeriod:'Long-term (ask us)'}]) assert.throws(() => validateQuote({...valid,...changes}));
  assert.equal(validateQuote({...valid,size:'10m3',waste:'green'}).size, '10m3');
  assert.equal(validateQuote({...valid,date:'2099-01-01',pickupDate:'2099-01-12',hirePeriod:'Standard (10 days)'}).pickupDate, '2099-01-12');
  assert.equal(validateQuote({...valid,date:'2099-01-01',pickupDate:'2099-01-15',hirePeriod:'Extended (14 days)'}).pickupDate, '2099-01-15');
});
test('bin catalogue uses the approved names and centralized dimensions', () => {
  assert.deepEqual(bins.map((bin) => bin.size), ['2m³', '3m³', '4m³', '6m³', '8m³', '9m³', '10m³', '12m³']);
  for (const bin of bins) {
    assert.equal(formatBinLabel(bin.id), `${bin.size} — SKIP BIN`);
    assert.match(bin.dimensions, /^\d(?:\.\d)?m × \d(?:\.\d)?m × \d(?:\.\d)?m$/);
    assert.match(bin.door, /^(?:No walk-in door|Walk-in door)$/);
  }
  assert.equal(bins.find((bin) => bin.id === '10m3').dimensions, '4.1m × 1.6m × 1.9m');
  assert.equal(bins.find((bin) => bin.id === '12m3').dimensions, '5.0m × 2.0m × 1.5m');
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
  assert.equal(data.total, 350);
  const extended = await quotes.POST(request({ ...valid, hirePeriod: 'Extended (14 days)' }));
  assert.equal((await extended.json()).total, 490);
});
test('customer identities use normalized emails and non-guessable public codes', () => {
  assert.equal(normalizeCustomerEmail('  Customer.Name+Bins@Example.COM '), 'customer.name+bins@example.com');
  const first = newCustomerCode();
  const second = newCustomerCode();
  assert.match(first, /^CUS-[A-F0-9]{12}$/);
  assert.match(second, /^CUS-[A-F0-9]{12}$/);
  assert.notEqual(first, second);
});
test('booking extras are priced from the server catalogue', () => {
  const extras = emptyBookingExtras();
  extras.tyreDisposal = 2;
  extras.mattressDisposal = 1;
  extras.carpetDisposal = 1;
  assert.equal(quoteTotal('2m3', 'Standard (10 days)', extras), 470);
  extras.mattressDisposal = 2;
  assert.equal(quoteTotal('2m3', 'Standard (10 days)', extras), 520);
});
test('selected delivery address must match the quoted postcode', () => {
  assert.equal(selectedAddressLocationError('12 TEST ST, MELBOURNE VIC 3000', '3000', 'MELBOURNE, VIC 3000'), '');
  assert.equal(
    selectedAddressLocationError('12 TEST ST, LEUMEAH NSW 2560', '3000', 'MELBOURNE, VIC 3000'),
    'This address is in LEUMEAH 2560, but your quote was for MELBOURNE 3000. Please check before continuing.',
  );
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
  const body = {address:'0800',locationLabel:'DARWIN, NT 0800',binSize:'2m3',wasteType:'green',deliveryDate:'2099-01-01',pickupDate:'2099-01-12',hirePeriod:'Standard (10 days)',extras:emptyBookingExtras(),fullName:'Test',email:'test@example.com',phone:'0400000000',streetAddress:'1 Test Street',deliveryAddressLabel:'1 TEST STREET, DARWIN NT 0800',access:'',notes:'',placement:'Driveway'};
  assert.equal((await bookings.POST(request({...body,phone:'bad'}))).status, 400);
  const missingPlacement = await bookings.POST(request({...body,placement:''}));
  assert.equal(missingPlacement.status, 400);
  assert.match((await missingPlacement.json()).error, /placement/i);
  const invalidPlacement = await bookings.POST(request({...body,placement:'Footpath'}));
  assert.equal(invalidPlacement.status, 400);
  assert.match((await invalidPlacement.json()).error, /placement/i);
  const invalidExtras = await bookings.POST(request({...body,extras:{excavatorTrack:999}}));
  assert.equal(invalidExtras.status, 400);
  assert.match((await invalidExtras.json()).error, /extras/i);
  const mismatchedAddress = await bookings.POST(request({...body,address:'3000',locationLabel:'MELBOURNE, VIC 3000',deliveryAddressLabel:'1 TEST STREET, LEUMEAH NSW 2560'}));
  assert.equal(mismatchedAddress.status, 400);
  assert.equal((await mismatchedAddress.json()).error, 'This address is in LEUMEAH 2560, but your quote was for MELBOURNE 3000. Please check before continuing.');
  const response = await bookings.POST(request(body));
  assert.ok(response.status === 400 || response.status === 503);
  const data = await response.json();
  assert.equal(data.reference, undefined);
  assert.equal(data.checkoutUrl, undefined);
});
test('a booking location is resolved only after a four-digit postcode is selected', () => {
  assert.equal(isResolvedPostcode('3000'), true);
  for (const value of ['Melbourne', 'MELBOURNE, VIC 3000', '300', '30000', '', null]) assert.equal(isResolvedPostcode(value), false);
});
test('pending bookings leave the unique Stripe session ID unset until Stripe creates it', async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalPublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const originalSecretKey = process.env.SUPABASE_SECRET_KEY;
  process.env.NODE_ENV = 'production';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test';
  process.env.SUPABASE_SECRET_KEY = 'test-secret';
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const originalFetch = global.fetch;
  global.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    const row = Array.isArray(body) ? body[0] : body;
    assert.equal(row.stripe_session_id, null);
    return new Response('', { status: 201 });
  };
  try {
    await createPendingBooking({ address:'3121',binSize:'2m3',wasteType:'green',deliveryDate:'2099-01-01',pickupDate:'2099-01-12',hirePeriod:'Standard (10 days)',extras:emptyBookingExtras(),fullName:'Test',email:'test@example.com',phone:'0400000000',streetAddress:'12 Test St',placement:'Driveway',access:'',notes:'' }, 14900);
  } finally {
    global.fetch = originalFetch;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalNodeEnv;
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalPublishableKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalPublishableKey;
    if (originalSecretKey === undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY = originalSecretKey;
  }
});
test('stripe webhook rejects missing signatures', async () => {
  const response = await stripeWebhook.POST(new Request('https://skipbins.test/api/stripe/webhook', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  }));
  assert.equal(response.status, 400);
});
test('admin access requires a trusted app role or configured email', () => {
  const original = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = 'owner@example.com, accounts@example.com';
  try {
    assert.equal(isAdminUser(null), false);
    assert.equal(isAdminUser({ email:'customer@example.com', app_metadata:{} }), false);
    assert.equal(isAdminUser({ email:'OWNER@example.com', app_metadata:{} }), true);
    assert.equal(isAdminUser({ email:'staff@example.com', app_metadata:{ role:'admin' } }), true);
    assert.equal(isAdminUser({ email:'staff@example.com', app_metadata:{ roles:['support','admin'] } }), true);
  } finally {
    if (original === undefined) delete process.env.ADMIN_EMAILS; else process.env.ADMIN_EMAILS = original;
  }
});
test('supplier access and operations updates use explicit trusted roles', () => {
  assert.equal(isSupplierUser(null), false);
  assert.equal(isSupplierUser({ app_metadata:{ role:'customer' } }), false);
  assert.equal(isSupplierUser({ app_metadata:{ role:'supplier' } }), true);
  assert.equal(isSupplierUser({ app_metadata:{ roles:['driver','supplier'] } }), true);
  assert.equal(supplierIdFromUser({ app_metadata:{ supplier_id:'supplier-123' } }), 'supplier-123');
  assert.equal(supplierIdFromUser({ app_metadata:{} }), undefined);
  for (const status of supplierActionStatuses) assert.equal(isOperationStatus(status), true);
  assert.equal(isOperationStatus('admin_override'), false);
});
test('admin Stripe diagnostic uses an accepted one-dollar AUD test amount', () => {
  assert.equal(adminStripeTestAmountCents, 100);
  assert.equal(adminStripeTestAmountLabel, 'A$1.00');
});
test('admin Stripe diagnostic refuses live secret keys', () => {
  const originalTest = process.env.STRIPE_TEST_SECRET_KEY;
  const originalDefault = process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_TEST_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = 'sk_live_never_use_for_admin_test';
  try {
    assert.throws(() => getTestStripe(), /test mode is not configured/i);
  } finally {
    if (originalTest === undefined) delete process.env.STRIPE_TEST_SECRET_KEY; else process.env.STRIPE_TEST_SECRET_KEY = originalTest;
    if (originalDefault === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = originalDefault;
  }
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
  const originalKey = process.env.GET_ADDRESS_API_KEY;
  const originalLegacyKey = process.env.GETADDRESS_API_KEY;
  delete process.env.GET_ADDRESS_API_KEY;
  delete process.env.GETADDRESS_API_KEY;
  assert.equal((await addresses.GET(new NextRequest('https://skipbins.test/api/addresses?q=12+george&postcode=3121'))).status, 503);

  process.env.GET_ADDRESS_API_KEY = 'test-only';
  global.fetch = async () => new Response('{"message":"Unauthorized"}', { status: 401 });
  const denied = await addresses.GET(new NextRequest('https://skipbins.test/api/addresses?q=12+george&postcode=3121'));
  assert.equal(denied.status, 503);
  assert.match((await denied.json()).error, /getAddress\.io API key/i);

  global.fetch = async (url, options) => {
    assert.ok(String(url).startsWith('https://api.getaddress.io/autocomplete/'));
    assert.equal(decodeURIComponent(new URL(url).pathname), '/autocomplete/12 george 3121');
    const params = new URL(url).searchParams;
    assert.equal(params.get('api-key'), 'test-only');
    assert.equal(params.get('top'), '6');
    assert.equal(options.redirect, 'error');
    return Response.json({ suggestions: [
      { id: 'GAVIC1', address: '12 GEORGE ST, RICHMOND VIC 3121' },
      { id: 'GAVIC2', address: 'UNIT 2, 12 GEORGE ST, RICHMOND VIC 3121' },
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
    global.fetch = async () => Response.json({ suggestions: [
      { address: '12 GEORGE ST, FITZROY VIC 3065' },
      { address: '12 GEORGE ST, SYDNEY NSW 2000' },
    ] });
    const wrongPostcode = await addresses.GET(new NextRequest('https://skipbins.test/api/addresses?q=12+george&postcode=3121'));
    assert.deepEqual(await wrongPostcode.json(), []);
    global.fetch = async (url) => {
      assert.equal(decodeURIComponent(new URL(url).pathname), '/autocomplete/248 3121');
      return Response.json({ suggestions: [{ address: '248 SWAN ST, RICHMOND VIC 3121' }, { address: '248 SWANSTON ST, MELBOURNE VIC 3000' }] });
    };
    const numberOnly = await addresses.GET(new NextRequest('https://skipbins.test/api/addresses?q=248&postcode=3121'));
    assert.deepEqual(await numberOnly.json(), [
      { street: '248 SWAN ST', label: '248 SWAN ST, RICHMOND VIC 3121' },
    ]);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GET_ADDRESS_API_KEY; else process.env.GET_ADDRESS_API_KEY = originalKey;
    if (originalLegacyKey === undefined) delete process.env.GETADDRESS_API_KEY; else process.env.GETADDRESS_API_KEY = originalLegacyKey;
  }
});
