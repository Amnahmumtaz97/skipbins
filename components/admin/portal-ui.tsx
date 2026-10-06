"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="portal-heading">
      <div>
        <p className="portal-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="portal-actions">{actions}</div>
    </header>
  );
}
export function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <article className="portal-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="portal-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Notice({
  message,
  success = false,
}: {
  message: string;
  success?: boolean;
}) {
  return message ? (
    <div
      role={success ? "status" : "alert"}
      className={`portal-notice ${success ? "success" : ""}`}
    >
      {success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      <span>{message}</span>
    </div>
  ) : null;
}
export async function portalAction(action: string, data: unknown) {
  const response = await fetch("/api/admin/portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not save changes.");
  return result;
}
export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="portal-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="portal-dialog-title">
        <h2>{title}</h2>
        <button
          className="portal-icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function money(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}
