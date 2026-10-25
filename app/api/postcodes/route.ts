import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/server/rate-limit";
import { victorianLocalities } from "@/lib/server/victorian-localities";
export async function GET(request: NextRequest) {
  const limited = rateLimit("postcodes");
  if (limited) return limited;
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || !/^[a-zA-Z0-9 '\-]{3,60}$/.test(query))
    return Response.json(
      {
        error: "Enter at least 3 characters of a Victorian suburb or postcode.",
      },
      { status: 400 },
    );
  try {
    const localities = await victorianLocalities(query);
    const exactPostcode = /^\d{4}$/.test(query);
    return Response.json(exactPostcode ? localities : localities.slice(0, 12));
  } catch {
    return Response.json(
      {
        error:
          "Postcode search is temporarily unavailable. Please try again later.",
      },
      { status: 503 },
    );
  }
}
