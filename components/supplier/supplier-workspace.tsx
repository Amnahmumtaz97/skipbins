"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Download,
  RotateCcw,
  Save,
  Truck,
  Wallet,
} from "lucide-react";
import { SupplierOrders } from "@/components/supplier/supplier-orders";

import { money, exportCsv } from "@/lib/admin-config";
import { addDaysIso } from "@/lib/booking-utils";
import { buildSupplierKpis } from "@/lib/operations-kpis";
import { supplierDispatch, supplierEarnings } from "@/lib/supplier-workspace";
import { operationStatusLabels } from "@/lib/data/operations";
import type {
  OperationsBooking,
  SupplierRecord,
} from "@/lib/server/operations-service";
export type SupplierView = "overview" | "schedule" | "earnings" | "profile";
type Props = {
  supplier: SupplierRecord | null;
  bookings: OperationsBooking[];
  commissionPercent: number;
  stripeFeePercent: number;
  earningsReady: boolean;
  loadError?: string;
  today: string;
  view: SupplierView;
};
const titles: Record<SupplierView, [string, string]> = {
  overview: [
    "Your business at a glance",
    "Keep deliveries moving, track collections and review the work that needs your attention.",
  ],
  schedule: [
    "Dispatch schedule",
    "Plan daily deliveries and collections across your Victorian service area.",
  ],
  earnings: [
    "Earnings & statements",
    "Review paid order values and estimated earnings after configured platform fees.",
  ],

  profile: [
    "Business profile",
    "Keep your contact details and Victorian postcode coverage up to date.",
  ],
};
export function SupplierWorkspace({
  supplier,
  bookings,
  commissionPercent,
  stripeFeePercent,
  earningsReady,
  today,
  loadError,
  view,
}: Props) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState("");
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: supplier?.name ?? "",
    contactName: supplier?.contact_name ?? "",
    email: supplier?.email ?? "",
    phone: supplier?.phone ?? "",
    abn: supplier?.abn ?? "",
    serviceArea: supplier?.service_area ?? "",
  });

  const kpis = buildSupplierKpis(bookings, today);
  const dispatch = supplierDispatch(bookings, date);
  const earnings = useMemo(
    () =>
      supplierEarnings(bookings, commissionPercent, stripeFeePercent).filter(
        (row) => !month || row.booking.delivery_date.startsWith(month),
      ),
    [bookings, commissionPercent, stripeFeePercent, month],
  );
  const total = earnings.reduce((sum, row) => sum + row.net, 0);
  const completed = earnings
    .filter((row) => row.booking.operation_status === "collected")
    .reduce((sum, row) => sum + row.net, 0);
  const months = [
    ...new Set(
      bookings.map((b) => b.delivery_date.slice(0, 7)).filter(Boolean),
    ),
  ]
    .sort()
    .reverse();
  async function save() {
    setSaving(true);
    setError("");
    setSaved("");
    try {
      const response = await fetch("/api/supplier/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not save your changes.");
      setSaved("Business profile saved.");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save your changes.",
      );
    } finally {
      setSaving(false);
    }
  }
  if (loadError)
    return (
      <div className="portal-panel">
        <h1 className="text-xl font-extrabold">Jobs temporarily unavailable</h1>
        <p className="mt-3 text-sm" role="alert">
          {loadError}
        </p>
        <button
          type="button"
          className="portal-button mt-5"
          onClick={() => router.refresh()}
        >
          Try again
        </button>
      </div>
    );
  if (!supplier)
    return (
      <div className="portal-panel">
        <h1 className="text-xl font-extrabold">Supplier profile not linked</h1>
        <p className="mt-3 text-sm">
          Ask the administrator to link your Auth user ID to a supplier record
          before managing jobs.
        </p>
      </div>
    );
  return (
    <div>
      <div className="portal-heading">
        <div>
          <p className="portal-eyebrow">{supplier.name}</p>
          <h1>{titles[view][0]}</h1>
          <p>{titles[view][1]}</p>
        </div>
        <div className="portal-actions">
          <button
            type="button"
            className="portal-button-secondary"
            onClick={() => router.refresh()}
          >
            Refresh
          </button>
          {view !== "overview" && (
            <Link className="portal-button-secondary" href="/supplier">
              Overview
            </Link>
          )}
        </div>
      </div>
      {saved && (
        <p className="supplier-notice" role="status">
          {saved}
        </p>
      )}
      {error && (
        <p className="supplier-notice supplier-alert" role="alert">
          {error}
        </p>
      )}
      {bookings.some((b) => b.reference.startsWith("DEMO-")) && (
        <p className="supplier-notice">
          Sample jobs are labelled DEMO. Customer and address details on these
          records are fictional.
        </p>
      )}
      {supplier.status === "paused" && (
        <p className="supplier-notice">
          Your business is paused for new assignments. Contact the administrator
          to change availability.
        </p>
      )}
      {view === "overview" && (
        <>
          <section className="portal-dashboard-hero">
            <div>
              <p className="portal-eyebrow">READY FOR THE DAY · {today}</p>
              <h2>
                {kpis.deliveriesToday + kpis.collectionsToday} movements
                scheduled today
              </h2>
              <p>
                {kpis.issues ? `${kpis.issues} job needs attention. ` : ""}Your
                delivery and collection tools are one click away.
              </p>
              <Link className="portal-button" href="/supplier/schedule">
                Open dispatch schedule <ArrowRight size={16} />
              </Link>
            </div>
            <div className="portal-hero-number">
              <Truck size={28} />
              <strong>{kpis.active.length}</strong>
              <span>active jobs</span>
            </div>
          </section>
          <section className="portal-stats">
            <Metric
              label="Deliveries today"
              value={String(kpis.deliveriesToday)}
              icon={Truck}
            />
            <Metric
              label="Collections today"
              value={String(kpis.collectionsToday)}
              icon={RotateCcw}
            />
            <Metric
              label="Needs attention"
              value={String(
                kpis.active.filter(
                  (b) =>
                    b.operation_status === "issue" ||
                    (Boolean(b.pickup_date) && b.pickup_date < today),
                ).length,
              )}
              icon={CalendarDays}
            />
            <Metric
              label="Completed net estimate"
              value={earningsReady ? money(completed) : "Unavailable"}
              icon={Wallet}
            />
          </section>
          <div className="portal-dashboard-columns">
            <section className="portal-panel">
              <h2 className="text-base font-extrabold">Job pipeline</h2>
              <div className="portal-pipeline">
                {(
                  [
                    "assigned",
                    "scheduled",
                    "delivered",
                    "collection_due",
                    "collected",
                    "issue",
                  ] as const
                ).map((status) => {
                  const count = bookings.filter(
                    (b) => b.operation_status === status,
                  ).length;
                  return (
                    <Link href="/supplier/orders" key={status}>
                      <span>{operationStatusLabels[status]}</span>
                      <div>
                        <span
                          style={{
                            width: `${bookings.length ? (count / bookings.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <strong>{count}</strong>
                    </Link>
                  );
                })}
              </div>
            </section>
            <section className="portal-panel">
              <h2 className="mb-4 text-base font-extrabold">
                Business shortcuts
              </h2>
              <div className="portal-shortcuts">
                {[
                  {
                    href: "orders",
                    title: "Manage assigned orders",
                    description:
                      "Accept jobs, update stages and record site notes",
                    icon: Truck,
                  },

                  {
                    href: "earnings",
                    title: "Review earnings",
                    description:
                      "View fee breakdowns and export your statement",
                    icon: Wallet,
                  },
                ].map(({ href, title, description, icon: Icon }) => (
                  <Link key={href} href={`/supplier/${href}`}>
                    <Icon size={20} />
                    <span>
                      <strong>{title}</strong>
                      <small>{description}</small>
                    </span>
                    <ArrowRight size={16} />
                  </Link>
                ))}
              </div>
            </section>
          </div>
          <section className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-extrabold">Active job controls</h2>
              <Link className="portal-site-link" href="/supplier/orders">
                View all orders <ArrowRight size={14} />
              </Link>
            </div>
            <SupplierOrders initialBookings={kpis.active} compact />
          </section>
        </>
      )}
      {view === "schedule" && (
        <section className="portal-panel">
          <div className="supplier-order-tools">
            <label className="supplier-field">
              Dispatch date
              <input
                aria-label="Dispatch date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <div className="portal-actions">
              <button
                className="portal-button-secondary"
                onClick={() => setDate(addDaysIso(date || today, -1))}
              >
                Previous day
              </button>
              <button
                className="portal-button-secondary"
                onClick={() => setDate(today)}
              >
                Today
              </button>
              <button
                className="portal-button-secondary"
                onClick={() => setDate(addDaysIso(date || today, 1))}
              >
                Next day
              </button>
              <button
                className="portal-button-secondary"
                onClick={() =>
                  exportCsv(
                    `dispatch-${date}.csv`,
                    ["Job", "Movement", "Address", "Postcode", "Bin", "Status"],
                    dispatch.map(({ booking: b, kind }) => [
                      b.reference,
                      kind,
                      b.street_address,
                      b.postcode,
                      b.bin_size,
                      operationStatusLabels[b.operation_status],
                    ]),
                  )
                }
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>
          <div className="supplier-schedule">
            {dispatch.map(({ booking: b, kind }) => (
              <article
                className="supplier-dispatch-card"
                key={`${b.id}-${kind}`}
              >
                <span className="portal-badge">{kind}</span>
                <div>
                  <h3>
                    {b.reference} · {b.bin_size.replace("m3", "m³")}
                  </h3>
                  <p>
                    {b.street_address}, VIC {b.postcode}
                  </p>
                  <p>
                    {b.full_name} · {operationStatusLabels[b.operation_status]}
                  </p>
                </div>
                <div className="portal-actions">
                  <a
                    className="portal-button-secondary"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.street_address}, VIC ${b.postcode}`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Directions
                  </a>
                  <Link
                    className="portal-button"
                    href={`/supplier/orders?job=${encodeURIComponent(b.id)}`}
                  >
                    Open job
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {!dispatch.length && (
            <p className="supplier-empty">
              No pending movements for this date. Choose another day to plan
              your dispatch.
            </p>
          )}
        </section>
      )}
      {view === "earnings" && (
        <>
          <p className="supplier-notice">
            {earningsReady
              ? `Estimates use the current ${commissionPercent}% platform commission and ${stripeFeePercent}% processing fee. They are not confirmed bank transfers. Historical fee changes may affect estimates.`
              : "Fee settings could not be loaded. Earnings estimates are unavailable until the connection is restored."}
          </p>
          {earningsReady && (
            <>
              <div className="supplier-summary">
                <Summary
                  label="Net estimate · all paid jobs"
                  value={money(total)}
                />
                <Summary
                  label="Completed jobs · net estimate"
                  value={money(completed)}
                />
                <Summary
                  label="Open jobs · net estimate"
                  value={money(total - completed)}
                />
              </div>
              <section className="portal-panel">
                <div className="supplier-order-tools">
                  <label className="supplier-field">
                    Delivery month
                    <select
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                    >
                      <option value="">All months</option>
                      {months.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="portal-button-secondary"
                    onClick={() =>
                      exportCsv(
                        "supplier-earnings.csv",
                        [
                          "Job",
                          "Delivery",
                          "Gross AUD",
                          "Commission AUD",
                          "Processing AUD",
                          "Net estimate AUD",
                          "Stage",
                        ],
                        earnings.map((row) => [
                          row.booking.reference,
                          row.booking.delivery_date,
                          (row.booking.amount_cents / 100).toFixed(2),
                          (row.commission / 100).toFixed(2),
                          (row.processing / 100).toFixed(2),
                          (row.net / 100).toFixed(2),
                          operationStatusLabels[row.booking.operation_status],
                        ]),
                      )
                    }
                  >
                    <Download size={16} />
                    Export statement
                  </button>
                </div>
                <div className="portal-table-wrap">
                  <table className="portal-table mobile-cards">
                    <thead>
                      <tr>
                        {[
                          "Job",
                          "Gross",
                          "Commission",
                          "Processing",
                          "Net estimate",
                          "Stage",
                        ].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {earnings.map((row) => (
                        <tr key={row.booking.id}>
                          <td data-label="Job">{row.booking.reference}</td>
                          <td data-label="Gross">
                            {money(row.booking.amount_cents)}
                          </td>
                          <td data-label="Commission">
                            {money(row.commission)}
                          </td>
                          <td data-label="Processing">
                            {money(row.processing)}
                          </td>
                          <td data-label="Net estimate">
                            <strong>{money(row.net)}</strong>
                          </td>
                          <td data-label="Stage">
                            {
                              operationStatusLabels[
                                row.booking.operation_status
                              ]
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!earnings.length && (
                  <p className="supplier-empty">
                    No paid orders for this period.
                  </p>
                )}
              </section>
            </>
          )}
        </>
      )}
      {view === "profile" && (
        <form
          className="portal-panel"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <h2 className="mb-5 text-base font-extrabold">
            Business & contact details
          </h2>
          <div className="supplier-info-grid">
            {(
              [
                { key: "name", label: "Business name", type: "text", max: 100 },
                {
                  key: "contactName",
                  label: "Contact name",
                  type: "text",
                  max: 100,
                },
                {
                  key: "email",
                  label: "Business email",
                  type: "email",
                  max: 254,
                },
                { key: "phone", label: "Phone", type: "tel", max: 30 },
                {
                  key: "abn",
                  label: "ABN (11 digits, optional)",
                  type: "text",
                  max: 30,
                },
                {
                  key: "serviceArea",
                  label: "Victorian postcodes, separated by commas",
                  type: "text",
                  max: 250,
                },
              ] as const
            ).map((field) => (
              <label key={field.key} className="supplier-field">
                {field.label}
                <input
                  type={field.type}
                  maxLength={field.max}
                  required={field.key === "name"}
                  value={profile[field.key]}
                  onChange={(e) =>
                    setProfile((current) => ({
                      ...current,
                      [field.key]: e.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <p className="mt-5 text-xs text-[#405347]">
            Account: {supplier.status}. Coverage accepts verified Victorian
            postcodes only. Contact the administrator for account access and
            availability changes.
          </p>
          <div className="portal-footer-actions">
            <button type="submit" className="portal-button" disabled={saving}>
              <Save size={16} />
              {saving ? "Saving…" : "Save business profile"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Truck;
}) {
  return (
    <article className="portal-stat">
      <Icon size={20} className="text-[#65a30d]" />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
