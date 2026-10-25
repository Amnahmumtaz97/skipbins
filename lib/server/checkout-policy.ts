export type CheckoutSessionState = {
  bookingStatus: string;
  sessionStatus?: string | null;
  paymentStatus?: string | null;
  attemptStatus?: string | null;
};

export type CheckoutDecision = "paid" | "create" | "reuse" | "processing" | "retry";

export function checkoutDecision(state: CheckoutSessionState): CheckoutDecision {
  if (state.bookingStatus === "paid" || state.paymentStatus === "paid") return "paid";
  if (!state.sessionStatus) return "create";
  if (state.sessionStatus === "open") return "reuse";
  if (state.sessionStatus === "expired") return "retry";
  if (state.sessionStatus === "complete") {
    return state.attemptStatus === "failed" ? "retry" : "processing";
  }
  return "create";
}

export function verifiedBookingPayment(input: {
  expectedBookingId: string;
  metadataBookingId?: string | null;
  expectedAmount: number;
  amountTotal: number | null;
  currency: string | null;
}) {
  return input.metadataBookingId === input.expectedBookingId &&
    Number.isInteger(input.amountTotal) &&
    input.amountTotal === input.expectedAmount &&
    input.currency?.toLowerCase() === "aud";
}

export function stripeCheckoutIdempotencyKey(bookingId: string, attempt: number) {
  return `skipbins-booking-${bookingId}-attempt-${attempt}`;
}
