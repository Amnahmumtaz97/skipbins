import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/server/rate-limit";

const AUSPOST_URL = "https://digitalapi.auspost.com.au/postcode/search.json";

type AusPostLocality = {
  category: string;
  id: number;
  latitude: number;
  location: string;
  longitude: number;
  postcode: number;
  state: string;
};

type AusPostResponse = {
  localities?: {
    locality?: AusPostLocality | AusPostLocality[];
  };
};

export async function GET(request: NextRequest) {
  const limited = rateLimit("postcodes");
  if (limited) return limited;
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query || query.length < 3) {
    return Response.json({ error: "Enter at least 3 characters of a suburb or postcode." }, { status: 400 });
  }

  if (!/^[a-zA-Z0-9 '\-]{3,60}$/.test(query)) {
    return Response.json({ error: "Enter a suburb or postcode using letters and numbers." }, { status: 400 });
  }

  const apiKey = process.env.AUSPOST_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Postcode search is temporarily unavailable. Please try again later." }, { status: 503 });
  }

  try {
    const url = `${AUSPOST_URL}?q=${encodeURIComponent(query)}&excludepostboxflag=true`;
    const res = await fetch(url, {
      headers: { "auth-key": apiKey },
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });

    if (!res.ok) {
      return Response.json({ error: "Postcode search is temporarily unavailable. Please try again later." }, { status: 503 });
    }

    const data: AusPostResponse = await res.json();

    // The API returns a single object when there's one result, or an array for multiple
    const raw = data.localities?.locality;
    const localities: AusPostLocality[] = !raw ? [] : Array.isArray(raw) ? raw : [raw];

    const results = localities.map((loc) => ({
      postcode: String(loc.postcode).padStart(4, "0"),
      suburb: loc.location,
      state: loc.state,
    }));

    return Response.json(results);
  } catch {
    return Response.json({ error: "Postcode search is temporarily unavailable. Please try again later." }, { status: 503 });
  }
}
