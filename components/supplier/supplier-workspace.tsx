"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Download,
  Eye,
  RotateCcw,
  Save,
  Truck,
  Wallet,
} from "lucide-react";
import { SupplierOrders } from "@/components/supplier/supplier-orders";
import { SupplierPostcodePicker } from "@/components/supplier/supplier-postcode-picker";

import { money, exportCsv, type Coverage } from "@/lib/admin-config";
import { formatBookingAddress } from "@/lib/booking-address";
import { addDaysIso } from "@/lib/booking-utils";
import { buildSupplierKpis } from "@/lib/operations-kpis";
import {
  supplierDispatch,
  supplierEarnings,
  supplierEarningsPeriods,
} from "@/lib/supplier-workspace";
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
  adminPostcodes?: string[];
  adminCoverage?: Coverage[];
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
  adminPostcodes = [],
  adminCoverage = [],
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
  const todaysJobs = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          !booking.deleted &&
          booking.operation_status !== "cancelled" &&
          (booking.delivery_date === today || booking.pickup_date === today),
      ),
    [bookings, today],
  );
  const needsAttention = kpis.active.filter(
    (booking) =>
      booking.operation_status === "issue" ||
      (Boolean(booking.pickup_date) && booking.pickup_date < today),
  ).length;
  const deliveriesToday = todaysJobs.filter(
    (booking) => booking.delivery_date === today,
  ).length;
  const collectionsToday = todaysJobs.filter(
    (booking) => booking.pickup_date === today,
  ).length;
  const dispatch = supplierDispatch(bookings, date);
  const paidEarnings = useMemo(
    () => supplierEarnings(bookings, commissionPercent, stripeFeePercent),
    [bookings, commissionPercent, stripeFeePercent],
  );
  const earnings = useMemo(
    () =>
      paidEarnings.filter(
        (row) => !month || row.booking.delivery_date.startsWith(month),
      ),
    [paidEarnings, month],
  );
  const periods = useMemo(
    () => supplierEarningsPeriods(paidEarnings, today),
    [paidEarnings, today],
  );
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
          <section className="supplier-day" aria-labelledby="supplier-day-title">
            <div className="supplier-day-top">
              <div>
                <p className="portal-eyebrow">
                  Ready for the day · {formatDayLabel(today)}
                </p>
                <h2 id="supplier-day-title">
                  {todaysJobs.length}{" "}
                  {todaysJobs.length === 1 ? "job" : "jobs"} today
                </h2>
                <p>
                  {movementLabel(deliveriesToday, "delivery", "deliveries")} and{" "}
                  {movementLabel(collectionsToday, "collection", "collections")}
                  .
                  {needsAttention
                    ? ` ${movementLabel(needsAttention, "job needs", "jobs need")} attention.`
                    : ""}
                </p>
              </div>
              <Link className="portal-button" href="/supplier/schedule">
                Open dispatch schedule <ArrowRight size={16} />
              </Link>
            </div>
            <div className="supplier-day-stats">
              <Metric
                label="Deliveries today"
                value={String(deliveriesToday)}
                icon={Truck}
              />
              <Metric
                label="Collections today"
                value={String(collectionsToday)}
                icon={RotateCcw}
              />
              <Metric
                label="Needs attention"
                value={String(needsAttention)}
                icon={CalendarDays}
                alert={needsAttention > 0}
              />
              <Metric
                label="Completed net estimate"
                value={earningsReady ? money(completed) : "Unavailable"}
                icon={Wallet}
              />
            </div>
          </section>
          <section className="mt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-extrabold">Today&apos;s jobs</h2>
              <Link className="portal-site-link" href="/supplier/orders">
                View all orders <ArrowRight size={14} />
              </Link>
            </div>
            <SupplierOrders
              initialBookings={todaysJobs}
              compact
              emptyMessage="No jobs are scheduled for today."
            />
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
                    {formatBookingAddress(b.street_address, b.postcode)}
                  </p>
                  <p>
                    {b.full_name} · {operationStatusLabels[b.operation_status]}
                  </p>
                </div>
                <div className="portal-actions">
                  <a
                    className="portal-button-secondary"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatBookingAddress(b.street_address, b.postcode))}`}
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
              ? `Estimates use the current ${commissionPercent}% platform commission and ${stripeFeePercent}% processing fee. Period totals follow delivery date: this week is Monday to Sunday, and yearly to date runs from 1 January through today. They are not confirmed bank transfers. Historical fee changes may affect estimates.`
              : "Fee settings could not be loaded. Earnings estimates are unavailable until the connection is restored."}
          </p>
          {earningsReady && (
            <>
              <div className="supplier-summary">
                {periods.map((period) => (
                  <Summary
                    key={period.label}
                    label={period.label}
                    value={money(period.net)}
                    commission={money(period.commission)}
                  />
                ))}
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
                          "Order",
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
                          <td data-label="Order">
                            <Link
                              className="portal-button-secondary"
                              href={`/supplier/orders?job=${encodeURIComponent(row.booking.id)}`}
                            >
                              <Eye size={15} />
                              View order
                            </Link>
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
          <div className="mt-4">
            <SupplierPostcodePicker
              value={profile.serviceArea}
              adminPostcodes={adminPostcodes}
              adminCoverage={adminCoverage}
              onChange={(serviceArea) =>
                setProfile((current) => ({ ...current, serviceArea }))
              }
            />
          </div>
          <p className="mt-5 text-xs text-[#405347]">
            Account: {supplier.status}. Contact the administrator for account
            access and availability changes.
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
  alert = false,
}: {
  label: string;
  value: string;
  icon: typeof Truck;
  alert?: boolean;
}) {
  return (
    <article className={`portal-stat${alert ? " supplier-day-alert" : ""}`}>
      <Icon size={18} className={alert ? "text-[#a34335]" : "text-[#65a30d]"} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
function movementLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}
function formatDayLabel(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(
    new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))),
  );
}
function Summary({
  label,
  value,
  commission,
}: {
  label: string;
  value: string;
  commission: string;
}) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>Commission {commission}</small>
    </article>
  );
}
