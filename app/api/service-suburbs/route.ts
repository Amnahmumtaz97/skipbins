import { rateLimit } from "@/lib/server/rate-limit";
import { vicLocalities } from "@/lib/data/vic-localities";
import { bookablePostcodes } from "@/lib/server/supplier-coverage";

export async function GET() {
  const limited = rateLimit("service-suburbs");
  if (limited) return limited;
  try {
    const postcodes = await bookablePostcodes();
    if (!postcodes)
      return Response.json(
        { error: "Delivery suburbs are temporarily unavailable." },
        { status: 503 },
      );
    const allowed = new Set(postcodes);
    return Response.json(
      vicLocalities
        .filter((row) => allowed.has(row.postcode))
        .map((row) => ({
          suburb: row.suburb,
          postcode: row.postcode,
          state: "VIC" as const,
        })),
    );
  } catch {
    return Response.json(
      { error: "Delivery suburbs are temporarily unavailable." },
      { status: 503 },
    );
  }
}
