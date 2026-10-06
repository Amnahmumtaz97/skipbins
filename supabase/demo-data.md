# Portal sample data

Run `npm run seed:demo` using the configured server Supabase credentials in `.env`.

The script adds four fictional customers, four DEMO suppliers and four DEMO jobs in Melbourne, Richmond, Brunswick and Footscray. Jobs cover scheduled delivery, collection due, an issue and completed work. Their dates are relative to the first run in Australia/Melbourne.

The jobs are assigned to the earliest active supplier with a linked Auth user ID. If none exists, they are assigned to DEMO Melbourne Skip Bins; link that supplier to an existing supplier login in the admin portal. No login or password is created or changed.

Names, email addresses, phone numbers and sites are synthetic. DEMO payment values are fictional but appear in dashboard totals and earnings reports. No Stripe payment, notification or actual dispatch is performed.

Stable IDs make the script repeatable without duplicating data or overwriting edits to existing sample records. Existing customer and supplier records are preserved. It does not change global pricing, booking availability, fees or coverage settings.

Supplier earnings are estimates using the current admin fee settings. They do not record or initiate bank transfers.