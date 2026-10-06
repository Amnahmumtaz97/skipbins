"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Truck,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
export function SupplierShell({
  supplierName,
  email,
}: {
  supplierName: string;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    const { error } = await createClient().auth.signOut();
    if (error) {
      setError("Sign out failed. Please try again.");
      return;
    }
    router.replace("/supplier/login");
    router.refresh();
  }
  const links = [
    { href: "/supplier", label: "Overview", icon: LayoutDashboard },
    { href: "/supplier/orders", label: "Assigned orders", icon: ClipboardList },
    {
      href: "/supplier/schedule",
      label: "Dispatch schedule",
      icon: CalendarDays,
    },
    { href: "/supplier/earnings", label: "Earnings", icon: Wallet },

    { href: "/supplier/profile", label: "Business profile", icon: UserRound },
  ];
  return (
    <>
      <header className="portal-topbar">
        <div>
          <button
            type="button"
            className="portal-mobile-menu"
            aria-label="Open navigation"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Menu size={22} />
          </button>
          <span className="portal-topbar-kicker">PARTNER WORKSPACE</span>
          <strong>Supplier portal</strong>
        </div>
        <span className="portal-vic">Victoria · Australia</span>
        <Link className="portal-site-link" href="/">
          View website
        </Link>
      </header>
      {open && (
        <button
          type="button"
          className="portal-nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`portal-sidebar ${open ? "is-open" : ""}`}
        aria-label="Supplier navigation"
      >
        <Link
          className="portal-brand"
          href="/supplier"
          onClick={() => setOpen(false)}
        >
          <span>
            <Truck size={24} />
          </span>
          <div>
            <strong>Skip Bins</strong>
            <small>SUPPLIER PORTAL</small>
          </div>
        </Link>
        <button
          type="button"
          className="portal-close-nav"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        >
          <X size={22} />
        </button>
        <p className="portal-nav-label">YOUR BUSINESS</p>
        <nav>
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/supplier"
                ? pathname === href
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="portal-sidebar-footer">
          <div className="portal-avatar">
            {supplierName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <strong>{supplierName}</strong>
            <small>{email}</small>
          </div>
          <button type="button" aria-label="Sign out" onClick={signOut}>
            <LogOut size={18} />
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      </aside>
    </>
  );
}
