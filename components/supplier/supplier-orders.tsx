"use client";
import { useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Download,
  Eye,
  Navigation,
  Phone,
  Save,
  X,
} from "lucide-react";
import {
  operationStatusLabels,
  operationStatusTone,
  supplierActionStatuses,
  type OperationStatus,
} from "@/lib/data/operations";
import { exportCsv } from "@/lib/admin-config";
import type { OperationsBooking } from "@/lib/server/operations-service";
type ViewFilter = "all" | "today" | "action" | "issues" | "completed";
const nextStatus: Partial<Record<OperationStatus, OperationStatus>> = {
  assigned: "accepted",
  accepted: "scheduled",
  scheduled: "delivered",
  delivered: "collection_due",
  collection_due: "collected",
};
const filters: { id: ViewFilter; label: string }[] = [
  { id: "all", label: "All jobs" },
  { id: "today", label: "Today" },
  { id: "action", label: "Needs action" },
  { id: "issues", label: "Issues" },
  { id: "completed", label: "Completed" },
];
export function SupplierOrders({
  initialBookings,
  compact = false,
  initialSelectedId,
}: {
  initialBookings: OperationsBooking[];
  compact?: boolean;
  initialSelectedId?: string;
}) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ViewFilter>("all");
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? null,
  );
  const selected = bookings.find((b) => b.id === selectedId) ?? null;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const visible = useMemo(
    () =>
      bookings
        .filter((b) => {
          if (
            !`${b.reference} ${b.full_name} ${b.street_address} ${b.postcode} ${b.bin_size}`
              .toLowerCase()
              .includes(query.toLowerCase())
          )
            return false;
          if (filter === "today")
            return b.delivery_date === today || b.pickup_date === today;
          if (filter === "action")
            return (
              ["assigned", "collection_due"].includes(b.operation_status) ||
              isOverdue(b, today)
            );
          if (filter === "issues") return b.operation_status === "issue";
          if (filter === "completed") return b.operation_status === "collected";
          return true;
        })
        .sort((a, b) =>
          (a.delivery_date || "9999").localeCompare(b.delivery_date || "9999"),
        )
        .slice(0, compact ? 6 : undefined),
    [bookings, compact, filter, query, today],
  );
  async function update(
    booking: OperationsBooking,
    changes: { status?: OperationStatus; notes?: string },
  ) {
    if (saving) return;
    setSaving(booking.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/supplier/orders/${encodeURIComponent(booking.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(changes),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not update the job.");
      setBookings((current) =>
        current.map((b) =>
          b.id === booking.id
            ? {
                ...b,
                ...(changes.status ? { operation_status: changes.status } : {}),
                ...(changes.notes !== undefined
                  ? { supplier_notes: changes.notes }
                  : {}),
              }
            : b,
        ),
      );
      setMessage(`${booking.reference} updated.`);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not update the job.",
      );
    } finally {
      setSaving("");
    }
  }
  return (
    <div>
      {!compact && (
        <div className="supplier-order-tools">
          <input
            aria-label="Search assigned orders"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search job, customer, address, bin or postcode"
          />
          <button
            className="portal-button-secondary"
            onClick={() =>
              exportCsv(
                "supplier-orders.csv",
                [
                  "Job",
                  "Customer",
                  "Delivery",
                  "Pickup",
                  "Address",
                  "Postcode",
                  "Bin",
                  "Stage",
                ],
                visible.map((b) => [
                  b.reference,
                  b.full_name,
                  b.delivery_date,
                  b.pickup_date,
                  b.street_address,
                  b.postcode,
                  b.bin_size,
                  operationStatusLabels[b.operation_status],
                ]),
              )
            }
          >
            <Download size={16} />
            Export CSV
          </button>
          <div className="portal-actions w-full">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
                className="portal-button-secondary"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && !selected && (
        <p role="alert" className="supplier-notice supplier-alert">
          {error}
        </p>
      )}
      {message && !selected && (
        <p role="status" className="supplier-notice">
          {message}
        </p>
      )}
      <div className="portal-table-wrap">
        <table className="portal-table mobile-cards supplier-table">
          <thead>
            <tr>
              {[
                "Job",
                "Schedule",
                "Address",
                "Bin",
                "Stage",
                "Next step",
                "Details",
              ].map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((b) => {
              const advance = nextStatus[b.operation_status];
              return (
                <tr key={b.id}>
                  <td data-label="Job">
                    <strong>{b.reference}</strong>
                    <span className="mt-1 block">{b.full_name}</span>
                  </td>
                  <td data-label="Schedule">
                    <span className="block">Out: {b.delivery_date}</span>
                    <span className="block">
                      Back: {b.pickup_date || "TBC"}
                    </span>
                  </td>
                  <td data-label="Address">
                    {b.street_address}, VIC {b.postcode}
                  </td>
                  <td data-label="Bin">
                    <strong>{b.bin_size.replace("m3", "m³")}</strong>
                    <span className="block capitalize">{b.waste_type}</span>
                  </td>
                  <td data-label="Stage">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${operationStatusTone(b.operation_status)}`}
                    >
                      {operationStatusLabels[b.operation_status]}
                    </span>
                    {isOverdue(b, today) && (
                      <span className="mt-2 block text-xs font-bold text-[#a34335]">
                        Overdue collection
                      </span>
                    )}
                  </td>
                  <td data-label="Next step">
                    {advance ? (
                      <button
                        className="portal-button"
                        disabled={Boolean(saving)}
                        onClick={() => update(b, { status: advance })}
                      >
                        {advance === "collected" && <CheckCircle2 size={15} />}
                        {saving === b.id
                          ? "Saving…"
                          : operationStatusLabels[advance]}
                      </button>
                    ) : (
                      <span>No next step</span>
                    )}
                  </td>
                  <td data-label="Details">
                    <button
                      type="button"
                      className="portal-button-secondary"
                      onClick={() => {
                        setSelectedId(b.id);
                        setError("");
                        setMessage("");
                      }}
                    >
                      <Eye size={15} />
                      View job
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!visible.length && (
          <p className="supplier-empty">No assigned orders match this view.</p>
        )}
      </div>
      {selected && (
        <JobModal
          key={selected.id}
          booking={selected}
          saving={Boolean(saving)}
          error={error}
          message={message}
          onUpdate={(changes) => update(selected, changes)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
function JobModal({
  booking,
  saving,
  error,
  message,
  onUpdate,
  onClose,
}: {
  booking: OperationsBooking;
  saving: boolean;
  error: string;
  message: string;
  onUpdate: (changes: { status?: OperationStatus; notes?: string }) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState(booking.supplier_notes);
  const [stage, setStage] = useState<OperationStatus>(booking.operation_status);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="portal-dialog supplier-job-dialog"
      aria-labelledby="job-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            onClose();
        }
      }}
    >
      <div className="portal-dialog-title">
        <div>
          <p className="portal-eyebrow">{booking.reference}</p>
          <h2 id="job-title">Job details & controls</h2>
        </div>
        <button type="button" aria-label="Close job" onClick={onClose}>
          <X size={22} />
        </button>
      </div>
      {error && (
        <p role="alert" className="supplier-notice supplier-alert">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="supplier-notice">
          {message}
        </p>
      )}
      <div className="supplier-info-grid">
        <Detail
          label="Delivery address"
          value={`${booking.street_address}, VIC ${booking.postcode}`}
        />
        <Detail
          label="Customer"
          value={`${booking.full_name} · ${booking.phone}`}
        />
        <Detail
          label="Delivery / collection"
          value={`${booking.delivery_date} / ${booking.pickup_date || "TBC"}`}
        />
        <Detail
          label="Bin / placement"
          value={`${booking.bin_size.replace("m3", "m³")} · ${booking.waste_type} · ${booking.placement || "TBC"}`}
        />
        <Detail
          label="Site instructions"
          value={
            [booking.access, booking.notes].filter(Boolean).join(" · ") ||
            "No additional instructions"
          }
        />
      </div>
      <div className="portal-actions my-5">
        <a className="portal-button-secondary" href={`tel:${booking.phone}`}>
          <Phone size={16} />
          Call customer
        </a>
        <a
          className="portal-button-secondary"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${booking.street_address}, VIC ${booking.postcode}`)}`}
          target="_blank"
          rel="noreferrer"
        >
          <Navigation size={16} />
          Directions
        </a>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onUpdate({
            ...(stage !== booking.operation_status ? { status: stage } : {}),
            notes: note,
          });
        }}
      >
        <label className="supplier-field">
          Workflow stage
          <select
            value={stage}
            disabled={saving}
            onChange={(e) => setStage(e.target.value as OperationStatus)}
          >
            <option value={booking.operation_status}>
              {operationStatusLabels[booking.operation_status]}
            </option>
            {supplierActionStatuses
              .filter((s) => s !== booking.operation_status)
              .map((s) => (
                <option key={s} value={s}>
                  {operationStatusLabels[s]}
                </option>
              ))}
          </select>
        </label>
        <label className="supplier-field mt-5">
          Supplier notes
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Record delivery, access, collection or issue details"
          />
        </label>
        <div className="portal-footer-actions">
          <button
            type="button"
            className="portal-button-secondary"
            onClick={() => window.print()}
          >
            Print job sheet
          </button>
          <button type="submit" className="portal-button" disabled={saving}>
            <Save size={16} />
            {saving ? "Saving…" : "Save update"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#eef3ea] p-4">
      <p className="text-xs font-bold text-[#405347]">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}
function isOverdue(b: OperationsBooking, today: string) {
  return (
    Boolean(b.pickup_date) &&
    b.pickup_date < today &&
    !["collected", "cancelled"].includes(b.operation_status)
  );
}
