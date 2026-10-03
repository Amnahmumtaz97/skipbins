import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarCheck2, CircleAlert, CircleDollarSign, PackageCheck, PackageOpen, RotateCcw, Truck, Warehouse } from "lucide-react";
import { formatCurrency, todayIsoDate } from "@/lib/booking-utils";
import { operationStatusLabels, operationStatusTone, type OperationStatus } from "@/lib/data/operations";
import { buildAdminKpis } from "@/lib/operations-kpis";
import { getOperationsSnapshot } from "@/lib/server/operations-service";

const workflowStages: OperationStatus[] = ["unassigned", "assigned", "accepted", "scheduled", "delivered", "collection_due", "collected", "issue"];

export default async function AdminPage() {
  const { bookings, suppliers, setupRequired, serverConfigured, supplierSchemaReady } = await getOperationsSnapshot();
  const today = todayIsoDate();
  const kpis = buildAdminKpis(bookings, suppliers, today);
  const priority = bookings.filter((booking) => ["issue", "unassigned", "collection_due"].includes(booking.operation_status)).slice(0, 6);
  const maxPipeline = Math.max(1, ...workflowStages.map((status) => kpis.pipeline[status]));

  return <div className="mx-auto max-w-[1500px]">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#65A30D]">Operations control centre</p><h1 className="mt-1 text-[30px] font-extrabold tracking-[-0.04em] text-[#0B3B24] sm:text-[36px]">Admin performance dashboard</h1><p className="mt-2 text-[13px] text-[#66746B]">Live bookings, dispatch pressure, supplier capacity and revenue.</p></div><Link href="/admin/orders" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B3B24] px-4 py-3 text-[12px] font-extrabold text-white transition hover:bg-[#14532D]">Manage orders <ArrowRight className="h-4 w-4" /></Link></header>
    {setupRequired ? <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#ECD4A1] bg-[#FFF7E6] p-4 text-[#7B5310]"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="text-[12px] font-extrabold">Operations database setup required</p><p className="mt-1 text-[11px] leading-5">{!serverConfigured ? "Add SUPABASE_SECRET_KEY to the server environment, then restart or redeploy the app." : !supplierSchemaReady ? "The suppliers table could not be loaded. Confirm the operations migration ran in this Supabase project." : "Supplier management is not available yet."}</p></div></div> : null}

    <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6" aria-label="Primary operations KPIs">
      <Metric icon={PackageOpen} label="Open jobs" value={String(kpis.openJobs)} detail={`${kpis.onHire} currently on hire`} tone="green" />
      <Metric icon={Truck} label="Deliveries today" value={String(kpis.deliveriesToday)} detail={`${kpis.upcomingSevenDays} movements in 7 days`} tone="blue" />
      <Metric icon={RotateCcw} label="Collections today" value={String(kpis.collectionsToday)} detail={`${kpis.pipeline.collection_due} awaiting collection`} tone="purple" />
      <Metric icon={PackageCheck} label="Needs supplier" value={String(kpis.unassigned)} detail={`${kpis.activeSuppliers} active suppliers`} tone="amber" />
      <Metric icon={AlertTriangle} label="Exceptions" value={String(kpis.issues)} detail="Jobs needing attention" tone="red" />
      <Metric icon={CircleDollarSign} label="Paid revenue" value={formatCurrency(kpis.paidValueCents / 100)} detail={`${formatCurrency(kpis.monthValueCents / 100)} this month`} tone="green" compact />
    </section>

    <section className="mt-5 grid gap-4 lg:grid-cols-3" aria-label="Operational health">
      <HealthCard icon={CalendarCheck2} label="Completion rate" value={`${kpis.completionRate}%`} detail="Paid, non-cancelled bookings completed" percent={kpis.completionRate} />
      <HealthCard icon={Truck} label="Supplier utilization" value={`${kpis.supplierUtilization}%`} detail={`${kpis.activeSuppliers} active suppliers in the network`} percent={kpis.supplierUtilization} />
      <HealthCard icon={Warehouse} label="Recorded bin capacity" value={String(kpis.totalInventory)} detail="Available units reported by active suppliers" />
    </section>

    <div className="mt-5 grid gap-5 xl:grid-cols-[.9fr_1.35fr]">
      <section className="rounded-2xl border border-[#DDE5D8] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-[16px] font-extrabold text-[#0B3B24]">Workflow pipeline</h2><p className="mt-1 text-[11px] text-[#718078]">Paid orders by current stage</p></div><Link href="/admin/orders" className="text-[11px] font-extrabold text-[#4D7C0F]">Open register</Link></div><div className="mt-5 space-y-3">{workflowStages.map((status) => <div key={status} className="grid grid-cols-[110px_1fr_28px] items-center gap-3"><span className="text-[10px] font-bold text-[#526159]">{operationStatusLabels[status]}</span><span className="h-2 overflow-hidden rounded-full bg-[#EDF1EA]"><span className="block h-full rounded-full bg-[#65A30D]" style={{ width: `${Math.max(kpis.pipeline[status] ? 6 : 0, (kpis.pipeline[status] / maxPipeline) * 100)}%` }} /></span><strong className="text-right text-[11px] text-[#0B3B24]">{kpis.pipeline[status]}</strong></div>)}</div></section>
      <section className="rounded-2xl border border-[#DDE5D8] bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between"><div><h2 className="text-[16px] font-extrabold text-[#0B3B24]">Priority queue</h2><p className="mt-1 text-[11px] text-[#718078]">Allocation, collection and exception work</p></div><Link href="/admin/orders" className="text-[11px] font-extrabold text-[#4D7C0F]">View all</Link></div><div className="mt-4 space-y-2">{priority.map((booking) => <Link href="/admin/orders" key={booking.id} className="grid gap-2 rounded-xl border border-[#E6ECE2] p-3 transition hover:border-[#A9C68F] sm:grid-cols-[.8fr_1.4fr_.7fr] sm:items-center"><div><p className="font-mono text-[11px] font-bold text-[#0B3B24]">{booking.reference}</p><span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[8px] font-extrabold uppercase ${operationStatusTone(booking.operation_status)}`}>{operationStatusLabels[booking.operation_status]}</span></div><div><p className="text-[12px] font-bold text-[#314B3D]">{booking.full_name}</p><p className="mt-1 truncate text-[10px] text-[#718078]">{booking.street_address}, {booking.postcode}</p></div><div className="sm:text-right"><p className="text-[11px] font-bold text-[#314B3D]">{booking.bin_size.replace("m3", "m³")}</p><p className="mt-1 text-[10px] text-[#718078]">{booking.delivery_date || "Date TBC"}</p></div></Link>)}{!priority.length ? <p className="rounded-xl bg-[#F4F8F0] px-4 py-8 text-center text-[12px] text-[#66746B]">No urgent operational exceptions.</p> : null}</div></section>
    </div>
  </div>;
}

function Metric({ icon: Icon, label, value, detail, tone, compact = false }: { icon: typeof Truck; label: string; value: string; detail: string; tone: "green" | "amber" | "blue" | "purple" | "red"; compact?: boolean }) { const colors = { green: "bg-[#E7F4E2] text-[#337326]", amber: "bg-[#FFF1D6] text-[#8A5700]", blue: "bg-[#E7F1F7] text-[#245A78]", purple: "bg-[#EEEAF8] text-[#5D4688]", red: "bg-[#FDE9E5] text-[#9B3528]" }; return <article className="rounded-2xl border border-[#DDE5D8] bg-white p-4 shadow-sm"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors[tone]}`}><Icon className="h-4 w-4" /></span><p className="mt-4 text-[9px] font-bold uppercase tracking-[0.1em] text-[#718078]">{label}</p><p className={`mt-1 font-extrabold tracking-[-0.04em] text-[#0B3B24] ${compact ? "text-[19px]" : "text-[25px]"}`}>{value}</p><p className="mt-1 text-[9px] leading-4 text-[#8A958E]">{detail}</p></article>; }
function HealthCard({ icon: Icon, label, value, detail, percent }: { icon: typeof Truck; label: string; value: string; detail: string; percent?: number }) { return <article className="rounded-2xl border border-[#DDE5D8] bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#718078]">{label}</p><p className="mt-1 text-[24px] font-extrabold text-[#0B3B24]">{value}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF5E8] text-[#4D7C0F]"><Icon className="h-4 w-4" /></span></div>{percent !== undefined ? <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EDF1EA]"><span className="block h-full rounded-full bg-[#65A30D]" style={{ width: `${Math.min(100, percent)}%` }} /></div> : null}<p className="mt-2 text-[10px] text-[#7B887F]">{detail}</p></article>; }
