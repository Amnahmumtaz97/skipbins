"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, CircleAlert, ClipboardPen, MapPin, Navigation, Phone, Search, TriangleAlert } from "lucide-react";
import { operationStatusLabels, operationStatusTone, supplierActionStatuses, type OperationStatus } from "@/lib/data/operations";
import type { OperationsBooking } from "@/lib/server/operations-service";

type ViewFilter = "all" | "today" | "action" | "issues" | "completed";
const nextStatus: Partial<Record<OperationStatus, OperationStatus>> = { unassigned: "accepted", assigned: "accepted", accepted: "scheduled", scheduled: "delivered", delivered: "collection_due", collection_due: "collected" };
const filters: { id: ViewFilter; label: string }[] = [{ id: "all", label: "All" }, { id: "today", label: "Today" }, { id: "action", label: "Needs action" }, { id: "issues", label: "Issues" }, { id: "completed", label: "Completed" }];

export function SupplierOrders({ initialBookings, compact = false }: { initialBookings: OperationsBooking[]; compact?: boolean }) {
  const [bookings, setBookings] = useState(initialBookings);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ViewFilter>("all");
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(initialBookings.map((booking) => [booking.id, booking.supplier_notes])));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  const visible = useMemo(() => bookings.filter((booking) => {
    const matchesSearch = `${booking.reference} ${booking.full_name} ${booking.street_address} ${booking.postcode}`.toLowerCase().includes(query.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "today") return booking.delivery_date === today || booking.pickup_date === today;
    if (filter === "action") return ["assigned", "collection_due"].includes(booking.operation_status) || (Boolean(booking.pickup_date) && booking.pickup_date < today && !["collected", "cancelled"].includes(booking.operation_status));
    if (filter === "issues") return booking.operation_status === "issue";
    if (filter === "completed") return booking.operation_status === "collected";
    return true;
  }).sort((a, b) => (a.delivery_date || "9999").localeCompare(b.delivery_date || "9999")).slice(0, compact ? 8 : undefined), [bookings, compact, filter, query, today]);

  async function update(booking: OperationsBooking, changes: { status?: OperationStatus; notes?: string }) {
    setSaving(booking.id); setError("");
    try {
      const response = await fetch(`/api/supplier/orders/${encodeURIComponent(booking.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update the job.");
      setBookings((current) => current.map((item) => item.id === booking.id ? { ...item, ...(changes.status ? { operation_status: changes.status } : {}), ...(changes.notes !== undefined ? { supplier_notes: changes.notes } : {}) } : item));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update the job."); }
    finally { setSaving(""); }
  }

  return <div>
    {!compact ? <div className="rounded-2xl border border-[#DDE5D8] bg-white p-3 shadow-sm"><label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718078]" /><span className="sr-only">Search assigned orders</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search job number, customer, address or postcode" className="h-11 w-full rounded-xl border border-[#D7E0D3] bg-[#FAFBF8] pl-10 pr-3 text-[13px] outline-none focus:border-[#65A30D]" /></label><div className="mt-2 flex gap-1.5 overflow-x-auto pb-1" aria-label="Order filters">{filters.map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-[10px] font-extrabold transition ${filter === item.id ? "bg-[#0B3B24] text-white" : "bg-[#EEF3EA] text-[#526159] hover:bg-[#E1EADB]"}`}>{item.label}</button>)}</div></div> : null}
    {error ? <p role="alert" className="mt-3 flex gap-2 rounded-xl bg-[#FFF0ED] p-3 text-[11px] font-bold text-[#93382C]"><CircleAlert className="h-4 w-4 shrink-0" />{error}</p> : null}
    <div className={`${compact ? "" : "mt-4"} space-y-3`}>{visible.map((booking) => { const advance = nextStatus[booking.operation_status]; const overdue = Boolean(booking.pickup_date) && booking.pickup_date < today && !["collected", "cancelled"].includes(booking.operation_status); return <article key={booking.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${booking.operation_status === "issue" || overdue ? "border-[#EBC7BF]" : "border-[#DDE5D8]"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><strong className="font-mono text-[12px] text-[#0B3B24]">{booking.reference}</strong><span className={`rounded-full px-2 py-1 text-[8px] font-extrabold uppercase ${operationStatusTone(booking.operation_status)}`}>{operationStatusLabels[booking.operation_status]}</span>{overdue ? <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF0ED] px-2 py-1 text-[8px] font-extrabold uppercase text-[#93382C]"><TriangleAlert className="h-2.5 w-2.5" />Overdue</span> : null}</div><p className="text-[11px] font-extrabold text-[#0B3B24]">{booking.bin_size.replace("m3", "m³")} · <span className="capitalize">{booking.waste_type}</span></p></div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_.8fr]"><div><p className="flex items-start gap-2 text-[12px] font-bold leading-5 text-[#314B3D]"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#65A30D]" />{booking.street_address}, {booking.postcode}</p><p className="mt-2 flex items-center gap-2 text-[11px] text-[#66746B]"><CalendarDays className="h-3.5 w-3.5" />Delivery {booking.delivery_date} · Pickup {booking.pickup_date || "TBC"}</p><p className="mt-2 text-[11px] text-[#66746B]"><strong className="text-[#405347]">Placement:</strong> {booking.placement || "TBC"}</p></div><div className="rounded-xl bg-[#F4F8F0] p-3"><p className="text-[9px] font-extrabold uppercase tracking-[.08em] text-[#718078]">Customer</p><p className="mt-1 text-[12px] font-bold text-[#314B3D]">{booking.full_name}</p><div className="mt-2 flex gap-2"><a href={`tel:${booking.phone}`} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-2 text-[10px] font-bold text-[#315B28]"><Phone className="h-3 w-3" /> Call</a><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${booking.street_address}, ${booking.postcode}`)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-2 text-[10px] font-bold text-[#315B28]"><Navigation className="h-3 w-3" /> Directions</a></div></div></div>
      {booking.access || booking.notes ? <p className="mt-3 rounded-xl bg-[#FFF8E8] px-3 py-2.5 text-[10.5px] leading-5 text-[#72551B]"><strong>Site notes:</strong> {[booking.access, booking.notes].filter(Boolean).join(" · ")}</p> : null}
      <div className="mt-3 flex flex-col gap-2 border-t border-[#EDF1EA] pt-3 sm:flex-row sm:items-center"><div className="flex flex-1 flex-wrap gap-2">{advance ? <button type="button" disabled={saving === booking.id} onClick={() => update(booking, { status: advance })} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B3B24] px-3 py-2 text-[9px] font-extrabold text-white disabled:opacity-45">{advance === "collected" ? <CheckCircle2 className="h-3 w-3" /> : null}{operationStatusLabels[advance]}</button> : null}<select aria-label={`Change status for ${booking.reference}`} defaultValue="" disabled={saving === booking.id} onChange={(event) => { if (event.target.value) void update(booking, { status: event.target.value as OperationStatus }); event.target.value = ""; }} className="h-8 rounded-lg border border-[#D7E0D3] bg-white px-2 text-[9px] font-bold text-[#405347]"><option value="">More status options…</option>{supplierActionStatuses.filter((status) => status !== booking.operation_status && status !== advance).map((status) => <option key={status} value={status}>{operationStatusLabels[status]}</option>)}</select></div><details className="group sm:relative"><summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg bg-[#EEF3EA] px-3 py-2 text-[9px] font-extrabold text-[#405347]"><ClipboardPen className="h-3 w-3" />Supplier note</summary><div className="mt-2 rounded-xl border border-[#DDE5D8] bg-white p-3 shadow-lg sm:absolute sm:right-0 sm:z-20 sm:w-[300px]"><label className="text-[9px] font-extrabold uppercase tracking-[.08em] text-[#718078]">Internal job note<textarea value={notes[booking.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [booking.id]: event.target.value }))} maxLength={500} placeholder="Add delivery, access or collection update…" className="mt-1.5 min-h-20 w-full resize-y rounded-lg border border-[#D7E0D3] p-2.5 text-[11px] font-medium normal-case tracking-normal outline-none focus:border-[#65A30D]" /></label><button type="button" disabled={saving === booking.id} onClick={() => update(booking, { notes: notes[booking.id] ?? "" })} className="mt-2 w-full rounded-lg bg-[#0B3B24] px-3 py-2 text-[9px] font-extrabold text-white disabled:opacity-45">Save supplier note</button></div></details></div>
    </article>; })}{!visible.length ? <p className="rounded-2xl border border-dashed border-[#C9D5C5] bg-white/60 px-6 py-12 text-center text-[12px] text-[#718078]">No assigned orders match this view.</p> : null}</div>
  </div>;
}
