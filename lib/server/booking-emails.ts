import "server-only";
import { formatCurrency, isValidEmail } from "@/lib/booking-utils";
import {
  formatBinLabel,
  formatHirePeriod,
  getBinBySizeOrId,
  getWasteById,
} from "@/lib/data/skip-bins";
import { adminDatabase } from "@/lib/server/admin-database";
import type { StoredBooking } from "@/lib/server/booking-service";
import {
  bookingNotifyEmails,
  getResend,
  resendApiKey,
  resendFromEmail,
  resendReplyToEmail,
} from "@/lib/server/resend";

type SupplierContact = {
  id: string;
  name: string;
  email: string;
  canEmail: boolean;
};

function isDeliverableEmail(value: string) {
  if (!isValidEmail(value)) return false;
  const host = value.split("@")[1]?.toLowerCase() ?? "";
  return !["example.com", "example.org", "example.net", "test.com", "localhost"].includes(host);
}

function supplierAssignmentLabel(supplier: SupplierContact | null) {
  if (!supplier) return "Unassigned — needs manual allocation";
  if (supplier.canEmail) return `${supplier.name} <${supplier.email}>`;
  return `${supplier.name} (assigned — no valid supplier email on file)`;
}

function officeIntro(supplier: SupplierContact | null) {
  if (!supplier) {
    return "A customer has paid, but no active supplier covers this postcode. Assign one in the admin portal.";
  }
  if (!supplier.canEmail) {
    return `A customer has paid and ${supplier.name} was auto-assigned, but their supplier profile has no valid email so they were not notified.`;
  }
  return "A customer has paid and a supplier has been auto-assigned.";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDeliveryDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Melbourne",
  }).format(parsed);
}

function bookingSummary(booking: StoredBooking) {
  const bin = getBinBySizeOrId(booking.bin_size);
  const waste = getWasteById(booking.waste_type);
  return {
    reference: booking.reference,
    customerName: booking.full_name,
    customerEmail: booking.email,
    customerPhone: booking.phone,
    binLabel: bin ? formatBinLabel(bin.id) : booking.bin_size,
    wasteLabel: waste?.label ?? booking.waste_type,
    hirePeriod: formatHirePeriod(booking.hire_period),
    deliveryDate: formatDeliveryDate(booking.delivery_date),
    pickupDate: booking.pickup_date
      ? formatDeliveryDate(booking.pickup_date)
      : "To be confirmed",
    address: [booking.street_address, booking.postcode]
      .filter(Boolean)
      .join(", "),
    placement: booking.placement || "To be confirmed",
    access: booking.access?.trim() || "",
    notes: booking.notes?.trim() || "",
    amount: formatCurrency(booking.amount_cents / 100),
  };
}

function rowsHtml(rows: Array<[string, string]>) {
  return rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #e8eee4;color:#405347;font-size:13px;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #e8eee4;color:#172018;font-size:13px;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");
}

function emailShell(title: string, intro: string, rows: Array<[string, string]>, footer: string) {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f7ec;font-family:Arial,Helvetica,sans-serif;color:#172018;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7ec;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #d6dfd2;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:#0B3B24;padding:22px 24px;">
                <p style="margin:0;color:#65A30D;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">SkippyBinHire</p>
                <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;line-height:1.3;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 24px;">
                <p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#405347;">${escapeHtml(intro)}</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rowsHtml(rows)}</table>
                <p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#6C786F;">${escapeHtml(footer)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function loadSupplier(supplierId: string | null | undefined): Promise<SupplierContact | null> {
  if (!supplierId) return null;
  const client = adminDatabase();
  if (!client) return null;
  const { data, error } = await client
    .from("suppliers")
    .select("id,name,email")
    .eq("id", supplierId)
    .maybeSingle();
  if (error || !data) return null;
  const email = String(data.email ?? "").trim().toLowerCase();
  return {
    id: String(data.id),
    name: String(data.name ?? "Supplier"),
    email,
    canEmail: isDeliverableEmail(email),
  };
}

async function sendMail(input: {
  to: string | string[];
  subject: string;
  html: string;
  idempotencyKey: string;
}) {
  const resend = getResend();
  const { error } = await resend.emails.send(
    {
      from: resendFromEmail(),
      replyTo: resendReplyToEmail(),
      to: input.to,
      subject: input.subject,
      html: input.html,
    },
    { idempotencyKey: input.idempotencyKey },
  );
  if (error) throw new Error(error.message || "Resend could not send email");
}

