import Link from "next/link";
import { ArrowRight, CalendarClock, CircleAlert, PackageCheck, Truck } from "lucide-react";
import { SupplierOrders } from "@/components/supplier/supplier-orders";
import { supplierIdFromUser } from "@/lib/server/admin-auth";
import { getSupplierOperations } from "@/lib/server/operations-service";
import { createClient } from "@/lib/supabase/server";

export default async function SupplierPage() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  const { supplier, bookings } = await getSupplierOperations(user!.id, supplierIdFromUser(user));
  if (!supplier) return <div className="mx-auto max-w-3xl"><div className="rounded-2xl border border-[#ECD4A1] bg-[#FFF7E6] p-5 text-[#7B5310]"><CircleAlert className="h-6 w-6" /><h1 className="mt-3 text-[20px] font-extrabold">Supplier profile not linked</h1><p className="mt-2 text-[12px] leading-6">Your login has supplier access, but it is not linked to a supplier record. Ask the administrator to set this Auth user ID on your supplier profile.</p></div></div>;
  const active = bookings.filter((booking) => !["collected", "cancelled"].includes(booking.operation_status));
  const today = new Date().toISOString().slice(0, 10);
  const todayJobs = active.filter((booking) => booking.delivery_date === today || booking.pickup_date === today);
  const issues = active.filter((booking) => booking.operation_status === "issue");
  return <div className="mx-auto max-w-[1300px]"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#65A30D]">{supplier.name}</p><div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-[30px] font-extrabold tracking-[-.04em] text-[#0B3B24]">Today&apos;s operations</h1><p className="mt-2 text-[12px] text-[#66746B]">Review assigned work and keep each bin movement current.</p></div><Link href="/supplier/orders" className="inline-flex items-center gap-2 rounded-xl bg-[#0B3B24] px-4 py-3 text-[11px] font-extrabold text-white">All assigned orders <ArrowRight className="h-3.5 w-3.5" /></Link></div><section className="mt-6 grid gap-3 sm:grid-cols-3"><Metric icon={Truck} label="Active jobs" value={active.length} /><Metric icon={CalendarClock} label="Due today" value={todayJobs.length} /><Metric icon={PackageCheck} label="Issues" value={issues.length} /></section><section className="mt-6"><div className="mb-3 flex items-center justify-between"><h2 className="text-[15px] font-extrabold text-[#0B3B24]">Assigned work</h2><span className="text-[10px] font-bold text-[#718078]">{active.length} active</span></div><SupplierOrders initialBookings={active} compact /></section></div>;
}
function Metric({ icon: Icon, label, value }: { icon: typeof Truck; label: string; value: number }) { return <article className="rounded-2xl border border-[#DDE5D8] bg-white p-4 shadow-sm"><Icon className="h-4 w-4 text-[#65A30D]" /><p className="mt-3 text-[9px] font-bold uppercase tracking-[.1em] text-[#718078]">{label}</p><p className="mt-1 text-[24px] font-extrabold text-[#0B3B24]">{value}</p></article>; }
