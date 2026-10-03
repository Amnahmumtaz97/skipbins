import Link from "next/link";
import { ArrowRight, CalendarClock, CircleAlert, CircleDollarSign, PackageCheck, Truck } from "lucide-react";
import { operationStatusLabels, operationStatusTone } from "@/lib/data/operations";
import { getOperationsSnapshot } from "@/lib/server/operations-service";
import { formatCurrency } from "@/lib/booking-utils";

export default async function AdminPage() {
  const { bookings, suppliers, setupRequired, serverConfigured, supplierSchemaReady } = await getOperationsSnapshot();
  const today = new Date().toISOString().slice(0, 10);
  const paid = bookings.filter((booking) => booking.payment_status === "paid");
  const active = bookings.filter((booking) => !["collected", "cancelled", "payment_pending"].includes(booking.operation_status));
  const unassigned = paid.filter((booking) => booking.operation_status === "unassigned");
  const dueToday = bookings.filter((booking) => booking.delivery_date === today || booking.pickup_date === today);
  const revenue = paid.reduce((total, booking) => total + booking.amount_cents, 0);
  const priority = bookings.filter((booking) => ["issue", "unassigned", "collection_due"].includes(booking.operation_status)).slice(0, 6);

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#65A30D]">Live operations</p><h1 className="mt-1 text-[30px] font-extrabold tracking-[-0.04em] text-[#0B3B24] sm:text-[36px]">Good overview, fewer surprises.</h1><p className="mt-2 text-[13px] text-[#66746B]">Bookings, supplier allocation and bin movements in one place.</p></div>
        <Link href="/admin/orders" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B3B24] px-4 py-3 text-[12px] font-extrabold text-white transition hover:bg-[#14532D]">Manage orders <ArrowRight className="h-4 w-4" /></Link>
      </div>
      {setupRequired ? <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#ECD4A1] bg-[#FFF7E6] p-4 text-[#7B5310]"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="text-[12px] font-extrabold">Operations database setup required</p><p className="mt-1 text-[11px] leading-5">{!serverConfigured ? "Add SUPABASE_SECRET_KEY to the server environment, then restart or redeploy the app." : !supplierSchemaReady ? "The suppliers table could not be loaded. Confirm the operations migration ran in this Supabase project." : "Supplier management is not available yet."}</p></div></div> : null}
      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Operations metrics">
        <Metric icon={PackageCheck} label="Active hires" value={String(active.length)} detail={`${paid.length} paid bookings`} tone="green" />
        <Metric icon={Truck} label="Needs supplier" value={String(unassigned.length)} detail={`${suppliers.filter((supplier) => supplier.status === "active").length} active suppliers`} tone="amber" />
        <Metric icon={CalendarClock} label="Due today" value={String(dueToday.length)} detail="Deliveries and collections" tone="blue" />
        <Metric icon={CircleDollarSign} label="Paid value" value={formatCurrency(revenue / 100)} detail="Recorded bookings" tone="purple" />
      </section>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.5fr_.8fr]">
        <section className="rounded-2xl border border-[#DDE5D8] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between"><div><h2 className="text-[16px] font-extrabold text-[#0B3B24]">Priority queue</h2><p className="mt-1 text-[11px] text-[#718078]">Orders requiring allocation or attention</p></div><Link href="/admin/orders" className="text-[11px] font-extrabold text-[#4D7C0F]">View all</Link></div>
          <div className="mt-4 space-y-2">
            {priority.map((booking) => <Link href="/admin/orders" key={booking.id} className="grid gap-2 rounded-xl border border-[#E6ECE2] p-3 transition hover:border-[#A9C68F] sm:grid-cols-[.75fr_1.4fr_.7fr] sm:items-center"><div><p className="font-mono text-[11px] font-bold text-[#0B3B24]">{booking.reference}</p><span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[8px] font-extrabold uppercase ${operationStatusTone(booking.operation_status)}`}>{operationStatusLabels[booking.operation_status]}</span></div><div><p className="text-[12px] font-bold text-[#314B3D]">{booking.full_name}</p><p className="mt-1 truncate text-[10px] text-[#718078]">{booking.street_address}, {booking.postcode}</p></div><div className="sm:text-right"><p className="text-[11px] font-bold text-[#314B3D]">{booking.bin_size.replace("m3", "m³")}</p><p className="mt-1 text-[10px] text-[#718078]">{booking.delivery_date || "Date TBC"}</p></div></Link>)}
            {!priority.length ? <p className="rounded-xl bg-[#F4F8F0] px-4 py-8 text-center text-[12px] text-[#66746B]">No urgent operational exceptions.</p> : null}
          </div>
        </section>
        <section className="rounded-2xl bg-[#0B3B24] p-5 text-white shadow-[0_16px_45px_rgba(11,59,36,.16)]">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#C7F34A]">Supplier network</p><h2 className="mt-2 text-[21px] font-extrabold">{suppliers.length} connected suppliers</h2><p className="mt-2 text-[11px] leading-5 text-white/60">Track capacity, service areas and assigned work before dispatching each bin.</p>
          <div className="mt-5 space-y-2">{suppliers.slice(0, 4).map((supplier) => <div key={supplier.id} className="flex items-center justify-between rounded-xl bg-white/[.07] px-3 py-2.5"><div><p className="text-[11px] font-bold">{supplier.name}</p><p className="mt-0.5 text-[9px] text-white/45">{supplier.service_area || "Service area not set"}</p></div><span className={`h-2 w-2 rounded-full ${supplier.status === "active" ? "bg-[#C7F34A]" : "bg-amber-300"}`} /></div>)}</div>
          <Link href="/admin/suppliers" className="mt-5 inline-flex items-center gap-2 text-[11px] font-extrabold text-[#C7F34A]">Supplier management <ArrowRight className="h-3.5 w-3.5" /></Link>
        </section>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail, tone }: { icon: typeof Truck; label: string; value: string; detail: string; tone: "green" | "amber" | "blue" | "purple" }) {
  const colors = { green: "bg-[#E7F4E2] text-[#337326]", amber: "bg-[#FFF1D6] text-[#8A5700]", blue: "bg-[#E7F1F7] text-[#245A78]", purple: "bg-[#EEEAF8] text-[#5D4688]" };
  return <article className="rounded-2xl border border-[#DDE5D8] bg-white p-4 shadow-sm"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors[tone]}`}><Icon className="h-4 w-4" /></span><p className="mt-4 text-[10px] font-bold uppercase tracking-[0.1em] text-[#718078]">{label}</p><p className="mt-1 text-[25px] font-extrabold tracking-[-0.04em] text-[#0B3B24]">{value}</p><p className="mt-1 text-[10px] text-[#8A958E]">{detail}</p></article>;
}
