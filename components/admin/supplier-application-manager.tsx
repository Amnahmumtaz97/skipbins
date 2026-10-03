"use client";

import { useState } from "react";
import { Check, Eye, X } from "lucide-react";
import type { SupplierApplication } from "@/lib/server/operations-service";

export function SupplierApplicationManager({ initialApplications }: { initialApplications: SupplierApplication[] }) {
  const [applications, setApplications] = useState(initialApplications);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = applications.find((application) => application.id === selectedId) ?? null;

  async function review(id: string, decision: "approved" | "rejected") {
    setSaving(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/supplier-applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not review this application.");
      setApplications((current) => current.map((application) => application.id === id ? { ...application, status: decision } : application));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not review this application.");
    } finally {
      setSaving("");
    }
  }

  const pending = applications.filter((application) => application.status === "pending").length;

  return <div className="mx-auto max-w-[1400px]"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#65A30D]">Supplier network</p><h1 className="mt-1 text-[30px] font-extrabold tracking-[-0.04em] text-[#0B3B24]">Applications</h1><p className="mt-2 text-[13px] text-[#66746B]">Review new partners before activating their supplier portal access.</p></div>
    {error ? <p role="alert" className="mt-5 rounded-xl bg-[#FFF0ED] px-4 py-3 text-[11px] font-bold text-[#93382C]">{error}</p> : null}
    <div className="mt-6 flex items-center justify-between rounded-t-2xl border border-[#D6DFD2] bg-white px-4 py-3"><p className="text-[11px] font-extrabold text-[#0B3B24]">Application register</p><span className="rounded-full bg-[#EAF4DF] px-2.5 py-1 text-[9px] font-extrabold text-[#397520]">{pending} awaiting review</span></div>
    <div className="overflow-x-auto rounded-b-2xl border border-t-0 border-[#D6DFD2] bg-white shadow-sm"><table className="w-full min-w-[650px] border-collapse text-left text-[10px]"><thead className="bg-[#EAF0E6] text-[#405347]"><tr>{["Company", "Applied", "Status", "Actions"].map((heading) => <th key={heading} scope="col" className="whitespace-nowrap border-b border-r border-[#CBD7C7] px-3 py-3 font-extrabold uppercase tracking-[.07em] last:border-r-0">{heading}</th>)}</tr></thead><tbody>{applications.map((application, index) => <tr key={application.id} className={index % 2 ? "bg-[#FBFCFA]" : "bg-white"}><Cell><strong className="block text-[11px] text-[#0B3B24]">{application.company_name}</strong><span className="mt-1 block text-[#7B887F]">{application.contact_name}</span></Cell><Cell><span className="whitespace-nowrap">{formatDate(application.created_at)}</span></Cell><Cell><Status status={application.status} /></Cell><Cell><div className="flex flex-wrap gap-1.5"><button type="button" onClick={() => setSelectedId(application.id)} className="inline-flex items-center gap-1 rounded-lg bg-[#EEF3EA] px-2.5 py-2 text-[9px] font-extrabold text-[#315B28]"><Eye className="h-3 w-3" />Details</button>{application.status === "pending" ? <><button type="button" disabled={saving === application.id} onClick={() => review(application.id, "approved")} className="inline-flex whitespace-nowrap items-center gap-1 rounded-lg bg-[#0B3B24] px-2.5 py-2 text-[9px] font-extrabold text-white disabled:opacity-50"><Check className="h-3 w-3" />Approve</button><button type="button" disabled={saving === application.id} onClick={() => review(application.id, "rejected")} className="inline-flex items-center gap-1 rounded-lg border border-[#E6CBC5] px-2.5 py-2 text-[9px] font-extrabold text-[#8E2F23] disabled:opacity-50"><X className="h-3 w-3" />Reject</button></> : null}</div></Cell></tr>)}</tbody></table>{!applications.length ? <p className="px-6 py-12 text-center text-[12px] text-[#718078]">No supplier applications have been submitted.</p> : null}</div>
    {selected ? <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#061C11]/60 p-4" role="dialog" aria-modal="true" aria-label={`Application from ${selected.company_name}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}><section className="w-full max-w-[520px] rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[9px] font-extrabold uppercase tracking-[.1em] text-[#65A30D]">Supplier application</p><h2 className="mt-1 text-[20px] font-extrabold text-[#0B3B24]">{selected.company_name}</h2></div><button type="button" onClick={() => setSelectedId(null)} aria-label="Close application details" className="rounded-lg bg-[#EEF3EA] p-2 text-[#405347]"><X className="h-4 w-4" /></button></div><dl className="mt-4 grid gap-3 sm:grid-cols-2"><Detail label="Contact" value={selected.contact_name} /><Detail label="Phone" value={selected.phone} /><Detail label="Business email" value={selected.email} wide /><Detail label="ABN" value={selected.abn || "Not provided"} /><Detail label="Applied" value={formatDate(selected.created_at)} /></dl></section></div> : null}
  </div>;
}

function Status({ status }: { status: SupplierApplication["status"] }) { const styles = status === "approved" ? "bg-[#E7F4E2] text-[#2F6B24]" : status === "rejected" ? "bg-[#FFF0ED] text-[#8E2F23]" : "bg-[#FFF1D6] text-[#8A5700]"; return <span className={`rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase ${styles}`}>{status}</span>; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Unknown" : new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(date); }
function Cell({ children }: { children: React.ReactNode }) { return <td className="border-b border-r border-[#E1E7DE] px-3 py-3 text-[#526159] last:border-r-0">{children}</td>; }
function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) { return <div className={`rounded-xl bg-[#F4F8F0] p-3 ${wide ? "sm:col-span-2" : ""}`}><dt className="text-[9px] font-extrabold uppercase tracking-[.08em] text-[#718078]">{label}</dt><dd className="mt-1 break-words text-[12px] font-semibold text-[#314B3D]">{value}</dd></div>; }
