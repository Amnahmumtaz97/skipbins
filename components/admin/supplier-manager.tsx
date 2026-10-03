"use client";

import { FormEvent, useState } from "react";
import { CircleAlert, Mail, MapPin, Phone, Plus, Save, Truck, X } from "lucide-react";
import { bins } from "@/lib/data/skip-bins";
import type { OperationsBooking, SupplierRecord } from "@/lib/server/operations-service";

export function SupplierManager({ initialSuppliers, bookings, setupRequired, setupMessage }: { initialSuppliers: SupplierRecord[]; bookings: OperationsBooking[]; setupRequired: boolean; setupMessage: string }) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");

  async function addSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving("new"); setError("");
    const data = new FormData(event.currentTarget);
    const body = { name: data.get("name"), contactName: data.get("contactName"), email: data.get("email"), phone: data.get("phone"), serviceArea: data.get("serviceArea"), authUserId: data.get("authUserId") };
    try { const response = await fetch("/api/admin/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Could not add supplier."); setSuppliers((current) => [...current, result.supplier]); setAdding(false); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not add supplier."); }
    finally { setSaving(""); }
  }

  async function saveSupplier(supplier: SupplierRecord, form: HTMLFormElement) {
    setSaving(supplier.id); setError("");
    const data = new FormData(form);
    const binInventory = Object.fromEntries(bins.map((bin) => [bin.id, Number(data.get(bin.id) ?? 0)]));
    try { const response = await fetch(`/api/admin/suppliers/${supplier.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ binInventory }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Could not save inventory."); setSuppliers((current) => current.map((item) => item.id === supplier.id ? result.supplier : item)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save inventory."); }
    finally { setSaving(""); }
  }

  async function toggleStatus(supplier: SupplierRecord) {
    setSaving(supplier.id); setError("");
    try { const response = await fetch(`/api/admin/suppliers/${supplier.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: supplier.status === "active" ? "paused" : "active" }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Could not update supplier."); setSuppliers((current) => current.map((item) => item.id === supplier.id ? result.supplier : item)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update supplier."); }
    finally { setSaving(""); }
  }

  return <div>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#65A30D]">Network management</p><h1 className="mt-1 text-[30px] font-extrabold tracking-[-0.04em] text-[#0B3B24]">Suppliers</h1><p className="mt-2 text-[13px] text-[#66746B]">Availability, coverage and workload across your supply network.</p></div><button type="button" onClick={() => setAdding((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B3B24] px-4 py-3 text-[11px] font-extrabold text-white">{adding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{adding ? "Close" : "Add supplier"}</button></div>
    {setupRequired ? <div className="mt-5 flex gap-3 rounded-2xl border border-[#ECD4A1] bg-[#FFF7E6] p-4 text-[#7B5310]"><CircleAlert className="h-5 w-5 shrink-0" /><p className="text-[11px] leading-5">{setupMessage}</p></div> : null}
    {error ? <p role="alert" className="mt-4 rounded-xl bg-[#FFF0ED] px-4 py-3 text-[11px] font-bold text-[#93382C]">{error}</p> : null}
    {adding ? <form onSubmit={addSupplier} className="mt-5 rounded-2xl border border-[#DDE5D8] bg-white p-5 shadow-sm"><h2 className="text-[15px] font-extrabold text-[#0B3B24]">New supplier profile</h2><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3"><Field name="name" label="Business name" required /><Field name="contactName" label="Contact name" /><Field name="email" label="Email" type="email" /><Field name="phone" label="Phone" /><Field name="serviceArea" label="Service area" /><Field name="authUserId" label="Supabase Auth user ID" /></div><button disabled={saving === "new" || setupRequired} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#65A30D] px-4 py-2.5 text-[11px] font-extrabold text-white disabled:opacity-50"><Plus className="h-4 w-4" />Create supplier</button></form> : null}
    <div className="mt-6 grid gap-4 xl:grid-cols-2">{suppliers.map((supplier) => { const assigned = bookings.filter((booking) => booking.supplier_id === supplier.id && !["collected", "cancelled"].includes(booking.operation_status)); return <form key={supplier.id} onSubmit={(event) => { event.preventDefault(); void saveSupplier(supplier, event.currentTarget); }} className="rounded-2xl border border-[#DDE5D8] bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF4DF] text-[#397520]"><Truck className="h-5 w-5" /></span><div><h2 className="text-[16px] font-extrabold text-[#0B3B24]">{supplier.name}</h2><p className="mt-1 text-[10px] text-[#718078]">{supplier.contact_name || "Contact not set"}</p></div></div><button type="button" disabled={saving === supplier.id} onClick={() => toggleStatus(supplier)} className={`rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase ${supplier.status === "active" ? "bg-[#E7F4E2] text-[#2F6B24]" : "bg-[#FFF1D6] text-[#8A5700]"}`}>{supplier.status}</button></div><div className="mt-4 grid gap-2 text-[10.5px] text-[#526159] sm:grid-cols-3"><p className="flex gap-1.5"><MapPin className="h-3.5 w-3.5 text-[#65A30D]" />{supplier.service_area || "Area not set"}</p><p className="flex gap-1.5"><Phone className="h-3.5 w-3.5 text-[#65A30D]" />{supplier.phone || "Phone not set"}</p><p className="flex gap-1.5"><Mail className="h-3.5 w-3.5 text-[#65A30D]" />{supplier.email || "Email not set"}</p></div><div className="mt-4 border-t border-[#EDF1EA] pt-4"><div className="flex items-center justify-between"><p className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#718078]">Available bin stock</p><span className="text-[10px] font-bold text-[#405347]">{assigned.length} active jobs</span></div><div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">{bins.map((bin) => <label key={bin.id} className="text-center text-[8px] font-bold uppercase text-[#718078]">{bin.size}<input name={bin.id} type="number" min="0" max="999" defaultValue={supplier.bin_inventory[bin.id] ?? 0} className="mt-1 h-9 w-full rounded-lg border border-[#D7E0D3] bg-[#FAFBF8] px-1 text-center text-[11px] font-bold text-[#0B3B24] outline-none focus:border-[#65A30D]" /></label>)}</div><button disabled={saving === supplier.id} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#0B3B24] px-3 py-2 text-[10px] font-extrabold text-white disabled:opacity-50"><Save className="h-3.5 w-3.5" />Save capacity</button></div></form>; })}</div>
    {!suppliers.length && !adding ? <p className="mt-6 rounded-2xl border border-dashed border-[#C9D5C5] bg-white/60 px-6 py-12 text-center text-[13px] text-[#718078]">No suppliers yet. Add the first supplier to begin allocation.</p> : null}
  </div>;
}

function Field({ name, label, type = "text", required = false }: { name: string; label: string; type?: string; required?: boolean }) { return <label className="text-[10px] font-bold text-[#526159]">{label}<input name={name} type={type} required={required} className="mt-1.5 h-10 w-full rounded-lg border border-[#D7E0D3] px-3 text-[12px] outline-none focus:border-[#65A30D]" /></label>; }
