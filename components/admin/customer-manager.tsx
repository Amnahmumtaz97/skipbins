"use client";
import { melbourneDate } from "@/lib/admin-config";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Search, SlidersHorizontal, Eye } from "lucide-react";
import type { CustomerRecord } from "@/lib/server/portal-service";
import type { OperationsBooking } from "@/lib/server/operations-service";
import { exportCsv } from "@/lib/admin-config";
import {
  PageHeading,
  Stat,
  Field,
  Notice,
  Dialog,
  portalAction,
  money,
} from "@/components/admin/portal-ui";
export function CustomerManager({
  initialCustomers,
  bookings,
  error,
  today,
}: {
  initialCustomers: CustomerRecord[];
  bookings: OperationsBooking[];
  error: string;
  today: string;
}) {
  const [customers, setCustomers] = useState(initialCustomers),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [advanced, setAdvanced] = useState(false),
    [postcode, setPostcode] = useState(""),
    [minimum, setMinimum] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [selected, setSelected] = useState<CustomerRecord | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const enriched = useMemo(
    () =>
      customers.map((c) => {
        const jobs = bookings.filter(
          (b) => b.email.toLowerCase() === c.email.toLowerCase(),
        );
        return {
          ...c,
          jobs,
          paid: jobs
            .filter(
              (b) =>
                b.payment_status === "paid" &&
                b.operation_status !== "cancelled",
            )
            .reduce((s, b) => s + b.amount_cents, 0),
        };
      }),
    [customers, bookings],
  );
  const visible = enriched.filter(
    (c) =>
      `${c.full_name} ${c.email} ${c.phone} ${c.customer_code}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (status === "all" || c.status === status) &&
      (!postcode || c.jobs.some((b) => b.postcode.includes(postcode))) &&
      (!minimum || c.jobs.length >= Number(minimum)) &&
      (!from || melbourneDate(c.created_at) >= from) &&
      (!to || melbourneDate(c.created_at) <= to),
  );
  const selectedCustomer = enriched.find((c) => c.id === selected?.id);
  async function toggle(c: CustomerRecord) {
    setBusy(true);
    setMessage("");
    try {
      const next = c.status === "active" ? "inactive" : "active";
      await portalAction("customer", { id: c.id, status: next });
      setCustomers((current) =>
        current.map((v) => (v.id === c.id ? { ...v, status: next } : v)),
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not update customer.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <PageHeading
        eyebrow="CUSTOMER RELATIONSHIPS"
        title="Customers"
        description="Find customers, review booking history and manage their account status."
        actions={
          <button
            className="portal-button-secondary"
            onClick={() =>
              exportCsv(
                "customers.csv",
                [
                  "Customer code",
                  "Name",
                  "Email",
                  "Phone",
                  "Status",
                  "Bookings",
                  "Paid value AUD",
                ],
                visible.map((c) => [
                  c.customer_code,
                  c.full_name,
                  c.email,
                  c.phone,
                  c.status,
                  c.jobs.length,
                  (c.paid / 100).toFixed(2),
                ]),
              )
            }
          >
            <Download size={16} />
            Export CSV
          </button>
        }
      />
      <Notice message={error || message} />
      <div className="portal-stats">
        <Stat label="Total customers" value={customers.length} />
        <Stat
          label="Active customers"
          value={customers.filter((c) => c.status === "active").length}
        />
        <Stat
          label="New this month"
          value={
            customers.filter((c) =>
              melbourneDate(c.created_at).startsWith(today.slice(0, 7)),
            ).length
          }
        />
        <Stat label="Recorded bookings" value={bookings.length} />
      </div>
      <section className="portal-panel">
        <div className="portal-toolbar">
          <Field label="Search customers">
            <input
              placeholder="Name, customer code, email or phone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
          <button
            className="portal-button-secondary"
            aria-expanded={advanced}
            onClick={() => setAdvanced(!advanced)}
          >
            <SlidersHorizontal size={16} />
            Advanced search
          </button>
        </div>
        <div className="portal-tabs">
          {["all", "active", "inactive"].map((s) => (
            <button
              key={s}
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
            >
              {s === "all"
                ? "All customers"
                : `${s[0].toUpperCase() + s.slice(1)} customers`}
            </button>
          ))}
        </div>
        {advanced && (
          <div className="portal-grid" style={{ marginBottom: 20 }}>
            <Field label="Booking postcode">
              <input
                value={postcode}
                maxLength={4}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="e.g. 3000"
              />
            </Field>
            <Field label="Minimum bookings">
              <input
                type="number"
                min="0"
                value={minimum}
                onChange={(e) => setMinimum(e.target.value)}
              />
            </Field>
            <Field label="Joined from">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </Field>
            <Field label="Joined until">
              <input
                type="date"
                min={from}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </Field>
            <button
              className="portal-button-secondary"
              onClick={() => {
                setQuery("");
                setPostcode("");
                setMinimum("");
                setFrom("");
                setTo("");
                setStatus("all");
              }}
            >
              Reset filters
            </button>
          </div>
        )}
        <p className="portal-subtle" style={{ marginBottom: 12 }}>
          {visible.length} customer{visible.length === 1 ? "" : "s"}
        </p>
        <div className="portal-table-wrap">
          <table className="portal-table mobile-cards">
            <thead>
              <tr>
                {[
                  "Customer",
                  "Contact",
                  "Bookings",
                  "Paid value",
                  "Status",
                  "Action",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id}>
                  <td data-label="Customer">
                    <strong>{c.full_name}</strong>
                    <small>{c.customer_code}</small>
                  </td>
                  <td data-label="Contact">
                    <a href={`mailto:${c.email}`}>{c.email}</a>
                    <small>
                      <a href={`tel:${c.phone}`}>{c.phone}</a>
                    </small>
                  </td>
                  <td data-label="Bookings">{c.jobs.length}</td>
                  <td data-label="Paid value">{money(c.paid)}</td>
                  <td data-label="Status">
                    <button
                      className={`portal-badge ${c.status === "inactive" ? "muted" : ""}`}
                      disabled={busy}
                      aria-label={`Set ${c.full_name} ${c.status === "active" ? "inactive" : "active"}`}
                      onClick={() => toggle(c)}
                    >
                      {c.status}
                    </button>
                  </td>
                  <td data-label="Action">
                    <button
                      className="portal-button-secondary"
                      onClick={() => setSelected(c)}
                    >
                      <Eye size={14} />
                      View history
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <div className="portal-empty">
              <Search size={24} style={{ margin: "0 auto 12px" }} />
              No customers match these filters.
            </div>
          )}
        </div>
      </section>
      {selectedCustomer && (
        <Dialog
          title={selectedCustomer.full_name}
          onClose={() => setSelected(null)}
        >
          <div className="portal-grid">
            <div className="portal-detail">
              <span>Email & phone</span>
              <p>
                {selectedCustomer.email}
                <br />
                {selectedCustomer.phone}
              </p>
            </div>
            <div className="portal-detail">
              <span>Total paid value</span>
              <p>
                {money(selectedCustomer.paid)} · {selectedCustomer.jobs.length}{" "}
                bookings
              </p>
            </div>
          </div>
          <h3 className="portal-section-label">Booking history</h3>
          {selectedCustomer.jobs.map((b) => (
            <div className="portal-rule" key={b.id}>
              <span>
                <strong>{b.reference}</strong>
                <br />
                {b.delivery_date} · {b.bin_size.replace("m3", "m³")} ·{" "}
                {b.postcode}
              </span>
              <span className="portal-badge">
                {b.operation_status.replaceAll("_", " ")}
              </span>
              <Link
                href={`/admin/orders?order=${encodeURIComponent(b.id)}`}
                className="portal-button-secondary"
              >
                Open booking
              </Link>
            </div>
          ))}
          {!selectedCustomer.jobs.length && (
            <p className="portal-empty">This customer has no bookings yet.</p>
          )}
        </Dialog>
      )}
    </div>
  );
}
