import { NextRequest } from "next/server";

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
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return Response.json([]);
  }

  const apiKey = process.env.AUSPOST_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Australia Post API key is not configured" }, { status: 500 });
  }

  try {
    const url = `${AUSPOST_URL}?q=${encodeURIComponent(query)}&excludepostboxflag=true`;
    const res = await fetch(url, {
      headers: { "auth-key": apiKey },
    });

    if (!res.ok) {
      return Response.json({ error: "Failed to fetch postcodes" }, { status: res.status });
    }

    const data: AusPostResponse = await res.json();

    // The API returns a single object when there's one result, or an array for multiple
    const raw = data.localities?.locality;
    const localities: AusPostLocality[] = !raw ? [] : Array.isArray(raw) ? raw : [raw];

    const results = localities.map((loc) => ({
      postcode: String(loc.postcode),
      suburb: loc.location,
      state: loc.state,
    }));

    return Response.json(results);
  } catch {
    return Response.json({ error: "Postcode lookup failed" }, { status: 500 });
  }
}
