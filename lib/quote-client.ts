export class QuoteLookupError extends Error {
  constructor(message: string, readonly status = 0) {
    super(message);
    this.name = "QuoteLookupError";
  }
}

export function isQuoteServiceUnavailable(error: unknown) {
  return error instanceof QuoteLookupError && (error.status === 0 || error.status >= 500);
}

export async function requestQuote(input: { postcode: string; size: string; waste: string; date?: string; hirePeriod?: string }) {
  let response: Response;
  try {
    response = await fetch("/api/quotes", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input), signal: AbortSignal.timeout(12000),
  });
  } catch { throw new QuoteLookupError("We couldn't check pricing right now. Please try again."); }
  const data = await response.json();
  if (!response.ok) throw new QuoteLookupError(data.error || "We couldn't find pricing for that postcode — please check and try again.", response.status);
  if (data.serviceable !== true || (input.date && (typeof data.total !== "number" || !Number.isFinite(data.total) || data.total < 0)))
    throw new QuoteLookupError("We couldn't find pricing for that postcode — please check and try again.", 422);
  return data as { serviceable: true; total: number | null };
}
