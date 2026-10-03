"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CircleAlert, MapPin, Search, UserRound } from "lucide-react";
import { operationStatuses, operationStatusLabels, operationStatusTone, type OperationStatus } from "@/lib/data/operations";
import type { OperationsBooking, SupplierRecord } from "@/lib/server/operations-service";
import { formatCurrency } from "@/lib/booking-utils";

export function OrderManager({ initialBookings, suppliers }: { initialBookings: OperationsBooking[]; suppliers: SupplierRecord[] }) {
  const [bookings, setBookings] = useState(initialBookings);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<OperationStatus | "all">("all");
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");

  const visible = useMemo(() => bookings.filter((booking) => {
    const match = `${booking.reference} ${booking.full_name} ${booking.street_address} ${booking.postcode} ${booking.supplier_name ?? ""}`.toLowerCase().includes(query.toLowerCase());
    return match && (filter === "all" || booking.operation_status === filter);
  }), [bookings, query, filter]);

  async function updateOrder(booking: OperationsBooking, changes: { supplierId?: string | null; status?: OperationStatus }) {
    setSaving(booking.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(booking.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update order.");
      setBookings((current) => current.map((item) => item.id === booking.id ? {
        ...item,
        ...(changes.status ? { operation_status: changes.status } : {}),
        ...(changes.supplierId !== undefined ? {
          supplier_id: changes.supplierId,
          supplier_name: suppliers.find((supplier) => supplier.id === changes.supplierId)?.name ?? null,
          operation_status: changes.status ?? (changes.supplierId ? "assigned" : "unassigned"),
        } : {}),
      } : item));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update order.");
    } finally {
      setSaving("");
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 rounded-2xl border border-[#DDE5D8] bg-white p-3 shadow-sm md:flex-row md:items-center">
        <label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718078]" /><span className="sr-only">Search orders</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reference, customer, address or supplier" className="h-11 w-full rounded-xl border border-[#D7E0D3] bg-[#FAFBF8] pl-10 pr-3 text-[13px] outline-none focus:border-[#65A30D]" /></label>
        <select value={filter} onChange={(event) => setFilter(event.target.value as OperationStatus | "all")} className="h-11 rounded-xl border border-[#D7E0D3] bg-white px-3 text-[12px] font-bold text-[#405347] outline-none"><option value="all">All workflow stages</option>{operationStatuses.map((status) => <option key={status} value={status}>{operationStatusLabels[status]}</option>)}</select>
      </div>
      {error ? <p role="alert" className="mt-3 flex items-center gap-2 rounded-xl bg-[#FFF0ED] px-4 py-3 text-[12px] font-bold text-[#93382C]"><CircleAlert className="h-4 w-4" />{error}</p> : null}
      <div className="mt-4 space-y-3">
        {visible.map((booking) => (
          <article key={booking.id} className="rounded-2xl border border-[#DDE5D8] bg-white p-4 shadow-[0_8px_28px_rgba(25,45,34,0.05)]">
            <div className="grid gap-4 xl:grid-cols-[1.2fr_1.35fr_.8fr_1.15fr] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2"><strong className="font-mono text-[13px] text-[#0B3B24]">{booking.reference}</strong><span className={`rounded-full px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] ${operationStatusTone(booking.operation_status)}`}>{operationStatusLabels[booking.operation_status]}</span><span className={`rounded-full px-2 py-1 text-[9px] font-extrabold uppercase ${booking.payment_status === "paid" ? "bg-[#E7F4E2] text-[#2F6B24]" : "bg-[#F1EDF8] text-[#684C91]"}`}>{booking.payment_status}</span></div>
                <p className="mt-2 flex items-center gap-2 text-[12px] font-bold text-[#314B3D]"><UserRound className="h-3.5 w-3.5 text-[#65A30D]" />{booking.full_name || "Customer unavailable"}</p>
                <p className="mt-1 text-[11px] text-[#718078]">{booking.phone} · {booking.email}</p>
              </div>
              <div>
                <p className="flex items-start gap-2 text-[12px] font-semibold leading-5 text-[#314B3D]"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#65A30D]" />{booking.street_address || "Address unavailable"}, {booking.postcode}</p>
                <p className="mt-1 flex items-center gap-2 text-[11px] text-[#718078]"><CalendarDays className="h-3.5 w-3.5" />Deliver {booking.delivery_date || "TBC"} · Pick up {booking.pickup_date || "TBC"}</p>
              </div>
              <div><p className="text-[15px] font-extrabold text-[#0B3B24]">{booking.bin_size.replace("m3", "m³")}</p><p className="mt-1 text-[11px] capitalize text-[#718078]">{booking.waste_type} · {booking.placement || "Placement TBC"}</p><p className="mt-1 text-[12px] font-bold text-[#405347]">{formatCurrency(booking.amount_cents / 100)}</p></div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <label className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#718078]">Supplier<select disabled={!booking.manageable || saving === booking.id} value={booking.supplier_id ?? ""} onChange={(event) => updateOrder(booking, { supplierId: event.target.value || null })} className="mt-1 h-9 w-full rounded-lg border border-[#D7E0D3] bg-white px-2 text-[11px] font-bold normal-case tracking-normal text-[#314B3D]"><option value="">Unassigned</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}{supplier.status === "paused" ? " (paused)" : ""}</option>)}</select></label>
                <label className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#718078]">Workflow<select disabled={!booking.manageable || saving === booking.id} value={booking.operation_status} onChange={(event) => updateOrder(booking, { status: event.target.value as OperationStatus })} className="mt-1 h-9 w-full rounded-lg border border-[#D7E0D3] bg-white px-2 text-[11px] font-bold normal-case tracking-normal text-[#314B3D]">{operationStatuses.map((status) => <option key={status} value={status}>{operationStatusLabels[status]}</option>)}</select></label>
              </div>
            </div>
            {booking.notes || booking.access ? <p className="mt-3 border-t border-[#EDF1EA] pt-3 text-[11px] leading-5 text-[#66746B]"><strong className="text-[#405347]">Site notes:</strong> {[booking.access, booking.notes].filter(Boolean).join(" · ")}</p> : null}
          </article>
        ))}
        {!visible.length ? <div className="rounded-2xl border border-dashed border-[#C9D5C5] bg-white/60 px-6 py-12 text-center text-[13px] text-[#718078]">No orders match these filters.</div> : null}
      </div>
    </div>
  );
}
