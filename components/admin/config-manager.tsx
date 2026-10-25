"use client";
import { useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import {
  Plus,
  Save,
  Pencil,
  CalendarDays,
  Trash2,
  Download,
  MapPin,
} from "lucide-react";
import { bins, acceptedWaste } from "@/lib/data/skip-bins";
import {
  exportCsv,
  type PortalSettings,
  type BinRate,
  type Coverage,
  type DateRule,
} from "@/lib/admin-config";
import {
  PageHeading,
  Field,
  Notice,
  Stat,
  Dialog,
  portalAction,
  money,
} from "@/components/admin/portal-ui";
import { selectionChanges } from "@/lib/coverage-selection";
import type { VicLocality } from "@/lib/data/vic-localities";

const CoverageMap = dynamic(
  () =>
    import("@/components/admin/coverage-map").then((mod) => mod.CoverageMap),
  {
    ssr: false,
    loading: () => <div className="coverage-map coverage-map-loading">Loading Victoria map…</div>,
  },
);
type Props = {
  section: "pricing" | "coverage" | "profile";
  initialSettings: PortalSettings;
  initialRates: BinRate[];
  initialCoverage: Coverage[];
  ready: boolean;
  setupError: string;
};
export function ConfigManager({
  section,
  initialSettings,
  initialRates,
  initialCoverage,
  ready,
  setupError,
}: Props) {
  const [settings, setSettings] = useState(initialSettings),
    [rates, setRates] = useState(initialRates),
    [coverage, setCoverage] = useState(initialCoverage),
    [query, setQuery] = useState(""),
    [statusFilter, setStatusFilter] = useState<"all" | "included" | "excluded">("all");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [success, setSuccess] = useState(false),
    [editing, setEditing] = useState<BinRate | null>(null);
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await task();
      setSuccess(true);
      setMessage("Changes saved successfully.");
    } catch (e) {
      setSuccess(false);
      setMessage(e instanceof Error ? e.message : "Could not save changes.");
    } finally {
      setBusy(false);
    }
  }
  async function saveSettings(next: PortalSettings = settings) {
    await run(async () => {
      const result = await portalAction("settings", next);
      setSettings(result.settings);
    });
  }
  async function saveRate(rate: BinRate) {
    await run(async () => {
      const result = await portalAction("rate", rate);
      setRates((current) =>
        current.map((r) => (r.id === rate.id ? result.rate : r)),
      );
      setEditing(null);
    });
  }
  async function saveCoverage(row: {
    suburb: string;
    postcode: string;
    active: boolean;
  }) {
    await run(async () => {
      const result = await portalAction("coverage", row);
      setCoverage((current) =>
        [
          ...current.filter((c) => c.id !== result.coverage.id),
          result.coverage,
        ].sort((a, b) => a.suburb.localeCompare(b.suburb)),
      );
    });
  }
  async function saveCoverageMany(
    rows: { suburb: string; postcode: string; active: boolean }[],
    persistSelectedMode = false,
  ) {
    await run(async () => {
      const result = await portalAction("coverage-bulk", rows);
      const saved = new Map(
        (result.coverage as Coverage[]).map((row) => [row.id, row]),
      );
      setCoverage((current) =>
        [...current.filter((row) => !saved.has(row.id)), ...saved.values()].sort(
          (a, b) => a.suburb.localeCompare(b.suburb),
        ),
      );
      if (persistSelectedMode) {
        const savedSettings = await portalAction("settings", {
          ...settings,
          coverageMode: "selected",
        });
        setSettings(savedSettings.settings);
      }
    });
  }
  async function applyMapSelection(rows: VicLocality[], active: boolean) {
    const changes = selectionChanges(rows, coverage, "selected", active);
    if (!changes.length) return;
    await saveCoverageMany(
      changes.map((row) => ({
        suburb: row.suburb,
        postcode: row.postcode,
        active,
      })),
      active,
    );
  }
  const titles = {
    pricing: [
      "CATALOGUE & CAPACITY",
      "Pricing & availability",
      "Each row is a bin size. Every waste type sits on that row so price and availability stay side by side.",
    ],
    coverage: [
      "VICTORIA SERVICE COVERAGE",
      "Suburbs & postcodes",
      "These suburbs are the default area for a supplier. A customer can book a postcode only when a supplier covers it.",
    ],
    profile: [
      "BUSINESS SETTINGS",
      "Business profile",
      "Keep contact details, operating hours and payout details up to date.",
    ],
  };
  const t = titles[section];
  const listedCoverage = coverage.filter((row) => {
    const matchesQuery = `${row.suburb} ${row.postcode}`
      .toLowerCase()
      .includes(query.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "included" ? row.active : !row.active);
    return matchesQuery && matchesStatus;
  });
  return (
    <div>
      <PageHeading
        eyebrow={t[0]}
        title={t[1]}
        description={t[2]}
        actions={
          section === "profile" ? (
            <button
              className="portal-button"
              disabled={!ready || busy}
              onClick={() => saveSettings()}
            >
              <Save size={16} />
              {busy ? "Saving…" : "Save changes"}
            </button>
          ) : undefined
        }
      />
      <Notice message={setupError} />
      <Notice message={message} success={success} />
      {section === "pricing" && (
        <>
          <div className="portal-stats">
            <Stat
              label="Active combinations"
              value={rates.filter((r) => r.active).length}
            />
            <Stat
              label="Average base price"
              value={money(
                Math.round(
                  (rates
                    .filter((r) => r.active)
                    .reduce((s, r) => s + r.price, 0) /
                    Math.max(1, rates.filter((r) => r.active).length)) *
                    100,
                ),
              )}
            />
            <Stat
              label="Date overrides"
              value={rates.reduce((s, r) => s + r.overrides.length, 0)}
            />
            <Stat
              label="Blocked periods"
              value={settings.blockedDates.length}
            />
          </div>
          <div className="portal-table-wrap">
            <table className="portal-table portal-price-matrix">
              <thead>
                <tr>
                  <th scope="col">Bin size</th>
                  {acceptedWaste.map((wasteType) => (
                    <th key={wasteType.id} scope="col">
                      {wasteType.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bins.map((bin) => (
                  <tr key={bin.id}>
                    <th scope="row">
                      <strong>{bin.size}</strong>
                      <small>{bin.door}</small>
                    </th>
                    {acceptedWaste.map((wasteType) => {
                      const rate = rates.find(
                        (item) =>
                          item.binId === bin.id && item.wasteId === wasteType.id,
                      );
                      if (!rate) {
                        return (
                          <td key={wasteType.id} data-label={wasteType.label}>
                            <span className="portal-price-empty">Not offered</span>
                          </td>
                        );
                      }
                      return (
                        <td key={wasteType.id} data-label={wasteType.label}>
                          <div
                            className={`portal-price-cell${rate.active ? "" : " is-disabled"}`}
                          >
                            <div className="portal-price-cell-top">
                              <span className="price">{money(rate.price * 100)}</span>
                              <span
                                className={`portal-badge ${rate.active ? "" : "muted"}`}
                              >
                                {rate.active ? "Active" : "Disabled"}
                              </span>
                            </div>
                            <p className="portal-price-meta">
                              {rate.turnaround} day
                              {rate.turnaround === 1 ? "" : "s"} turnaround ·{" "}
                              {money(rate.perTonne * 100)} / tonne
                              {rate.overrides.length
                                ? ` · ${rate.overrides.length} date override${rate.overrides.length === 1 ? "" : "s"}`
                                : ""}
                            </p>
                            <button
                              type="button"
                              className="portal-button-secondary portal-price-edit"
                              disabled={!ready || busy}
                              onClick={() => setEditing(structuredClone(rate))}
                            >
                              <Pencil size={14} />
                              Edit
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <section className="portal-panel" style={{ marginTop: 24 }}>
            <h2>Blocked delivery days</h2>
            <p>
              These periods block new deliveries across every bin and waste
              type.
            </p>
            <RuleList
              rules={settings.blockedDates}
              blockedOnly
              disabled={!ready || busy}
              onChange={(rules) =>
                setSettings((s) => ({ ...s, blockedDates: rules }))
              }
            />
            <div className="portal-footer-actions">
              <button
                className="portal-button"
                disabled={!ready || busy}
                onClick={() => saveSettings()}
              >
                <Save size={16} />
                Save blocked days
              </button>
            </div>
          </section>
          <p className="portal-help">
            Prices include up to 10 days hire from the delivery date. Up to 7
            extra days adds $50, and 8–14 extra days adds $75. Weight charges
            are recorded for reconciliation after weighing.
          </p>
        </>
      )}
      {section === "coverage" && (
        <>
          <section className="portal-panel">
            <h2>Delivery area</h2>
            <p>
              Suppliers start with these suburbs. Customers can book the combined postcodes of every supplier.
            </p>
          </section>
          <CoverageMap
            coverage={coverage}
            mode="selected"
            disabled={!ready || busy}
            onApply={applyMapSelection}
          />
          <div className="portal-toolbar">
            <Field label="Search listed suburbs">
              <input
                placeholder="Suburb or postcode"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </Field>
            <label className="portal-field coverage-status-filter">
              <span>Show</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as "all" | "included" | "excluded",
                  )
                }
              >
                <option value="all">All</option>
                <option value="included">Included</option>
                <option value="excluded">Excluded</option>
              </select>
            </label>
            <button
              className="portal-button-secondary"
              onClick={() =>
                exportCsv(
                  "victorian-coverage.csv",
                  ["Suburb", "Postcode", "State", "Active"],
                  coverage.map((c) => [
                    c.suburb,
                    c.postcode,
                    c.state,
                    String(c.active),
                  ]),
                )
              }
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
          <div className="portal-table-wrap">
            <table className="portal-table mobile-cards">
              <thead>
                <tr>
                  <th>Suburb</th>
                  <th>Postcode</th>
                  <th>State</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {listedCoverage.map((c) => (
                    <tr key={c.id}>
                      <td data-label="Suburb">
                        <strong>{c.suburb}</strong>
                      </td>
                      <td data-label="Postcode">{c.postcode}</td>
                      <td data-label="State">
                        <span className="portal-badge">VIC</span>
                      </td>
                      <td data-label="Status">
                        {c.active ? "Included" : "Excluded"}
                      </td>
                      <td data-label="Action">
                        <button
                          disabled={!ready || busy}
                          className="portal-button-secondary"
                          onClick={() =>
                            saveCoverage({ ...c, active: !c.active })
                          }
                        >
                          {c.active ? "Exclude suburb" : "Include suburb"}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!listedCoverage.length && (
              <p className="portal-empty">
                {coverage.length
                  ? "No suburbs match this filter."
                  : "No default suburbs yet. Add the Victorian suburbs a new supplier starts with."}
              </p>
            )}
          </div>
        </>
      )}
      {section === "profile" && (
        <ProfileForm
          settings={settings}
          onChange={setSettings}
          busy={busy}
          ready={ready}
          onSave={() => saveSettings()}
        />
      )}
      {editing && (
        <Dialog
          title={`Edit ${bins.find((bin) => bin.id === editing.binId)?.size ?? "bin"} · ${acceptedWaste.find((item) => item.id === editing.wasteId)?.label ?? "waste"}`}
          onClose={() => !busy && setEditing(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveRate(editing);
            }}
          >
            <div className="portal-grid">
              <Field label="Bin size">
                <select
                  value={editing.id}
                  onChange={(e) => {
                    const next = rates.find((r) => r.id === e.target.value);
                    if (next) setEditing(structuredClone(next));
                  }}
                >
                  {rates
                    .filter((r) => r.wasteId === editing.wasteId)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {bins.find((b) => b.id === r.binId)?.size}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Waste type">
                <select
                  value={editing.wasteId}
                  onChange={(e) => {
                    const next = rates.find(
                      (r) =>
                        r.binId === editing.binId && r.wasteId === e.target.value,
                    );
                    if (next) setEditing(structuredClone(next));
                  }}
                >
                  {acceptedWaste.map((wasteType) => {
                    const offered = rates.some(
                      (r) =>
                        r.binId === editing.binId && r.wasteId === wasteType.id,
                    );
                    return (
                      <option
                        key={wasteType.id}
                        value={wasteType.id}
                        disabled={!offered}
                      >
                        {wasteType.label}
                        {offered ? "" : " — not offered"}
                      </option>
                    );
                  })}
                </select>
              </Field>
              <Field label="Base price (AUD)">
                <input
                  type="number"
                  min="0.01"
                  max="100000"
                  step="0.01"
                  required
                  value={editing.price}
                  onChange={(e) =>
                    setEditing({ ...editing, price: Number(e.target.value) })
                  }
                />
              </Field>

              <Field label="Days after pickup before reuse">
                <input
                  type="number"
                  min="0"
                  max="30"
                  required
                  value={editing.turnaround}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      turnaround: Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Included weight (tonnes)">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={editing.includedTonnes}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      includedTonnes: Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Additional charge per tonne (AUD)">
                <input
                  type="number"
                  min="0"
                  max="100000"
                  step="0.01"
                  value={editing.perTonne}
                  onChange={(e) =>
                    setEditing({ ...editing, perTonne: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
            <label className="portal-check" style={{ marginTop: 20 }}>
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(e) =>
                  setEditing({ ...editing, active: e.target.checked })
                }
              />
              Available for new bookings
            </label>
            <h3 className="portal-section-label">Date overrides</h3>
            <RuleList
              rules={editing.overrides}
              disabled={busy}
              onChange={(rules) => setEditing({ ...editing, overrides: rules })}
            />
            <Notice message={message && !success ? message : ""} />
            <div className="portal-footer-actions">
              <button
                type="button"
                disabled={busy}
                className="portal-button-danger"
                onClick={() => saveRate({ ...editing, active: false })}
              >
                Disable bin
              </button>
              <button
                type="button"
                disabled={busy}
                className="portal-button-secondary"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button disabled={busy} className="portal-button">
                <Save size={16} />
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
function RuleList({
  rules,
  onChange,
  blockedOnly = false,
  disabled = false,
}: {
  rules: DateRule[];
  onChange: (r: DateRule[]) => void;
  blockedOnly?: boolean;
  disabled?: boolean;
}) {
  const [adding, setAdding] = useState(false),
    [single, setSingle] = useState(false),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [blocked, setBlocked] = useState(true),
    [price, setPrice] = useState(""),
    [error, setError] = useState("");
  function add() {
    const until = single ? start : end;
    if (!start || !until || start > until) {
      setError("Select a valid start and end date.");
      return;
    }
    if (rules.some((r) => r.start <= until && r.end >= start)) {
      setError("This period overlaps an existing rule.");
      return;
    }
    if (!blockedOnly && !blocked && (!price || Number(price) <= 0)) {
      setError("Enter a positive custom price.");
      return;
    }
    onChange([
      ...rules,
      {
        id: crypto.randomUUID(),
        start,
        end: until,
        blocked: blockedOnly || blocked,
        price: blockedOnly || blocked ? null : Number(price),
      },
    ]);
    setAdding(false);
    setError("");
  }
  return (
    <>
      <div className="portal-actions">
        <button
          disabled={disabled}
          type="button"
          className="portal-button-secondary"
          onClick={() => {
            setSingle(true);
            setAdding(true);
          }}
        >
          <CalendarDays size={15} />
          Single date
        </button>
        <button
          disabled={disabled}
          type="button"
          className="portal-button-secondary"
          onClick={() => {
            setSingle(false);
            setAdding(true);
          }}
        >
          <Plus size={15} />
          Date range
        </button>
      </div>
      {adding && (
        <div
          className="portal-panel"
          style={{ marginTop: 16, background: "var(--color-cream)" }}
        >
          <div className="portal-grid">
            <Field label={single ? "Date" : "Start date"}>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </Field>
            {!single && (
              <Field label="End date">
                <input
                  type="date"
                  min={start}
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </Field>
            )}
            {!blockedOnly && (
              <>
                <Field label="Override type">
                  <select
                    value={blocked ? "blocked" : "price"}
                    onChange={(e) => setBlocked(e.target.value === "blocked")}
                  >
                    <option value="blocked">Block availability</option>
                    <option value="price">Custom price</option>
                  </select>
                </Field>
                {!blocked && (
                  <Field label="Custom price (AUD)">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </Field>
                )}
              </>
            )}
          </div>
          <Notice message={error} />
          <div className="portal-footer-actions">
            <button
              type="button"
              className="portal-button-secondary"
              onClick={() => setAdding(false)}
            >
              Cancel
            </button>
            <button type="button" className="portal-button" onClick={add}>
              Add rule
            </button>
          </div>
        </div>
      )}
      {rules.map((r) => (
        <div className="portal-rule" key={r.id}>
          <CalendarDays size={16} />
          <span>
            {r.start}
            {r.end !== r.start ? ` → ${r.end}` : ""}
          </span>
          <span className={`portal-badge ${r.blocked ? "warning" : ""}`}>
            {r.blocked ? "Blocked" : money((r.price ?? 0) * 100)}
          </span>
          <button
            type="button"
            disabled={disabled}
            className="portal-icon-button"
            aria-label={`Remove override ${r.start}`}
            onClick={() => onChange(rules.filter((v) => v.id !== r.id))}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      {!rules.length && (
        <p className="portal-help">
          No date overrides. Standard availability and prices apply.
        </p>
      )}
    </>
  );
}
function ProfileForm({
  settings,
  onChange,
  busy,
  ready,
  onSave,
}: {
  settings: PortalSettings;
  onChange: (s: PortalSettings) => void;
  busy: boolean;
  ready: boolean;
  onSave: () => void;
}) {
  const p = settings.profile;
  const [showBank, setShowBank] = useState(false);
  const groups = [
    {
      title: "Business & contact information",
      fields: [
        ["businessName", "Business name"],
        ["abn", "ABN"],
        ["contactName", "Contact name"],
        ["email", "Email address"],
        ["phone", "Phone"],
        ["mobile", "Mobile"],
      ],
    },
    {
      title: "Business address",
      fields: [
        ["streetAddress", "Street address"],
        ["suburb", "Suburb"],
        ["postcode", "Postcode"],
      ],
    },
    {
      title: "Bank details",
      fields: [
        ["bankName", "Bank name"],
        ["accountName", "Account name"],
        ["bsb", "BSB"],
        ["accountNumber", "Account number"],
      ],
    },
  ];
  function submit(e: FormEvent) {
    e.preventDefault();
    onSave();
  }
  return (
    <form onSubmit={submit}>
      {groups.map((group) => (
        <section className="portal-panel" key={group.title}>
          <h2>{group.title}</h2>
          {group.title === "Business address" && (
            <p>
              <MapPin size={14} style={{ display: "inline" }} /> Victoria ·
              Australia/Melbourne timezone
            </p>
          )}
          {group.title === "Bank details" && (
            <p>
              Only administrators can access these details.{" "}
              <button type="button" onClick={() => setShowBank(!showBank)}>
                {showBank ? "Hide" : "Show"} account number
              </button>
            </p>
          )}
          <div className="portal-grid" style={{ marginTop: 18 }}>
            {group.fields.map(([key, label]) => (
              <Field key={key} label={label}>
                <input
                  autoComplete="off"
                  maxLength={240}
                  required={key === "businessName"}
                  type={
                    key === "email"
                      ? "email"
                      : key === "accountNumber" && !showBank
                        ? "password"
                        : "text"
                  }
                  value={p[key as keyof typeof p] as string}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      profile: { ...p, [key]: e.target.value },
                    })
                  }
                />
              </Field>
            ))}
          </div>
        </section>
      ))}
      <section className="portal-panel">
        <h2>Operating hours</h2>
        <p>
          All service times use Melbourne time. Open at least one day per week.
        </p>
        {p.hours.map((h, i) => (
          <div className="portal-hours" key={h.day}>
            <label className="portal-check">
              <input
                type="checkbox"
                checked={h.open}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    profile: {
                      ...p,
                      hours: p.hours.map((v, j) =>
                        i === j ? { ...v, open: e.target.checked } : v,
                      ),
                    },
                  })
                }
              />
              {h.day}
            </label>
            <input
              type="time"
              aria-label={`${h.day} opens`}
              disabled={!h.open}
              value={h.from}
              onChange={(e) =>
                onChange({
                  ...settings,
                  profile: {
                    ...p,
                    hours: p.hours.map((v, j) =>
                      i === j ? { ...v, from: e.target.value } : v,
                    ),
                  },
                })
              }
            />
            <input
              type="time"
              aria-label={`${h.day} closes`}
              disabled={!h.open}
              value={h.to}
              onChange={(e) =>
                onChange({
                  ...settings,
                  profile: {
                    ...p,
                    hours: p.hours.map((v, j) =>
                      i === j ? { ...v, to: e.target.value } : v,
                    ),
                  },
                })
              }
            />
          </div>
        ))}
        <label className="portal-check" style={{ marginTop: 20 }}>
          <input
            type="checkbox"
            checked={p.publicHolidays}
            onChange={(e) =>
              onChange({
                ...settings,
                profile: { ...p, publicHolidays: e.target.checked },
              })
            }
          />
          Open on Victorian public holidays
        </label>
        <p className="portal-help">
          Use blocked delivery days in Pricing to block specific holiday dates.
        </p>
      </section>
      <div className="portal-footer-actions">
        <button disabled={busy || !ready} className="portal-button">
          <Save size={16} />
          {busy ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
