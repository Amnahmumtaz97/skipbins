import { melbourneDate } from "@/lib/admin-config";
import { money } from "@/lib/admin-config";
import Link from "next/link";
import {
  ArrowUpRight,
  Truck,
  RotateCcw,
  ClipboardList,
  Wallet,
  SlidersHorizontal,
  MapPin,
  Users,
} from "lucide-react";
import { todayIsoDate, addDaysIso } from "@/lib/booking-utils";
import { operationStatusLabels } from "@/lib/data/operations";
import { buildAdminKpis } from "@/lib/operations-kpis";
import { getOperationsSnapshot } from "@/lib/server/operations-service";
import { PageHeading, Stat, Notice } from "@/components/admin/portal-ui";
export default async function AdminPage() {
  const snapshot = await getOperationsSnapshot(),
    { bookings, suppliers } = snapshot;
  const today = todayIsoDate(),
    kpis = buildAdminKpis(bookings, suppliers, today);
  const paid = bookings.filter(
    (b) => b.payment_status === "paid" && b.operation_status !== "cancelled",
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
      ["issue", "unassigned", "collection_due"].includes(b.operation_status),
    )
    .slice(0, 6);
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDaysIso(today, i - 6);
    return {
      date,
      cents: paid
        .filter((b) => melbourneDate(b.created_at) === date)
        .reduce((s, b) => s + b.amount_cents, 0),
    };
  });
  const max = Math.max(1, ...week.map((d) => d.cents));
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
          (!snapshot.serverConfigured
            ? "The operations database is not configured. Add the server database key to enable admin management."
            : !snapshot.supplierSchemaReady
              ? "Supplier data is unavailable. Verify the operations database migration."
              : "")
        }
      />
      <div className="portal-dashboard-hero">
        <div>
          <span className="portal-eyebrow">KEEP VICTORIA MOVING</span>
          <h2>Ready for the day ahead.</h2>
          <p>
            {kpis.deliveriesToday} deliveries and {kpis.collectionsToday}{" "}
            collections scheduled today.
          </p>
          <div className="portal-actions">
            <Link href="/admin/orders" className="portal-button">
              Manage bookings <ArrowUpRight size={15} />
            </Link>
            <Link href="/admin/pricing" className="portal-button-secondary">
              Update availability
            </Link>
          </div>
        </div>
        <div className="portal-hero-number">
          <Truck size={36} />
          <strong>{kpis.openJobs}</strong>
          <span>open jobs in progress</span>
        </div>
      </div>
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
          label="Needs a supplier"
          value={kpis.unassigned}
          detail={`${kpis.activeSuppliers} active suppliers`}
        />
        <Stat
          label="Paid revenue this month"
          value={money(kpis.monthValueCents)}
          detail={`${money(kpis.paidValueCents)} paid overall`}
        />
      </div>
      <div className="portal-dashboard-columns">
        <section className="portal-panel">
          <div className="portal-toolbar">
            <h2 style={{ flex: 1 }}>Revenue this week</h2>
            <Link href="/admin/payouts" className="portal-subtle">
              View report ↗
            </Link>
          </div>
          <p className="portal-chart-total">
            {money(week.reduce((s, d) => s + d.cents, 0))}
          </p>
          <p>Paid booking value by creation date.</p>
          <div
            className="portal-bar-chart"
            aria-label="Seven-day paid revenue chart"
          >
            {week.map((d) => (
              <div key={d.date}>
                <span
                  title={`${d.date}: ${money(d.cents)}`}
                  aria-label={`${d.date}: ${money(d.cents)}`}
                  style={{ height: `${Math.max(2, (d.cents / max) * 130)}px` }}
                />
                <small>
                  {new Date(`${d.date}T00:00:00Z`).toLocaleDateString("en-AU", {
                    weekday: "short",
                    timeZone: "UTC",
                  })}
                </small>
              </div>
            ))}
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
      <div className="portal-dashboard-columns">
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
        <section className="portal-panel">
          <h2>Workspace shortcuts</h2>
          <p>Keep your network and booking settings in shape.</p>
          <div className="portal-shortcuts">
            {[
              {
                href: "/admin/suppliers",
                label: "Supplier network",
                detail: `${kpis.activeSuppliers} active suppliers`,
                icon: Truck,
              },
              {
                href: "/admin/customers",
                label: "Customer register",
                detail: "Contact details & booking history",
                icon: Users,
              },
              {
                href: "/admin/pricing",
                label: "Pricing & dates",
                detail: "Prices, capacity & blocked dates",
                icon: SlidersHorizontal,
              },
              {
                href: "/admin/coverage",
                label: "Victorian coverage",
                detail: "Suburbs & postcodes",
                icon: MapPin,
              },
              {
                href: "/admin/payouts",
                label: "Payout reconciliation",
                detail: "Revenue, fees & supplier earnings",
                icon: Wallet,
              },
            ].map(({ href, label, detail, icon: Icon }) => (
              <Link key={href} href={href}>
                <Icon size={19} />
                <span>
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </span>
                <ArrowUpRight size={15} />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
