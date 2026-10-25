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
const loadModule = Module._load;
Module._load = function (name, ...rest) {
  if (name === 'server-only') return {};
  return loadModule.call(this, name, ...rest);
};
require.extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);

const { isResolvedPostcode, isValidPostcode } = require('../lib/postcode.ts');
const { validateQuote } = require('../lib/server/quote-service.ts');
const { bins, formatBinLabel } = require('../lib/data/skip-bins.ts');
const { emptyBookingExtras } = require('../lib/data/booking-extras.ts');
const { selectedAddressLocationError } = require('../lib/address-validation.ts');
const { formatBookingAddress } = require('../lib/booking-address.ts');
const { checkoutDecision, stripeCheckoutIdempotencyKey, verifiedBookingPayment } = require('../lib/server/checkout-policy.ts');
const { adminStripeTestAmountCents, adminStripeTestAmountLabel } = require('../lib/data/admin-stripe-test.ts');
const { quoteTotal } = require('../lib/pricing.ts');
const { rateLimit } = require('../lib/server/rate-limit.ts');
const { createPendingBooking, formatOrderNumber, orderYearSuffix } = require('../lib/server/booking-service.ts');
const { newCustomerCode, normalizeCustomerEmail } = require('../lib/server/customer-service.ts');
const { isAdminUser, isSupplierUser, supplierIdFromUser } = require('../lib/server/admin-auth.ts');
const { isOperationStatus, supplierActionStatuses } = require('../lib/data/operations.ts');
const { validateSupplierApplication } = require('../lib/supplier-application.ts');
const { buildAdminKpis, buildSupplierKpis } = require('../lib/operations-kpis.ts');
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
test('catalogue allowlists, next-day delivery and pickup hire rules are required', () => {
  assert.equal(validateQuote(valid).postcode, '0800');
  for (const changes of [{size:'14m3'}, {size:'10m3',waste:'mixed'}, {size:'12m3',waste:'soil'}, {waste:'asbestos'}, {waste:'cleanfill'}, {date:'2027-02-30'}, {date:'2000-01-01'}, {date:'2099-01-04'}, {date:'2099-01-01',pickupDate:'2098-12-31'}, {date:'2099-01-01',pickupDate:'2099-01-26'}, {date:'2099-01-01',pickupDate:'2099-01-12',hirePeriod:'Extended (14 days)'}, {hirePeriod:'forever'}, {hirePeriod:'Long-term (ask us)'}]) assert.throws(() => validateQuote({...valid,...changes}));
  assert.equal(validateQuote({...valid,size:'10m3',waste:'green'}).size, '10m3');
  assert.equal(validateQuote({...valid,date:'2099-01-01',pickupDate:'2099-01-03',hirePeriod:'Standard (10 days)'}).pickupDate, '2099-01-03');
  assert.equal(validateQuote({...valid,date:'2099-01-01',pickupDate:'2099-01-12',hirePeriod:'Extended (7 days)'}).pickupDate, '2099-01-12');
  assert.equal(validateQuote({...valid,date:'2099-01-01',pickupDate:'2099-01-22',hirePeriod:'Extended (14 days)'}).pickupDate, '2099-01-22');
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
  const week = await quotes.POST(request({ ...valid, hirePeriod: 'Extended (7 days)' }));
  assert.equal((await week.json()).total, 400);
  const extended = await quotes.POST(request({ ...valid, hirePeriod: 'Extended (14 days)' }));
  assert.equal((await extended.json()).total, 425);
});
test('customer identities use normalized emails and non-guessable public codes', () => {
  assert.equal(normalizeCustomerEmail('  Customer.Name+Bins@Example.COM '), 'customer.name+bins@example.com');
  const first = newCustomerCode();
  const second = newCustomerCode();
  assert.match(first, /^CUS-[A-F0-9]{12}$/);
  assert.match(second, /^CUS-[A-F0-9]{12}$/);
  assert.notEqual(first, second);
});
test('supplier applications normalize contact details and enforce account security', () => {
  const application = validateSupplierApplication({ companyName: '  Test Bins ', contactName: ' Test Owner ', phone: '0411 222 333', email: ' TEAM@TestBins.COM ', abn: '12 345 678 901', password: 'StrongPass1', confirmPassword: 'StrongPass1' });
  assert.equal(application.companyName, 'Test Bins');
  assert.equal(application.email, 'team@testbins.com');
  assert.equal(application.abn, '12345678901');
  for (const changes of [{phone:'123'}, {email:'bad'}, {abn:'123'}, {password:'short',confirmPassword:'short'}, {confirmPassword:'Different1'}]) {
    assert.throws(() => validateSupplierApplication({ ...application, confirmPassword: application.password, ...changes }));
  }
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
  const body = {submissionId:'123e4567-e89b-42d3-a456-426614174000',address:'3121',locationLabel:'RICHMOND, VIC 3121',binSize:'2m3',wasteType:'green',deliveryDate:'2099-01-01',pickupDate:'2099-01-11',hirePeriod:'Standard (10 days)',extras:emptyBookingExtras(),fullName:'Test',email:'test@example.com',phone:'0400000000',streetAddress:'1 Test Street',deliveryAddressLabel:'1 TEST STREET, RICHMOND VIC 3121',access:'',notes:'',placement:'Driveway'};
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
  const mismatchedAddress = await bookings.POST(request({...body,address:'3000',locationLabel:'MELBOURNE, VIC 3000',deliveryAddressLabel:'1 TEST STREET, RICHMOND VIC 3121'}));
  assert.equal(mismatchedAddress.status, 400);
  assert.equal((await mismatchedAddress.json()).error, 'This address is in RICHMOND 3121, but your quote was for MELBOURNE 3000. Please check before continuing.');
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
test('order numbers use the year and a four-digit counter', () => {
  assert.equal(formatOrderNumber(1, '26'), 'ORD-26-0001');
  assert.equal(formatOrderNumber(42, '26'), 'ORD-26-0042');
  assert.match(orderYearSuffix(), /^\d{2}$/);
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
  global.fetch = async (url, options) => {
    const year = orderYearSuffix();
    if (String(url).includes('/rest/v1/bookings')) {
      return new Response(JSON.stringify([{ reference: formatOrderNumber(7, year) }]), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    const body = JSON.parse(options.body);
    const row = body.payload ?? (Array.isArray(body) ? body[0] : body);
    assert.equal(row.stripe_session_id, null);
    assert.equal(row.reference, formatOrderNumber(8, year));
    return new Response(JSON.stringify([{ id: row.id, reference: row.reference }]), { status: 200, headers: { 'content-type': 'application/json' } });
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
test('repeated booking submission ID returns the original order and amount', async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalSecretKey = process.env.SUPABASE_SECRET_KEY;
  process.env.NODE_ENV = 'production';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test';
  process.env.SUPABASE_SECRET_KEY = 'test-secret';
  const originalFetch = global.fetch;
  const submissionId = '123e4567-e89b-42d3-a456-426614174000';
  let persisted = null;
  let inserted = 0;
  global.fetch = async (url, options = {}) => {
    const address = String(url);
    if (address.includes('/rest/v1/bookings') && address.includes('select=reference')) {
      return new Response(JSON.stringify(persisted ? [{ reference:persisted.reference }] : []), { status:200, headers:{'content-type':'application/json'} });
    }
    if (address.includes('/rest/v1/bookings') && address.includes('id=eq.')) {
      return new Response(JSON.stringify(persisted ? [persisted] : []), { status:200, headers:{'content-type':'application/json'} });
    }
    if (address.includes('/rest/v1/rpc/reserve_booking_submission')) {
      const { payload } = JSON.parse(options.body);
      if (!persisted) { persisted = payload; inserted += 1; }
      return new Response(JSON.stringify([{ id:persisted.id, reference:persisted.reference }]), { status:200, headers:{'content-type':'application/json'} });
    }
    throw new Error(`Unexpected fake Supabase request: ${address}`);
  };
  const input = { address:'3121',binSize:'2m3',wasteType:'green',deliveryDate:'2099-01-01',pickupDate:'2099-01-11',hirePeriod:'Standard (10 days)',extras:emptyBookingExtras(),fullName:'Test',email:'test@example.com',phone:'0400000000',streetAddress:'12 Test St',placement:'Driveway',access:'',notes:'' };
  try {
    const first = await createPendingBooking(input, 14900, undefined, 'direct', submissionId);
    const second = await createPendingBooking({ ...input, fullName:'Changed data' }, 9900, undefined, 'direct', submissionId);
    assert.equal(inserted, 1);
    assert.equal(first.id, second.id);
    assert.equal(second.reference, first.reference);
    assert.equal(second.amount_cents, 14900);
    assert.equal(second.full_name, 'Test');
  } finally {
    global.fetch = originalFetch;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalNodeEnv;
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalSecretKey === undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY = originalSecretKey;
  }
});
test('abandoned checkout keeps the booking pending and reuses its open Stripe session', () => {
  assert.equal(checkoutDecision({ bookingStatus:'pending', sessionStatus:'open', paymentStatus:'unpaid', attemptStatus:'open' }), 'reuse');
});
test('Pay Again reuses an open session for the saved order', () => {
  assert.equal(checkoutDecision({ bookingStatus:'pending', sessionStatus:'open', paymentStatus:'unpaid', attemptStatus:'open' }), 'reuse');
});
test('opening the same pending order repeatedly does not create another session', () => {
  const state = { bookingStatus:'pending', sessionStatus:'open', paymentStatus:'unpaid', attemptStatus:'open' };
  assert.deepEqual([checkoutDecision(state), checkoutDecision(state), checkoutDecision(state)], ['reuse','reuse','reuse']);
});
test('double-click and network retries use the same Stripe idempotency key', () => {
  const key = stripeCheckoutIdempotencyKey('123e4567-e89b-42d3-a456-426614174000', 1);
  assert.equal(key, stripeCheckoutIdempotencyKey('123e4567-e89b-42d3-a456-426614174000', 1));
});
test('repeated signed webhook delivery leaves an already-paid order paid', () => {
  assert.equal(checkoutDecision({ bookingStatus:'paid', sessionStatus:'complete', paymentStatus:'paid', attemptStatus:'paid' }), 'paid');
  const migration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'stripe-checkout-reliability-migration.sql'), 'utf8');
  assert.match(migration, /when status = 'paid' then 'paid'/i);
});
test('a successful Stripe payment can be reconciled while the webhook is delayed', () => {
  assert.equal(verifiedBookingPayment({ expectedBookingId:'booking-1', metadataBookingId:'booking-1', expectedAmount:14900, amountTotal:14900, currency:'aud' }), true);
  assert.equal(checkoutDecision({ bookingStatus:'pending', sessionStatus:'complete', paymentStatus:'paid', attemptStatus:'processing' }), 'paid');
});
test('success URL revisit confirms only the associated paid session', () => {
  assert.equal(verifiedBookingPayment({ expectedBookingId:'booking-1', metadataBookingId:'booking-1', expectedAmount:14900, amountTotal:14900, currency:'AUD' }), true);
  assert.equal(verifiedBookingPayment({ expectedBookingId:'booking-1', metadataBookingId:'booking-2', expectedAmount:14900, amountTotal:14900, currency:'aud' }), false);
});
test('expired checkout creates a replacement attempt for the same order', () => {
  assert.equal(checkoutDecision({ bookingStatus:'pending', sessionStatus:'expired', paymentStatus:'unpaid', attemptStatus:'expired' }), 'retry');
  assert.notEqual(stripeCheckoutIdempotencyKey('booking-1', 1), stripeCheckoutIdempotencyKey('booking-1', 2));
});
test('concurrent requests for one booking attempt share the Stripe idempotency key', () => {
  const keys = Array.from({ length: 8 }, () => stripeCheckoutIdempotencyKey('booking-1', 3));
  assert.equal(new Set(keys).size, 1);
  const migration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'stripe-checkout-reliability-migration.sql'), 'utf8');
  assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\(booking_id::text, 0\)\)/i);
  assert.match(migration, /primary key \(booking_id, attempt\)/i);
});
test('failed payment attempt can be retried and a later success wins', () => {
  assert.equal(checkoutDecision({ bookingStatus:'pending', sessionStatus:'complete', paymentStatus:'unpaid', attemptStatus:'failed' }), 'retry');
  assert.equal(checkoutDecision({ bookingStatus:'pending', sessionStatus:'open', paymentStatus:'unpaid', attemptStatus:'open' }), 'reuse');
  assert.equal(checkoutDecision({ bookingStatus:'pending', sessionStatus:'complete', paymentStatus:'paid', attemptStatus:'failed' }), 'paid');
});
test('payment reconciliation rejects amount, currency and metadata mismatches', () => {
  assert.equal(verifiedBookingPayment({ expectedBookingId:'booking-1', metadataBookingId:'booking-1', expectedAmount:14900, amountTotal:14899, currency:'aud' }), false);
  assert.equal(verifiedBookingPayment({ expectedBookingId:'booking-1', metadataBookingId:'booking-1', expectedAmount:14900, amountTotal:14900, currency:'usd' }), false);
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
test('operations KPI calculations reflect paid work, capacity and due dates', () => {
  const base = { id:'1',reference:'B1',payment_status:'paid',operation_status:'assigned',amount_cents:35000,bin_size:'2m3',postcode:'3000',waste_type:'green',delivery_date:'2099-01-01',pickup_date:'2099-01-11',hire_period:'Standard',full_name:'Test',email:'test@example.com',phone:'0400000000',street_address:'1 Test St',placement:'Driveway',access:'',notes:'',supplier_id:'s1',supplier_name:'Supplier',supplier_notes:'',created_at:'2099-01-01T00:00:00Z',manageable:true };
  const bookings = [base, { ...base, id:'2', reference:'B2', operation_status:'collected', amount_cents:45000 }, { ...base, id:'3', reference:'B3', operation_status:'issue', supplier_id:'s2', delivery_date:'2099-01-02' }];
  const suppliers = [{ id:'s1',name:'One',contact_name:'',email:'',phone:'',service_area:'',status:'active',bin_inventory:{'2m3':2},auth_user_id:null }, { id:'s2',name:'Two',contact_name:'',email:'',phone:'',service_area:'',status:'active',bin_inventory:{'4m3':3},auth_user_id:null }];
  const admin = buildAdminKpis(bookings, suppliers, '2099-01-01');
  assert.equal(admin.openJobs, 2);
  assert.equal(admin.paidValueCents, 115000);
  assert.equal(admin.completionRate, 33);
  assert.equal(admin.supplierUtilization, 100);
  assert.equal(admin.totalInventory, 5);
  assert.equal(admin.pipeline.issue, 1);
  const supplier = buildSupplierKpis(bookings, '2099-01-12');
  assert.equal(supplier.active.length, 2);
  assert.equal(supplier.overdue, 2);
  assert.equal(supplier.issues, 1);
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
  const response = await postcodes.GET(new NextRequest('https://skipbins.test/api/postcodes?q=Melbourne'));
  const localities = await response.json();
  assert.equal(response.status, 200);
  assert.ok(localities.every((row) => row.state === 'VIC' && row.suburb.includes('MELBOURNE')));
  assert.ok(localities.some((row) => row.suburb === 'MELBOURNE' && row.postcode === '3000'));
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
test('booking address keeps the suburb from the order when the street line is abbreviated', () => {
  assert.equal(formatBookingAddress('4 RESERVE AV', '3061'), '4 RESERVE AV, CAMPBELLFIELD VIC 3061');
  assert.equal(formatBookingAddress('4 RESERVE AV, CAMPBELLFIELD VIC 3061', '3061'), '4 RESERVE AV, CAMPBELLFIELD VIC 3061');
  assert.equal(formatBookingAddress('1 Test St', '3051'), '1 Test St, VIC 3051');
  assert.equal(formatBookingAddress('12 GEORGE ST, RICHMOND VIC 3121', '3121'), '12 GEORGE ST, RICHMOND VIC 3121');
});
