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
import { hireForDates } from "@/lib/booking-utils";
import { acceptedWaste } from "@/lib/data/skip-bins";
import { exportCsv } from "@/lib/admin-config";
import { Field, Notice, Dialog, money } from "@/components/admin/portal-ui";

type OrderDraft = {
  fullName: string;
  email: string;
  phone: string;
  streetAddress: string;
  postcode: string;
  deliveryDate: string;
  pickupDate: string;
  placement: string;
  access: string;
  customerNotes: string;
};
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
    [filter, setFilter] = useState<OperationStatus | "all" | "deleted">("all"),
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
          (filter === "all" ||
            (filter === "deleted"
              ? b.deleted
              : b.operation_status === filter)) &&
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
      mark?: "deleted" | "refunded" | "restored";
      details?: OrderDraft;
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
                ...(changes.mark === "deleted" ? { deleted: true } : {}),
                ...(changes.mark === "restored" ? { deleted: false } : {}),
                ...(changes.mark === "refunded"
                  ? { payment_status: "refunded" }
                  : {}),
                ...(changes.details
                  ? {
                      full_name: changes.details.fullName.trim(),
                      email: changes.details.email.trim(),
                      phone: changes.details.phone.trim(),
                      street_address: changes.details.streetAddress.trim(),
                      postcode: changes.details.postcode.trim(),
                      delivery_date: changes.details.deliveryDate,
                      pickup_date: changes.details.pickupDate,
                      hire_period:
                        hireForDates(
                          changes.details.deliveryDate,
                          changes.details.pickupDate,
                        )?.period ?? item.hire_period,
                      placement: changes.details.placement.trim(),
                      access: changes.details.access.trim(),
                      notes: changes.details.customerNotes.trim(),
                    }
                  : {}),
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
        "Booked",
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
        formatBookingDate(b.created_at),
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
              setFilter(e.target.value as OperationStatus | "all" | "deleted")
            }
          >
            <option value="all">All workflow stages</option>
            {operationStatuses.map((s) => (
              <option key={s} value={s}>
                {operationStatusLabels[s]}
              </option>
            ))}
            <option value="deleted">Flagged deleted</option>
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
                  <option value="refunded">Refunded</option>
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
                    Booked {formatBookingDate(b.created_at)}
                  </small>
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
                  {b.deleted && (
                    <span className="portal-badge warning">Flagged deleted</span>
                  )}
                  <select
                    aria-label={`Workflow for ${b.reference}`}
                    disabled={!b.manageable || saving === b.id || b.deleted}
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
                    Edit
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
        <OrderEditor
          key={selected.id}
          booking={selected}
          notes={notes}
          saving={saving === selected.id}
          error={error}
          onNotes={setNotes}
          onClose={() => !saving && setSelectedId(null)}
          onSave={(details) => updateOrder(selected, { notes, details })}
          onSource={(source) => updateOrder(selected, { source })}
          onMark={(mark) => updateOrder(selected, { mark })}
        />
      )}
    </>
  );
}
function OrderEditor({
  booking,
  notes,
  saving,
  error,
  onNotes,
  onClose,
  onSave,
  onSource,
  onMark,
}: {
  booking: OperationsBooking;
  notes: string;
  saving: boolean;
  error: string;
  onNotes: (value: string) => void;
  onClose: () => void;
  onSave: (details: OrderDraft) => void;
  onSource: (source: "direct" | "ppc" | "manual") => void;
  onMark: (mark: "deleted" | "refunded" | "restored") => void;
}) {
  const [draft, setDraft] = useState<OrderDraft>({
    fullName: booking.full_name,
    email: booking.email,
    phone: booking.phone,
    streetAddress: booking.street_address,
    postcode: booking.postcode,
    deliveryDate: booking.delivery_date,
    pickupDate: booking.pickup_date,
    placement: booking.placement,
    access: booking.access,
    customerNotes: booking.notes,
  });
  function set<K extends keyof OrderDraft>(key: K, value: OrderDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  const waste =
    acceptedWaste.find((item) => item.id === booking.waste_type)?.label ??
    booking.waste_type;
  return (
    <Dialog title={`Edit ${booking.reference}`} onClose={onClose}>
      <p className="portal-help">
        {booking.bin_size.replace("m3", "m³")} · {waste} ·{" "}
        {money(booking.amount_cents)} · {booking.payment_status}. Changing the
        address or dates does not change the amount already paid.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
        }}
      >
        <div className="portal-grid">
          <Field label="Date booked">
            <input value={formatBookingDate(booking.created_at)} readOnly />
          </Field>
          <Field label="Customer">
            <input
              value={draft.fullName}
              maxLength={100}
              required
              onChange={(event) => set("fullName", event.target.value)}
            />
          </Field>
          <Field label="Phone">
            <input
              value={draft.phone}
              maxLength={30}
              required
              onChange={(event) => set("phone", event.target.value)}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={draft.email}
              maxLength={254}
              required
              onChange={(event) => set("email", event.target.value)}
            />
          </Field>
          <Field label="Postcode">
            <input
              value={draft.postcode}
              inputMode="numeric"
              maxLength={4}
              required
              onChange={(event) => set("postcode", event.target.value)}
            />
          </Field>
          <Field label="Street address">
            <input
              value={draft.streetAddress}
              maxLength={300}
              required
              onChange={(event) => set("streetAddress", event.target.value)}
            />
          </Field>
          <Field label="Placement">
            <input
              value={draft.placement}
              maxLength={80}
              onChange={(event) => set("placement", event.target.value)}
            />
          </Field>
          <Field label="Delivery date">
            <input
              type="date"
              value={draft.deliveryDate}
              required
              onChange={(event) => set("deliveryDate", event.target.value)}
            />
          </Field>
          <Field label="Pickup date">
            <input
              type="date"
              value={draft.pickupDate}
              min={draft.deliveryDate}
              required
              onChange={(event) => set("pickupDate", event.target.value)}
            />
          </Field>
        </div>
        <div style={{ marginTop: 16 }}>
          <Field label="Access">
            <input
              value={draft.access}
              maxLength={200}
              onChange={(event) => set("access", event.target.value)}
            />
          </Field>
          <Field label="Customer notes">
            <textarea
              maxLength={2000}
              value={draft.customerNotes}
              onChange={(event) => set("customerNotes", event.target.value)}
            />
          </Field>
          <Field label="Booking source">
            <select
              value={booking.booking_source ?? "direct"}
              disabled={saving || !booking.manageable}
              onChange={(event) =>
                onSource(event.target.value as "direct" | "ppc" | "manual")
              }
            >
              <option value="direct">Direct</option>
              <option value="ppc">PPC</option>
              <option value="manual">Manual</option>
            </select>
          </Field>
          <Field label="Supplier / dispatch notes">
            <textarea
              maxLength={2000}
              value={notes}
              onChange={(event) => onNotes(event.target.value)}
            />
          </Field>
        </div>
        <Notice message={error} />
        <p className="portal-help">
          Mark deleted only flags the order. It stays in this list, and
          Restore puts it back on the same job stage. Refunded records the
          payment as refunded and removes it from income. Marking refunded
          does not send money back through Stripe.
        </p>
        <div className="portal-footer-actions">
          <button
            type="button"
            className="portal-button-secondary"
            onClick={() => window.print()}
          >
            <Printer size={15} />
            Print
          </button>
          <button
            type="button"
            className="portal-button-secondary"
            disabled={saving || !booking.manageable}
            onClick={() => onMark(booking.deleted ? "restored" : "deleted")}
          >
            {booking.deleted ? "Restore order" : "Mark deleted"}
          </button>
          <button
            type="button"
            className="portal-button-secondary"
            disabled={saving || !booking.manageable || booking.payment_status === "refunded"}
            onClick={() => onMark("refunded")}
          >
            {booking.payment_status === "refunded" ? "Refunded" : "Mark refunded"}
          </button>
          <button
            className="portal-button"
            disabled={saving || !booking.manageable}
          >
            <Save size={15} />
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function formatBookingDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Australia/Melbourne",
  }).format(date);
}
