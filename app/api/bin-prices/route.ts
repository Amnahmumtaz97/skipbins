import { isIsoDate } from "@/lib/admin-config";
import { isResolvedPostcode } from "@/lib/postcode";
import { rateLimit } from "@/lib/server/rate-limit";
import { apiError } from "@/lib/server/request";
import { listBinPrices } from "@/lib/server/quote-service";

function suburbParam(value: string | null) {
  const suburb = value?.trim().toUpperCase() ?? "";
  if (!suburb || suburb.length > 40 || !/^[A-Z][A-Z .'-]*$/.test(suburb))
    return "";
  return suburb;
}

export async function GET(request: Request) {
  const limited = rateLimit("bin-prices");
  if (limited) return limited;
  try {
    const url = new URL(request.url);
    const postcode = url.searchParams.get("postcode")?.trim() ?? "";
    const date = url.searchParams.get("date")?.trim() ?? "";
    const prices = await listBinPrices({
      postcode: isResolvedPostcode(postcode) ? postcode : undefined,
      suburb: suburbParam(url.searchParams.get("suburb")),
      date: isIsoDate(date) ? date : undefined,
    });
    return Response.json(prices, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
