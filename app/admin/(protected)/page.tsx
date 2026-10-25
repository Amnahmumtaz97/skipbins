import { money } from "@/lib/admin-config";
import Link from "next/link";
import {
  ArrowUpRight,
  Truck,
  RotateCcw,
  ClipboardList,
} from "lucide-react";
import { todayIsoDate } from "@/lib/booking-utils";
import { operationStatusLabels } from "@/lib/data/operations";
import { buildAdminKpis, monthIncomeBySupplier } from "@/lib/operations-kpis";
import { getOperationsSnapshot } from "@/lib/server/operations-service";
import { getPortalConfig } from "@/lib/server/portal-service";
import { PageHeading, Stat, Notice } from "@/components/admin/portal-ui";
export default async function AdminPage() {
  const [snapshot, config] = await Promise.all([
    getOperationsSnapshot(),
    getPortalConfig(),
  ]);
  const { bookings, suppliers } = snapshot;
  const today = todayIsoDate(),
    kpis = buildAdminKpis(bookings, suppliers, today);
  const month = monthIncomeBySupplier(
    bookings,
    suppliers,
    today,
    config.settings.commissionPercent,
  );
  const stages = [
    "unassigned",
    "assigned",
    "accepted",
    "scheduled",
    "delivered",
    "collection_due",
    "collected",
    "issue",
  ] as const;
  const priority = bookings
    .filter((b) =>
      ["issue", "unassigned", "collection_due"].includes(b.operation_status) &&
      !b.deleted,
    )
    .slice(0, 6);
  return (
    <div>
      <PageHeading
        eyebrow="YOUR OPERATIONS AT A GLANCE"
        title="A clearer view of every job."
        description={`Live booking activity, supplier capacity and revenue · ${today} · Melbourne time`}
        actions={
          <Link className="portal-button" href="/admin/orders">
            <ClipboardList size={16} />
            Open dispatch board
          </Link>
        }
      />
      <Notice
        message={
          snapshot.error ||
          config.error ||
          (!snapshot.serverConfigured
            ? "The operations database is not configured. Add the server database key to enable admin management."
            : !snapshot.supplierSchemaReady
              ? "Supplier data is unavailable. Verify the operations database migration."
              : "")
        }
      />
      <div className="portal-stats">
        <Stat
          label="Deliveries today"
          value={kpis.deliveriesToday}
          detail={`${kpis.upcomingSevenDays} movements in the next 7 days`}
        />
        <Stat
          label="Collections today"
          value={kpis.collectionsToday}
          detail={`${kpis.onHire} bins currently on hire`}
        />
        <Stat
          label="New bookings today"
          value={kpis.newBookingsToday}
          detail="Created today"
        />
        <Stat
          label="Total Income this month"
          value={money(month.incomeCents)}
          detail={`${money(month.commissionCents)} commission`}
        />
      </div>
      <div className="portal-dashboard-columns">
        <section className="portal-panel">
          <div className="portal-toolbar">
            <h2 style={{ flex: 1 }}>Revenue this month</h2>
            <Link href="/admin/payouts" className="portal-subtle">
              View report ↗
            </Link>
          </div>
          <p className="portal-chart-total">{money(month.incomeCents)}</p>
          <p>
            Total income from paid bookings created this month. Commission is{" "}
            {config.settings.commissionPercent}% for each supplier.
          </p>
          <div className="portal-revenue" aria-label="Monthly income and commission by supplier">
            <div className="portal-revenue-head">
              <span>Supplier</span>
              <span>Income</span>
              <span>Commission</span>
            </div>
            {month.rows.map((row) => (
              <div className="portal-revenue-row" key={row.id}>
                <span>{row.name}</span>
                <span>{money(row.incomeCents)}</span>
                <span>{money(row.commissionCents)}</span>
              </div>
            ))}
            <div className="portal-revenue-row portal-revenue-combined">
              <span>Combined</span>
              <span>{money(month.incomeCents)}</span>
              <span>{money(month.commissionCents)}</span>
            </div>
          </div>
        </section>
        <section className="portal-panel">
          <h2>Workflow pipeline</h2>
          <p>From allocation to a completed collection.</p>
          <div className="portal-pipeline">
            {stages.map((s) => (
              <Link key={s} href="/admin/orders">
                <span>{operationStatusLabels[s]}</span>
                <div>
                  <span
                    style={{
                      width: `${(kpis.pipeline[s] / Math.max(1, kpis.openJobs)) * 100}%`,
                    }}
                  />
                </div>
                <strong>{kpis.pipeline[s]}</strong>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <section className="portal-panel">
        <div className="portal-toolbar">
          <h2 style={{ flex: 1 }}>Needs your attention</h2>
          <span className="portal-badge warning">
            {kpis.issues} exceptions
          </span>
        </div>
        {priority.map((b) => (
          <Link
            key={b.id}
            href={`/admin/orders?order=${encodeURIComponent(b.id)}`}
            className="portal-priority"
          >
            <span className="portal-priority-icon">
              {b.operation_status === "collection_due" ? (
                <RotateCcw size={18} />
              ) : (
                <Truck size={18} />
              )}
            </span>
            <span>
              <strong>
                {b.reference} · {b.full_name || "Booking"}
              </strong>
              <small>
                {b.bin_size.replace("m3", "m³")} · VIC {b.postcode} ·{" "}
                {b.delivery_date}
              </small>
            </span>
            <span
              className={`portal-badge ${b.operation_status === "issue" ? "warning" : ""}`}
            >
              {operationStatusLabels[b.operation_status]}
            </span>
            <ArrowUpRight size={15} />
          </Link>
        ))}
        {!priority.length && (
          <p className="portal-empty">
            All clear. No bookings need urgent attention.
          </p>
        )}
      </section>
    </div>
  );
}
