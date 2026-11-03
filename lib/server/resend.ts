import "server-only";
import { Resend } from "resend";

export function resendApiKey() {
  return process.env.RESEND_API_KEY?.trim() ?? "";
}

export function resendFromEmail() {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "SkippyBinHire <bookings@skippybinhire.com.au>"
  );
}

export function resendReplyToEmail() {
  return (
    process.env.RESEND_REPLY_TO_EMAIL?.trim() ||
    process.env.CONTACT_TO_EMAIL?.trim() ||
    "info@skippybinhire.com.au"
  );
}

export function getResend() {
  const key = resendApiKey();
  if (!key) throw new Error("Resend is not configured");
  return new Resend(key);
}

function bareEmail(value: string) {
  const angled = /<([^>]+)>/.exec(value);
  return (angled?.[1] ?? value).trim().toLowerCase();
}

function parseEmailList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map(bareEmail)
    .filter(Boolean);
}

/**
 * Paid-order office alerts go to BOOKING_NOTIFY_EMAIL (info@) and ADMIN_EMAILS
 * (same email format). ADMIN_EMAILS also remains the portal login allow-list.
 */
export function bookingNotifyEmails() {
  const office = parseEmailList(
    process.env.BOOKING_NOTIFY_EMAIL?.trim() || "info@skippybinhire.com.au",
  );
  const admins = parseEmailList(process.env.ADMIN_EMAILS);
  return [...new Set([...office, ...admins])];
}