export async function sendBookingPaidEmails(booking: StoredBooking) {
  if (!resendApiKey()) {
    console.warn("[booking-emails] RESEND_API_KEY is not set; skipped paid-order emails", {
      bookingId: booking.id,
      reference: booking.reference,
    });
    return { sent: [] as string[], skipped: ["unconfigured"] as string[] };
  }

  const summary = bookingSummary(booking);
  const supplier = await loadSupplier(booking.supplier_id);
  const sent: string[] = [];
  const skipped: string[] = [];
  const failures: string[] = [];

  const sharedRows: Array<[string, string]> = [
    ["Order number", summary.reference],
    ["Bin", summary.binLabel],
    ["Waste type", summary.wasteLabel],
    ["Hire period", summary.hirePeriod],
    ["Delivery date", summary.deliveryDate],
    ["Pickup date", summary.pickupDate],
    ["Delivery address", summary.address],
    ["Placement", summary.placement],
  ];

  try {
    await sendMail({
      to: summary.customerEmail,
      subject: `Booking confirmed — ${summary.reference}`,
      idempotencyKey: `booking-${booking.id}-customer`,
      html: emailShell(
        "Your bin is booked",
        `Thanks ${summary.customerName.split(/\s+/)[0] || "there"}. We've received your payment and your delivery is confirmed.`,
        [...sharedRows, ["Total paid", summary.amount]],
        "Reply to this email if you need to change access details or have a question before delivery.",
      ),
    });
    sent.push("customer");
  } catch (error) {
    failures.push(`customer: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  if (supplier?.canEmail) {
    const supplierRows: Array<[string, string]> = [
      ...sharedRows,
      ["Customer", summary.customerName],
      ["Phone", summary.customerPhone],
      ["Email", summary.customerEmail],
    ];
    if (summary.access) supplierRows.push(["Access notes", summary.access]);
    if (summary.notes) supplierRows.push(["Order notes", summary.notes]);

    try {
      await sendMail({
        to: supplier.email,
        subject: `New order assigned — ${summary.reference}`,
        idempotencyKey: `booking-${booking.id}-supplier`,
        html: emailShell(
          "New skip bin order",
          `A paid order has been assigned to ${supplier.name}. Please review delivery details and prepare the job.`,
          supplierRows,
          "Reply to this email if you cannot fulfil this job or need the office to reassign it.",
        ),
      });
      sent.push("supplier");
    } catch (error) {
      failures.push(`supplier: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  } else if (supplier) {
    skipped.push("supplier-invalid-email");
  } else {
    skipped.push("supplier-unassigned");
  }

  const office = bookingNotifyEmails();
  if (office.length) {
    const officeRows: Array<[string, string]> = [
      ...sharedRows,
      ["Customer", summary.customerName],
      ["Phone", summary.customerPhone],
      ["Email", summary.customerEmail],
      ["Assigned supplier", supplierAssignmentLabel(supplier)],
      ["Total paid", summary.amount],
    ];
    if (summary.access) officeRows.push(["Access notes", summary.access]);
    if (summary.notes) officeRows.push(["Order notes", summary.notes]);

    try {
      console.info("[booking-emails] Sending office notify", {
        bookingId: booking.id,
        reference: summary.reference,
        to: office,
        supplierId: booking.supplier_id ?? null,
        supplierLabel: supplierAssignmentLabel(supplier),
      });
      await sendMail({
        to: office,
        subject: supplier
          ? `New paid order — ${summary.reference} → ${supplier.name}`
          : `New paid order — ${summary.reference} (unassigned)`,
        // v3: include admins + accurate assignment label
        idempotencyKey: `booking-${booking.id}-office-v3`,
        html: emailShell(
          "New paid order",
          officeIntro(supplier),
          officeRows,
          "This alert was sent to the office booking inbox and admin notification addresses.",
        ),
      });
      sent.push("office");
    } catch (error) {
      failures.push(`office: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  } else {
    skipped.push("office-unconfigured");
  }

  if (failures.length) {
    throw new Error(`Booking email delivery failed (${failures.join("; ")})`);
  }

  return { sent, skipped };
}
