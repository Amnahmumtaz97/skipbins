import { rateLimit } from "@/lib/server/rate-limit";
import { apiError, readJson } from "@/lib/server/request";
import { lookupQuote, validateQuote } from "@/lib/server/quote-service";

export async function POST(request: Request) {
  const limited = rateLimit("quotes");
  if (limited) return limited;
  try {
    const input = validateQuote(await readJson(request));
    const quote = await lookupQuote(input);
    if (!quote.serviceable) return Response.json({ error: "We couldn't find pricing for that postcode — please check and try again." }, { status: 422 });
    return Response.json(quote, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
