"use client";
import { useState, type FormEvent } from "react";
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
import { PostcodeField } from "@/components/book/postcode-field";
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
    [waste, setWaste] = useState(acceptedWaste[0].id),
    [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [success, setSuccess] = useState(false),
    [editing, setEditing] = useState<BinRate | null>(null),
    [selectedLocation, setSelectedLocation] = useState({
      postcode: "",
      suburb: "",
    });
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
      setSelectedLocation({ postcode: "", suburb: "" });
    });
  }
  const titles = {
    pricing: [
      "CATALOGUE & CAPACITY",
      "Pricing & availability",
      "Set prices by waste type, control booking dates.",
    ],
    coverage: [
      "VICTORIA SERVICE COVERAGE",
      "Suburbs & postcodes",
      "Cover Victoria or select specific Victorian suburbs. Every location is verified.",
    ],
    profile: [
      "BUSINESS SETTINGS",
      "Business profile",
      "Keep contact details, operating hours and payout details up to date.",
    ],
  };
  const t = titles[section];
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
          <div className="portal-toolbar">
            <div className="portal-tabs" style={{ marginBottom: 0 }}>
              {acceptedWaste.map((w) => (
                <button
                  key={w.id}
                  aria-pressed={waste === w.id}
                  onClick={() => setWaste(w.id)}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <button
              className="portal-button-secondary"
              disabled={!ready || busy}
              onClick={() =>
                setEditing(rates.find((r) => r.wasteId === waste) ?? null)
              }
            >
              <Plus size={16} />
              Add / edit bin size
            </button>
          </div>
          <div className="portal-pricing-grid">
            {rates
              .filter((r) => r.wasteId === waste)
              .map((r) => (
                <article key={r.id} className="portal-rate-card">
                  <header>
                    <h2>{r.binId.replace("m3", " m³")}</h2>
                    <span className={`portal-badge ${r.active ? "" : "muted"}`}>
                      {r.active ? "Active" : "Disabled"}
                    </span>
                  </header>
                  <div className="price">{money(r.price * 100)}</div>
                  <p>
                    Base hire price ·{" "}
                    {acceptedWaste.find((w) => w.id === r.wasteId)?.label}
                  </p>
                  <dl>
                    <div>
                      <dt>Turnaround</dt>
                      <dd>
                        {r.turnaround} day{r.turnaround === 1 ? "" : "s"}
                      </dd>
                    </div>
                    <div>
                      <dt>Custom dates</dt>
                      <dd>
                        {r.overrides.length} override
                        {r.overrides.length === 1 ? "" : "s"}
                      </dd>
                    </div>
                    <div>
                      <dt>Extra weight</dt>
                      <dd>{money(r.perTonne * 100)} / tonne</dd>
                    </div>
                  </dl>
                  <button
                    className="portal-button-secondary"
                    disabled={!ready || busy}
                    onClick={() => setEditing(structuredClone(r))}
                  >
                    <Pencil size={14} />
                    Edit pricing
                  </button>
                </article>
              ))}
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
            Prices include the standard hire period. Extended hire uses the
            existing 40% uplift. Weight charges are recorded for reconciliation
            after weighing.
          </p>
        </>
      )}
      {section === "coverage" && (
        <>
          <section className="portal-panel">
            <h2>
              {settings.coverageMode === "victoria"
                ? "Exclude a suburb"
                : "Add a suburb you serve"}
            </h2>
            <p>
              {settings.coverageMode === "victoria"
                ? "All Victorian suburbs are served automatically. Add a suburb here only if you cannot deliver there."
                : "Search for a Victorian suburb and add it to your delivery area."}
            </p>
            <div className="portal-grid">
              <PostcodeField
                value={selectedLocation.postcode}
                displayValue={
                  selectedLocation.suburb
                    ? `${selectedLocation.suburb}, VIC ${selectedLocation.postcode}`
                    : ""
                }
                onChange={(postcode, label) => {
                  const suburb = label.match(/^(.+), VIC \d{4}$/i)?.[1] ?? "";
                  setSelectedLocation({ postcode, suburb });
                }}
              />
              <div style={{ display: "flex", alignItems: "center" }}>
                <button
                  className="portal-button"
                  disabled={!ready || busy || !selectedLocation.suburb}
                  onClick={() =>
                    saveCoverage({
                      ...selectedLocation,
                      active: settings.coverageMode === "selected",
                    })
                  }
                >
                  <Plus size={16} />
                  {settings.coverageMode === "victoria"
                    ? "Exclude suburb"
                    : "Add suburb"}
                </button>
              </div>
            </div>
          </section>
          <div className="portal-toolbar">
            <Field label="Search listed suburbs">
              <input
                placeholder="Suburb or postcode"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </Field>
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
                {coverage
                  .filter((c) =>
                    `${c.suburb} ${c.postcode}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((c) => (
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
            {!coverage.length && (
              <p className="portal-empty">
                {settings.coverageMode === "victoria"
                  ? "No suburb exclusions. You serve all verified Victorian suburbs."
                  : "No suburbs included. Add the Victorian suburbs you serve to enable bookings."}
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
          title="Edit bin pricing & availability"
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
                    .filter((r) => r.wasteId === waste)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {bins.find((b) => b.id === r.binId)?.size}
                      </option>
                    ))}
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
