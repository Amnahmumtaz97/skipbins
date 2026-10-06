"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Truck,
  Wallet,
  MapPin,
  SlidersHorizontal,
  Settings,
  UserPlus,
  CreditCard,
  LogOut,
  PackageSearch,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
const links = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Bookings", icon: ClipboardList },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/suppliers", label: "Suppliers", icon: Truck },
  { href: "/admin/applications", label: "Applications", icon: UserPlus },
  { href: "/admin/payouts", label: "Payouts & revenue", icon: Wallet },
  { href: "/admin/coverage", label: "Suburbs & postcodes", icon: MapPin },
  {
    href: "/admin/pricing",
    label: "Pricing & availability",
    icon: SlidersHorizontal,
  },

  { href: "/admin/profile", label: "Business profile", icon: Settings },
  { href: "/admin/stripe-test", label: "Payment testing", icon: CreditCard },
];
export function AdminShell({ email }: { email: string }) {
  const pathname = usePathname(),
    router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setSigningOut(true);
    const { error } = await createClient().auth.signOut();
    if (error) {
      setError("Could not sign out. Please try again.");
      setSigningOut(false);
      return;
    }
    router.replace("/admin/login");
    router.refresh();
  }
  const title =
    links.find((l) =>
      l.href === "/admin" ? pathname === l.href : pathname.startsWith(l.href),
    )?.label || "Operations";
  return (
    <>
      <header className="portal-topbar">
        <button
          className="portal-icon-button portal-mobile-menu"
          aria-label="Open navigation"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Menu size={22} />
        </button>
        <div>
          <span className="portal-topbar-kicker">WORKSPACE /</span>
          <strong>{title}</strong>
        </div>
        <span className="portal-vic">
          <MapPin size={13} />
          Victoria only
        </span>
        <Link href="/" target="_blank" className="portal-site-link">
          View website <ArrowUpRight size={15} />
        </Link>
      </header>
      {open && (
        <button
          className="portal-nav-backdrop"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <aside className={`portal-sidebar ${open ? "is-open" : ""}`}>
        <div className="portal-brand">
          <span>
            <PackageSearch size={24} />
          </span>
          <Link href="/admin" onClick={() => setOpen(false)}>
            <strong>Premium</strong>
            <small>SKIP BINS · ADMIN</small>
          </Link>
          <button
            className="portal-close-nav"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <p className="portal-nav-label">OPERATIONS WORKSPACE</p>
        <nav aria-label="Admin navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={
                (
                  href === "/admin"
                    ? pathname === href
                    : pathname.startsWith(href)
                )
                  ? "page"
                  : undefined
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="portal-sidebar-footer">
          <div className="portal-avatar">{email.slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>Administrator</strong>
            <small title={email}>{email}</small>
          </div>
          <button
            title="Sign out"
            aria-label="Sign out"
            disabled={signingOut}
            onClick={signOut}
          >
            <LogOut size={18} />
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      </aside>
    </>
  );
}
