import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/server/rate-limit";

const GETADDRESS_URL = "https://api.getaddress.io/autocomplete";

type GetAddressSuggestion = {
  address?: string;
  id?: string;
};

type GetAddressResponse = {
  suggestions?: GetAddressSuggestion[];
};

function parseSuggestion(label: string) {
  const trimmed = label.trim();
  const postcode = trimmed.match(/\sVIC\s+(\d{4})$/i)?.[1];
  const comma = trimmed.lastIndexOf(",");
  const street = (comma > 0 ? trimmed.slice(0, comma) : "").trim();
  if (!postcode || !street || street.length > 240) return null;
  return { street, label: trimmed, postcode };
}

async function getAddressSuggestions(apiKey: string, query: string, postcode: string) {
  const term = `${query} ${postcode}`.trim();
  const url = new URL(`${GETADDRESS_URL}/${encodeURIComponent(term)}`);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("top", "6");
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
    redirect: "error",
  });
  if (!res.ok) return { status: res.status, suggestions: [] as GetAddressSuggestion[] };
  const data: GetAddressResponse = await res.json();
  if (!Array.isArray(data.suggestions)) return { status: 502, suggestions: [] as GetAddressSuggestion[] };
  return {
    status: res.status,
    suggestions: data.suggestions,
  };
}

export async function GET(request: NextRequest) {
  const limited = rateLimit("addresses");
  if (limited) return limited;

  const query = request.nextUrl.searchParams.get("q")?.trim();
  const postcode = request.nextUrl.searchParams.get("postcode")?.trim();

  if (!query) {
    return Response.json({ error: "Enter a street address." }, { status: 400 });
  }

  if (!/^[a-zA-Z0-9 '/,.#-]{1,80}$/.test(query)) {
    return Response.json({ error: "Enter a street address using letters and numbers." }, { status: 400 });
  }

  if (!postcode || !/^\d{4}$/.test(postcode)) {
    return Response.json({ error: "Choose a Victorian postcode before searching for a street." }, { status: 400 });
  }

  const apiKey =
    process.env.GET_ADDRESS_API_KEY?.trim()
    || process.env.GETADDRESS_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ error: "Address search is temporarily unavailable. Please try again later." }, { status: 503 });
  }

  try {
    const first = await getAddressSuggestions(apiKey, query, postcode);
    if (first.status === 401 || first.status === 403) {
      return Response.json({ error: "Address search isn't enabled for this getAddress.io API key. Please check the key and subscription." }, { status: 503 });
    }
    if (first.status === 429) return Response.json({ error: "Address search is busy. Please wait a moment and try again." }, { status: 503 });
    if (first.status === 502) {
      return Response.json({ error: "Address search is temporarily unavailable. Please try again later." }, { status: 503 });
    }
    if (first.status !== 200 && first.status !== 400) {
      return Response.json({ error: "Address search is temporarily unavailable. Please try again later." }, { status: 503 });
    }

    const seen = new Set<string>();
    const results = first.suggestions.flatMap((suggestion) => {
      if (typeof suggestion.address !== "string") return [];
      const parsed = parseSuggestion(suggestion.address);
      if (!parsed || parsed.postcode !== postcode || seen.has(parsed.label.toUpperCase())) return [];
      seen.add(parsed.label.toUpperCase());
      return [{ street: parsed.street, label: parsed.label }];
    }).slice(0, 6);

    return Response.json(results, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Address search is temporarily unavailable. Please try again later." }, { status: 503 });
  }
}
