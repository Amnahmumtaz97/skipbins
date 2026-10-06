"use client";
import { melbourneDate } from "@/lib/admin-config";
import { useMemo, useState } from "react";
import { Download, Save, CalendarDays } from "lucide-react";
import type {
  OperationsBooking,
  SupplierRecord,
} from "@/lib/server/operations-service";
import type { PortalSettings } from "@/lib/admin-config";
import { exportCsv } from "@/lib/admin-config";
import { reportPeriod, summarizePayouts, bookingSource } from "@/lib/payouts";
import {
  PageHeading,
  Stat,
  Field,
  Notice,
  portalAction,
  money,
} from "@/components/admin/portal-ui";
export function PayoutManager({
  bookings,
  suppliers,
  today,
  initialSettings,
  ready,
  error,
}: {
  bookings: OperationsBooking[];
  suppliers: SupplierRecord[];
  today: string;
  initialSettings: PortalSettings;
  ready: boolean;
  error: string;
}) {
  const [period, setPeriod] = useState(reportPeriod(today, "fortnight")),
    [settings, setSettings] = useState(initialSettings),
    [excluded, setExcluded] = useState<string[]>([]),
    [showAll, setShowAll] = useState(false),
    [supplierId, setSupplierId] = useState("all"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [success, setSuccess] = useState(false);
  const invalid = period.start > period.end || !period.start || !period.end;
  const scoped = useMemo(
    () =>
      bookings.filter(
        (b) => supplierId === "all" || b.supplier_id === supplierId,
      ),
    [bookings, supplierId],
  );
  const report = summarizePayouts(
    scoped,
    period,
    today,
    settings.commissionPercent,
    settings.stripeFeePercent,
    excluded,
  );
  const supplierRows = [
    ...suppliers,
    ...(bookings.some((b) => !b.supplier_id)
      ? [{ id: "unassigned", name: "Unassigned bookings" }]
      : []),
  ]
    .map((s) => ({
      ...s,
      report: summarizePayouts(
        bookings.filter(
          (b) =>
            b.supplier_id === s.id || (s.id === "unassigned" && !b.supplier_id),
        ),
        period,
        today,
        settings.commissionPercent,
        settings.stripeFeePercent,
        excluded,
      ),
    }))
    .filter((s) => supplierId === "all" || s.id === supplierId)
    .filter((s) => showAll || s.report.payable.length);
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      await portalAction("settings", settings);
      setSuccess(true);
      setMessage("Report fee settings saved.");
    } catch (e) {
      setSuccess(false);
      setMessage(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  function download() {
    exportCsv(
      `payouts-${period.start}-${period.end}.csv`,
      [
        "Reference",
        "Supplier",
        "Source",
        "Delivery date",
        "Paid revenue AUD",
        "Commission AUD",
        "Fee AUD",
        "Net AUD",
      ],
      report.payable.map((b) => {
        const c = Math.round(
            (b.amount_cents * settings.commissionPercent) / 100,
          ),
          f = Math.round((b.amount_cents * settings.stripeFeePercent) / 100);
        return [
          b.reference,
          b.supplier_name ?? "Unassigned",
          bookingSource(b),
          b.delivery_date,
          (b.amount_cents / 100).toFixed(2),
          (c / 100).toFixed(2),
          (f / 100).toFixed(2),
          ((b.amount_cents - c - f) / 100).toFixed(2),
        ];
      }),
    );
  }
  return (
    <div>
      <PageHeading
        eyebrow="FINANCIAL OPERATIONS"
        title="Payouts & revenue"
        description="Reconcile paid bookings, commission and supplier earnings by period."
        actions={
          <button
            className="portal-button-secondary"
            disabled={invalid}
            onClick={download}
          >
            <Download size={16} />
            Export report
          </button>
        }
      />
      <Notice message={error} />
      <Notice message={message} success={success} />
      <section className="portal-panel">
        <h2>
          <CalendarDays
            size={17}
            style={{ display: "inline", marginRight: 8 }}
          />
          Reporting period
        </h2>
        <div className="portal-tabs" style={{ marginTop: 18 }}>
          {(
            [
              ["due", "Due payment"],
              ["next", "Next payment"],
              ["fortnight", "Current fortnight"],
              ["month", "This month"],
              ["lastMonth", "Last month"],
            ] as const
          ).map(([id, label]) => {
            const p = reportPeriod(today, id);
            return (
              <button
                key={id}
                aria-pressed={p.start === period.start && p.end === period.end}
                onClick={() => setPeriod(p)}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="portal-grid">
          <Field label="Start date">
            <input
              type="date"
              value={period.start}
              onChange={(e) => setPeriod({ ...period, start: e.target.value })}
            />
          </Field>
          <Field label="End date">
            <input
              type="date"
              min={period.start}
              value={period.end}
              onChange={(e) => setPeriod({ ...period, end: e.target.value })}
            />
          </Field>
          <Field label="Supplier">
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="all">All suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="portal-grid">
            <Field label="Commission (%)">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={settings.commissionPercent}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    commissionPercent: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Processing fee (%)">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={settings.stripeFeePercent}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    stripeFeePercent: Number(e.target.value),
                  })
                }
              />
            </Field>
          </div>
        </div>
        <div className="portal-footer-actions">
          <span className="portal-help">
            Fee estimates are configurable; they are not Stripe settlement
            totals.
          </span>
          <button
            className="portal-button"
            disabled={busy || !ready}
            onClick={save}
          >
            <Save size={15} />
            Save fee settings
          </button>
        </div>
      </section>
      <Notice
        message={
          invalid ? "Choose an end date on or after the start date." : ""
        }
      />
      {!invalid && (
        <>
          <div className="portal-stats">
            <Stat
              label="Jobs created in period"
              value={report.created.length}
              detail={`${report.cancelled.length} cancelled`}
            />
            <Stat
              label="Paid revenue created"
              value={money(report.createdRevenue)}
              detail="By booking creation date"
            />
            <Stat
              label="Payable bookings"
              value={report.payable.length}
              detail="Paid, non-cancelled, delivery date has passed"
            />
            <Stat
              label="Payable revenue"
              value={money(report.revenue)}
              detail="By delivery date"
            />
          </div>
          <div className="portal-stats">
            <Stat label="Commission" value={money(report.commissionCents)} />
            <Stat
              label="Estimated processing fees"
              value={money(report.feeCents)}
            />
            <Stat label="Supplier net" value={money(report.net)} />
            <Stat
              label="Cancelled booking value"
              value={money(report.cancelledValue)}
              detail="Excluded from payable amounts"
            />
          </div>
          <section className="portal-panel">
            <div className="portal-toolbar">
              <h2 style={{ flex: 1 }}>Supplier reconciliation</h2>
              <label className="portal-check">
                <input
                  type="checkbox"
                  checked={showAll}
                  onChange={(e) => setShowAll(e.target.checked)}
                />
                Show all suppliers
              </label>
            </div>
            <p>
              Direct, PPC and manual sources are shown separately. PPC
              exclusions affect this report. Unassigned jobs need allocation
              before settlement.
            </p>
            <div className="portal-table-wrap">
              <table className="portal-table mobile-cards">
                <thead>
                  <tr>
                    {[
                      "Supplier",
                      "Direct / PPC / Manual",
                      "Revenue",
                      "Commission",
                      "Net payable",
                      "PPC filter",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {supplierRows.map((s) => (
                    <tr key={s.id}>
                      <td data-label="Supplier">
                        <strong>{s.name}</strong>
                        <small>
                          {s.report.payable.length} payable bookings
                        </small>
                      </td>
                      <td data-label="Sources">
                        {["direct", "ppc", "manual"].map((source) => (
                          <span
                            key={source}
                            className="portal-chip"
                            style={{
                              display: "inline-block",
                              margin: 2,
                              padding: "4px 7px",
                            }}
                          >
                            {source}:{" "}
                            {
                              s.report.payable.filter(
                                (b) => bookingSource(b) === source,
                              ).length
                            }
                          </span>
                        ))}
                      </td>
                      <td data-label="Revenue">{money(s.report.revenue)}</td>
                      <td data-label="Commission">
                        {money(s.report.commissionCents)}
                      </td>
                      <td data-label="Net">
                        <strong>{money(s.report.net)}</strong>
                      </td>
                      <td data-label="PPC filter">
                        {s.id !== "unassigned" && (
                          <label className="portal-check">
                            <input
                              type="checkbox"
                              checked={excluded.includes(s.id)}
                              onChange={(e) =>
                                setExcluded((current) =>
                                  e.target.checked
                                    ? [...current, s.id]
                                    : current.filter((id) => id !== s.id),
                                )
                              }
                            />
                            Exclude PPC jobs
                          </label>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!supplierRows.length && (
                <p className="portal-empty">No payable jobs in this period.</p>
              )}
            </div>
          </section>
          <section className="portal-panel">
            <h2>Payable booking detail</h2>
            <p>
              {period.start} to {period.end} · Service dates use Melbourne time.
            </p>
            <div className="portal-table-wrap">
              <table className="portal-table mobile-cards">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Supplier</th>
                    <th>Delivery</th>
                    <th>Source</th>
                    <th>Paid amount</th>
                  </tr>
                </thead>
                <tbody>
                  {report.payable.map((b) => (
                    <tr key={b.id}>
                      <td data-label="Booking">
                        <strong>{b.reference}</strong>
                        <small>Created {melbourneDate(b.created_at)}</small>
                      </td>
                      <td data-label="Supplier">
                        {b.supplier_name ?? "Unassigned"}
                      </td>
                      <td data-label="Delivery">{b.delivery_date}</td>
                      <td data-label="Source">
                        <span className="portal-badge">{bookingSource(b)}</span>
                      </td>
                      <td data-label="Paid amount">{money(b.amount_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!report.payable.length && (
                <p className="portal-empty">
                  No paid deliveries are payable in this period.
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
