"use client";
import { useMemo, useState } from "react";
import {
  Eye,
  Search,
  SlidersHorizontal,
  Download,
  Truck,
  RotateCcw,
  ClipboardList,
  Save,
  Printer,
} from "lucide-react";
import {
  operationStatuses,
  operationStatusLabels,
  type OperationStatus,
} from "@/lib/data/operations";
import type {
  OperationsBooking,
  SupplierRecord,
} from "@/lib/server/operations-service";
import { acceptedWaste } from "@/lib/data/skip-bins";
import { exportCsv } from "@/lib/admin-config";
import { Field, Notice, Dialog, money } from "@/components/admin/portal-ui";
export function OrderManager({
  initialBookings,
  suppliers,
  today,
  initialSelectedId,
}: {
  initialBookings: OperationsBooking[];
  suppliers: SupplierRecord[];
  today: string;
  initialSelectedId?: string;
}) {
  const [bookings, setBookings] = useState(initialBookings),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState<OperationStatus | "all">("all"),
    [quick, setQuick] = useState("all"),
    [advanced, setAdvanced] = useState(false),
    [supplier, setSupplier] = useState("all"),
    [payment, setPayment] = useState("all"),
    [waste, setWaste] = useState("all"),
    [source, setSource] = useState("all"),
    [dateFrom, setDateFrom] = useState(""),
    [dateTo, setDateTo] = useState(""),
    [saving, setSaving] = useState(""),
    [error, setError] = useState(""),
    [selectedId, setSelectedId] = useState<string | null>(
      initialSelectedId ?? null,
    ),
    [notes, setNotes] = useState(
      initialBookings.find((b) => b.id === initialSelectedId)?.supplier_notes ??
        "",
    );
  const selected = bookings.find((b) => b.id === selectedId) ?? null;
  const visible = useMemo(
    () =>
      bookings.filter(
        (b) =>
          `${b.reference} ${b.full_name} ${b.email} ${b.phone} ${b.street_address} ${b.postcode} ${b.supplier_name ?? ""}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (filter === "all" || b.operation_status === filter) &&
          (quick === "all" ||
            (quick === "drops" && b.delivery_date === today) ||
            (quick === "picks" && b.pickup_date === today) ||
            (quick === "jobs" &&
              (b.delivery_date === today || b.pickup_date === today))) &&
          (supplier === "all" ||
            (supplier === "unassigned"
              ? !b.supplier_id
              : b.supplier_id === supplier)) &&
          (payment === "all" || b.payment_status === payment) &&
          (waste === "all" || b.waste_type === waste) &&
          (source === "all" || b.booking_source === source) &&
          (!dateFrom || b.delivery_date >= dateFrom) &&
          (!dateTo || b.delivery_date <= dateTo),
      ),
    [
      bookings,
      query,
      filter,
      quick,
      supplier,
      payment,
      waste,
      source,
      dateFrom,
      dateTo,
      today,
    ],
  );
  async function updateOrder(
    b: OperationsBooking,
    changes: {
      supplierId?: string | null;
      status?: OperationStatus;
      notes?: string;
      source?: "direct" | "ppc" | "manual";
    },
  ) {
    setSaving(b.id);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(b.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(changes),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not update booking.");
      setBookings((current) =>
        current.map((item) =>
          item.id === b.id
            ? {
                ...item,
                ...(changes.status ? { operation_status: changes.status } : {}),
                ...(changes.source !== undefined
                  ? { booking_source: changes.source }
                  : {}),
                ...(changes.notes !== undefined
                  ? { supplier_notes: changes.notes }
                  : {}),
                ...(changes.supplierId !== undefined
                  ? {
                      supplier_id: changes.supplierId,
                      supplier_name:
                        suppliers.find((s) => s.id === changes.supplierId)
                          ?.name ?? null,
                      operation_status:
                        changes.status ??
                        (changes.supplierId
                          ? "assigned"
                          : b.payment_status === "paid"
                            ? "unassigned"
                            : "payment_pending"),
                    }
                  : {}),
              }
            : item,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update booking.");
    } finally {
      setSaving("");
    }
  }
  function open(b: OperationsBooking) {
    setNotes(b.supplier_notes);
    setSelectedId(b.id);
  }
  function exportRows() {
    exportCsv(
      `bookings-${today}.csv`,
      [
        "Reference",
        "Customer",
        "Email",
        "Phone",
        "Postcode",
        "Delivery",
        "Pickup",
        "Bin",
        "Waste",
        "Payment",
        "Workflow",
        "Supplier",
        "Amount AUD",
      ],
      visible.map((b) => [
        b.reference,
        b.full_name,
        b.email,
        b.phone,
        b.postcode,
        b.delivery_date,
        b.pickup_date,
        b.bin_size,
        b.waste_type,
        b.payment_status,
        b.operation_status,
        b.supplier_name ?? "",
        (b.amount_cents / 100).toFixed(2),
      ]),
    );
  }
  return (
    <>
      <section className="portal-panel">
        <div className="portal-toolbar">
          <Field label="Search bookings">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Reference, customer, address or supplier"
            />
          </Field>
          <select
            aria-label="Workflow stage"
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value as OperationStatus | "all")
            }
          >
            <option value="all">All workflow stages</option>
            {operationStatuses.map((s) => (
              <option key={s} value={s}>
                {operationStatusLabels[s]}
              </option>
            ))}
          </select>
          <button
            className="portal-button-secondary"
            aria-expanded={advanced}
            onClick={() => setAdvanced(!advanced)}
          >
            <SlidersHorizontal size={15} />
            Advanced
          </button>
          <button className="portal-button-secondary" onClick={exportRows}>
            <Download size={15} />
            Export
          </button>
        </div>
        <div className="portal-tabs">
          {[
            { id: "all", label: "All bookings", icon: ClipboardList },
            { id: "drops", label: "Today's deliveries", icon: Truck },
            { id: "picks", label: "Today's collections", icon: RotateCcw },
            { id: "jobs", label: "Today's jobs", icon: ClipboardList },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-pressed={quick === id}
              onClick={() => setQuick(id)}
            >
              <Icon size={13} style={{ display: "inline", marginRight: 6 }} />
              {label}
            </button>
          ))}
        </div>
        {advanced && (
          <>
            <div className="portal-grid">
              <Field label="Supplier">
                <select
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                >
                  <option value="all">All suppliers</option>
                  <option value="unassigned">Unassigned</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Payment">
                <select
                  value={payment}
                  onChange={(e) => setPayment(e.target.value)}
                >
                  <option value="all">All payments</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </Field>
              <Field label="Waste type">
                <select
                  value={waste}
                  onChange={(e) => setWaste(e.target.value)}
                >
                  <option value="all">All waste types</option>
                  {acceptedWaste.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Booking source">
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  <option value="all">All sources</option>
                  <option value="direct">Direct</option>
                  <option value="ppc">PPC</option>
                  <option value="manual">Manual</option>
                </select>
              </Field>
              <Field label="Delivery from">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </Field>
              <Field label="Delivery until">
                <input
                  type="date"
                  min={dateFrom}
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </Field>
            </div>
            <div className="portal-footer-actions">
              <button
                className="portal-button-secondary"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                  setQuick("all");
                  setSupplier("all");
                  setPayment("all");
                  setWaste("all");
                  setSource("all");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Reset filters
              </button>
            </div>
          </>
        )}
        <p className="portal-subtle">
          {visible.length} booking{visible.length === 1 ? "" : "s"} · {today}{" "}
          Melbourne time
        </p>
      </section>
      <Notice message={error} />
      <div className="portal-table-wrap">
        <table className="portal-table mobile-cards">
          <thead>
            <tr>
              {[
                "Booking",
                "Customer",
                "Schedule",
                "Bin & value",
                "Workflow",
                "Supplier",
                "Action",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((b) => (
              <tr key={b.id}>
                <td data-label="Booking">
                  <strong>{b.reference}</strong>
                  <small>
                    <span
                      className={`portal-badge ${b.payment_status === "paid" ? "" : "warning"}`}
                    >
                      {b.payment_status}
                    </span>
                  </small>
                </td>
                <td data-label="Customer">
                  <strong>{b.full_name || "Unavailable"}</strong>
                  <small>{b.postcode} · VIC</small>
                </td>
                <td data-label="Schedule">
                  <strong>{b.delivery_date || "TBC"}</strong>
                  <small>Pickup {b.pickup_date || "TBC"}</small>
                </td>
                <td data-label="Bin & value">
                  <strong>{b.bin_size.replace("m3", "m³")}</strong>
                  <small>{money(b.amount_cents)}</small>
                </td>
                <td data-label="Workflow">
                  <select
                    aria-label={`Workflow for ${b.reference}`}
                    disabled={!b.manageable || saving === b.id}
                    value={b.operation_status}
                    onChange={(e) =>
                      updateOrder(b, {
                        status: e.target.value as OperationStatus,
                      })
                    }
                  >
                    {operationStatuses.map((s) => (
                      <option key={s} value={s}>
                        {operationStatusLabels[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td data-label="Supplier">
                  <select
                    aria-label={`Supplier for ${b.reference}`}
                    disabled={!b.manageable || saving === b.id}
                    value={b.supplier_id ?? ""}
                    onChange={(e) =>
                      updateOrder(b, { supplierId: e.target.value || null })
                    }
                  >
                    <option value="">Unassigned</option>
                    {suppliers
                      .filter(
                        (s) => s.status === "active" || s.id === b.supplier_id,
                      )
                      .map((s) => (
                        <option
                          key={s.id}
                          disabled={s.status !== "active"}
                          value={s.id}
                        >
                          {s.name}
                          {s.status === "paused" ? " (paused)" : ""}
                        </option>
                      ))}
                  </select>
                </td>
                <td data-label="Action">
                  <button
                    className="portal-button-secondary"
                    onClick={() => open(b)}
                  >
                    <Eye size={14} />
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <div className="portal-empty">
            <Search size={25} style={{ margin: "0 auto 12px" }} />
            No bookings match the current filters.
          </div>
        )}
      </div>
      {selected && (
        <Dialog
          title={`Booking ${selected.reference}`}
          onClose={() => !saving && setSelectedId(null)}
        >
          <div className="portal-grid">
            <Detail label="Customer" value={selected.full_name} />
            <Detail
              label="Phone & email"
              value={`${selected.phone}\n${selected.email}`}
            />
            <Detail
              label="Delivery address"
              value={`${selected.street_address}, VIC ${selected.postcode}`}
            />
            <Detail
              label="Delivery & collection"
              value={`${selected.delivery_date}\n${selected.pickup_date}`}
            />
            <Detail
              label="Bin & waste"
              value={`${selected.bin_size.replace("m3", "m³")} · ${acceptedWaste.find((w) => w.id === selected.waste_type)?.label ?? selected.waste_type}`}
            />
            <Detail
              label="Payment & hire"
              value={`${money(selected.amount_cents)} · ${selected.payment_status}\n${selected.hire_period}`}
            />
            <Detail
              label="Placement & access"
              value={`${selected.placement}\n${selected.access}`}
            />
            <Detail
              label="Customer notes"
              value={selected.notes || "No notes"}
            />
          </div>
          <div style={{ marginTop: 20 }}>
            <Field label="Booking source">
              <select
                value={selected.booking_source ?? "direct"}
                disabled={saving === selected.id}
                onChange={(e) =>
                  updateOrder(selected, {
                    source: e.target.value as "direct" | "ppc" | "manual",
                  })
                }
              >
                <option value="direct">Direct</option>
                <option value="ppc">PPC</option>
                <option value="manual">Manual</option>
              </select>
            </Field>
            <Field label="Supplier / dispatch notes">
              <textarea
                key={selected.id}
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>
          <Notice message={error} />
          <p className="portal-help">
            Cancelling updates dispatch status. Any payment refund must be
            reconciled separately.
          </p>
          <div className="portal-footer-actions">
            <button
              className="portal-button-secondary"
              onClick={() => window.print()}
            >
              <Printer size={15} />
              Print
            </button>
            <button
              className="portal-button"
              disabled={saving === selected.id || !selected.manageable}
              onClick={() => updateOrder(selected, { notes })}
            >
              <Save size={15} />
              {saving === selected.id ? "Saving…" : "Save notes"}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="portal-detail">
      <span>{label}</span>
      <p>{value || "—"}</p>
    </div>
  );
}
