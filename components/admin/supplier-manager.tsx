"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Plus, Pencil, Save, Download, ArrowUpRight, Star } from "lucide-react";
import { bins } from "@/lib/data/skip-bins";
import { exportCsv } from "@/lib/admin-config";
import type {
  OperationsBooking,
  SupplierRecord,
} from "@/lib/server/operations-service";
import {
  PageHeading,
  Stat,
  Notice,
  Dialog,
  Field,
} from "@/components/admin/portal-ui";
export function SupplierManager({
  initialSuppliers,
  bookings,
  setupRequired,
  setupMessage,
}: {
  initialSuppliers: SupplierRecord[];
  bookings: OperationsBooking[];
  setupRequired: boolean;
  setupMessage: string;
}) {
  const [suppliers, setSuppliers] = useState(initialSuppliers),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("active"),
    [adding, setAdding] = useState(false),
    [editing, setEditing] = useState<SupplierRecord | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [createAccount, setCreateAccount] = useState(false);
  async function send(url: string, body: unknown, method = "PATCH") {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not save supplier.");
      setSuppliers((current) =>
        [
          ...current.filter((s) => s.id !== result.supplier.id),
          result.supplier,
        ].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setAdding(false);
      setEditing(null);
      setSuccess("Supplier changes saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save supplier.");
    } finally {
      setBusy(false);
    }
  }
  function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    if (createAccount && d.get("password") !== d.get("confirmPassword")) {
      setError("The passwords do not match.");
      return;
    }
    send(
      "/api/admin/suppliers",
      {
        name: d.get("name"),
        contactName: d.get("contactName"),
        email: d.get("email"),
        phone: d.get("phone"),
        serviceArea: d.get("serviceArea"),
        abn: d.get("abn"),
        password: createAccount ? d.get("password") : undefined,
      },
      "POST",
    );
  }
  const visible = suppliers.filter(
    (s) =>
      `${s.name} ${s.contact_name} ${s.email} ${s.service_area}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" || s.status === filter),
  );
  const activeJobs = (id: string) =>
    bookings.filter(
      (b) =>
        b.supplier_id === id &&
        !["collected", "cancelled"].includes(b.operation_status),
    );
  return (
    <div>
      <PageHeading
        eyebrow="SUPPLIER NETWORK"
        title="Suppliers"
        description="Manage supplier profiles, service coverage, accounts and bin capacity."
        actions={
          <>
            <button
              className="portal-button-secondary"
              onClick={() =>
                exportCsv(
                  "suppliers.csv",
                  [
                    "Company",
                    "Contact",
                    "Email",
                    "Phone",
                    "Coverage",
                    "Status",
                    "Active jobs",
                  ],
                  visible.map((s) => [
                    s.name,
                    s.contact_name,
                    s.email,
                    s.phone,
                    s.service_area,
                    s.status,
                    activeJobs(s.id).length,
                  ]),
                )
              }
            >
              <Download size={15} />
              Export
            </button>
            <button
              className="portal-button"
              disabled={setupRequired}
              onClick={() => {
                setAdding(true);
                setError("");
              }}
            >
              <Plus size={16} />
              Add supplier
            </button>
          </>
        }
      />
      <Notice message={setupRequired ? setupMessage : error} />
      <Notice message={success} success />
      <div className="portal-stats">
        <Stat label="Total suppliers" value={suppliers.length} />
        <Stat
          label="Active suppliers"
          value={suppliers.filter((s) => s.status === "active").length}
        />
        <Stat
          label="Assigned jobs"
          value={
            bookings.filter(
              (b) =>
                b.supplier_id &&
                !["collected", "cancelled"].includes(b.operation_status),
            ).length
          }
        />
        <Stat
          label="Listed stock"
          value={suppliers
            .filter((s) => s.status === "active")
            .reduce(
              (sum, s) =>
                sum + Object.values(s.bin_inventory).reduce((n, v) => n + v, 0),
              0,
            )}
        />
      </div>
      <section className="portal-panel">
        <div className="portal-toolbar">
          <Field label="Search suppliers">
            <input
              placeholder="Company, contact, email or postcode"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
          <select
            aria-label="Supplier filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="active">Active & approved</option>
            <option value="all">Show all suppliers</option>
            <option value="paused">Paused suppliers</option>
          </select>
        </div>
        <div className="portal-table-wrap">
          <table className="portal-table mobile-cards">
            <thead>
              <tr>
                {[
                  "Business",
                  "Contact",
                  "Coverage",
                  "Workload",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id}>
                  <td data-label="Business">
                    <strong>{s.name}</strong>
                    <small>{s.abn ? `ABN ${s.abn}` : "Supplier profile"}</small>
                    {s.rating !== undefined && s.rating > 0 && (
                      <small>
                        <Star
                          size={12}
                          style={{
                            display: "inline",
                            color: "#d4a633",
                            fill: "#d4a633",
                          }}
                        />{" "}
                        {s.rating.toFixed(1)} / 5
                      </small>
                    )}
                  </td>
                  <td data-label="Contact">
                    <strong>{s.contact_name || "—"}</strong>
                    <small>
                      <a href={`mailto:${s.email}`}>
                        {s.email || s.phone || "No contact set"}
                      </a>
                    </small>
                  </td>
                  <td data-label="Coverage">
                    {s.service_area || "Victoria statewide"}
                  </td>
                  <td data-label="Workload">
                    <strong>{activeJobs(s.id).length} jobs</strong>
                    <small>
                      {Object.values(s.bin_inventory).reduce(
                        (n, v) => n + v,
                        0,
                      )}{" "}
                      bins listed
                    </small>
                  </td>
                  <td data-label="Status">
                    <button
                      disabled={busy}
                      className={`portal-badge ${s.status === "paused" ? "warning" : ""}`}
                      aria-label={`${s.status === "active" ? "Pause" : "Activate"} ${s.name}`}
                      onClick={() =>
                        send(`/api/admin/suppliers/${s.id}`, {
                          status: s.status === "active" ? "paused" : "active",
                        })
                      }
                    >
                      {s.status}
                    </button>
                  </td>
                  <td data-label="Actions">
                    <div className="portal-actions">
                      <button
                        className="portal-button-secondary"
                        onClick={() => {
                          setEditing(structuredClone(s));
                          setError("");
                        }}
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                      <Link
                        href={`/admin/suppliers/${s.id}`}
                        className="portal-button-secondary"
                      >
                        <ArrowUpRight size={14} />
                        Workspace
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <p className="portal-empty">
              No suppliers match your search. Add a supplier or change the
              filter.
            </p>
          )}
        </div>
      </section>
      {adding && (
        <Dialog
          title="Create supplier profile"
          onClose={() => !busy && setAdding(false)}
        >
          <form onSubmit={add}>
            <div className="portal-grid">
              {[
                ["name", "Business name", "text"],
                ["contactName", "Contact name", "text"],
                ["email", "Email address", "email"],
                ["phone", "Phone", "tel"],
                ["abn", "ABN", "text"],
                [
                  "serviceArea",
                  "Victorian postcodes (comma separated)",
                  "text",
                ],
              ].map(([name, label, type]) => (
                <Field label={label} key={name}>
                  <input
                    name={name}
                    type={type}
                    maxLength={name === "serviceArea" ? 250 : 120}
                    required={
                      name === "name" || (createAccount && name === "email")
                    }
                  />
                </Field>
              ))}
            </div>
            <p className="portal-help">
              Leave coverage blank for statewide Victoria. Enter verified
              Victorian postcodes to limit supplier coverage.
            </p>
            <label className="portal-check">
              <input
                type="checkbox"
                checked={createAccount}
                onChange={(e) => setCreateAccount(e.target.checked)}
              />
              Create a supplier login account
            </label>
            {createAccount && (
              <div className="portal-grid" style={{ marginTop: 16 }}>
                <Field label="Password (at least 12 characters)">
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                  />
                </Field>
                <Field label="Confirm password">
                  <input
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                  />
                </Field>
              </div>
            )}
            <Notice message={error} />
            <div className="portal-footer-actions">
              <button
                type="button"
                className="portal-button-secondary"
                disabled={busy}
                onClick={() => setAdding(false)}
              >
                Cancel
              </button>
              <button
                className="portal-button"
                disabled={busy || setupRequired}
              >
                <Plus size={16} />
                {busy ? "Creating…" : "Create supplier"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {editing && (
        <Dialog
          title={`Edit ${editing.name}`}
          onClose={() => !busy && setEditing(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(`/api/admin/suppliers/${editing.id}`, {
                name: editing.name,
                contactName: editing.contact_name,
                email: editing.email,
                phone: editing.phone,
                abn: editing.abn ?? "",
                serviceArea: editing.service_area,
                binInventory: editing.bin_inventory,
                rating: editing.rating ?? 0,
              });
            }}
          >
            <div className="portal-grid">
              {(
                [
                  ["name", "Business name"],
                  ["contact_name", "Contact name"],
                  ["email", "Email"],
                  ["phone", "Phone"],
                  ["abn", "ABN"],
                  ["service_area", "Victorian postcodes (comma separated)"],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <input
                    required={key === "name"}
                    type={key === "email" ? "email" : "text"}
                    value={editing[key] ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, [key]: e.target.value })
                    }
                  />
                </Field>
              ))}
              <Field label="Supplier rating (0–5)">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={editing.rating ?? 0}
                  onChange={(e) =>
                    setEditing({ ...editing, rating: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
            <h3 className="portal-section-label">Bin capacity</h3>
            <div className="portal-grid">
              {bins.map((b) => (
                <Field key={b.id} label={`${b.size} units`}>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={editing.bin_inventory[b.id] ?? 0}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        bin_inventory: {
                          ...editing.bin_inventory,
                          [b.id]: Number(e.target.value),
                        },
                      })
                    }
                  />
                </Field>
              ))}
            </div>
            <Notice message={error} />
            <div className="portal-footer-actions">
              <button
                type="button"
                disabled={busy}
                className="portal-button-secondary"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className="portal-button" disabled={busy}>
                <Save size={16} />
                {busy ? "Saving…" : "Save supplier"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
