import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/server/rate-limit";

const GEOSCAPE_URL = "https://api.psma.com.au/v1/predictive/address";
const STREET_PREFIXES = ["sw", "st", "sa", "se", "sh", "sc", "ma", "ba", "br", "ca", "ch", "cl", "gr", "ha", "la", "pa", "ra", "ro", "wa", "we", "hi", "mo", "ke", "pr", "co"];

type GeoscapeSuggestion = {
  address?: string;
};

type GeoscapeResponse = {
  suggest?: GeoscapeSuggestion[];
};

function parseSuggestion(label: string) {
  const trimmed = label.trim();
  const postcode = trimmed.match(/\sVIC\s+(\d{4})$/i)?.[1];
  const comma = trimmed.lastIndexOf(",");
  const street = (comma > 0 ? trimmed.slice(0, comma) : "").trim();
  if (!postcode || !street || street.length > 240) return null;
  return { street, label: trimmed, postcode };
}

async function geoscapeSuggest(apiKey: string, query: string) {
  const url = `${GEOSCAPE_URL}?query=${encodeURIComponent(query)}&stateTerritory=VIC&maxNumberOfResults=20`;
  const res = await fetch(url, {
    headers: { Authorization: apiKey },
    signal: AbortSignal.timeout(8000),
    redirect: "error",
  });
  if (!res.ok) return { status: res.status, addresses: [] as string[] };
  const data: GeoscapeResponse = await res.json();
  if (!Array.isArray(data.suggest)) return { status: 502, addresses: [] as string[] };
  return {
    status: res.status,
    addresses: data.suggest.flatMap((item) => typeof item.address === "string" ? [item.address.trim()] : []),
  };
}

async function addressesInPostcode(apiKey: string, number: string, postcode: string) {
  const found: string[] = [];
  const seen = new Set<string>();
  let index = 0;
  const deadline = Date.now() + 3500;
  const worker = async () => {
    while (index < STREET_PREFIXES.length && found.length < 20 && Date.now() < deadline) {
      const prefix = STREET_PREFIXES[index++];
      const result = await geoscapeSuggest(apiKey, `${number} ${prefix}`);
      const numberPattern = new RegExp(`(^|\\s)${number.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`, "i");
      for (const address of result.addresses) {
        const streetLine = address.slice(0, Math.max(address.lastIndexOf(","), 0));
        if (seen.has(address) || !address.toUpperCase().endsWith(`VIC ${postcode}`) || !numberPattern.test(streetLine)) continue;
        seen.add(address);
        found.push(address);
        if (found.length >= 20) return;
      }
    }
  };
  await Promise.all([worker(), worker()]);
  return found;
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

  const apiKey = process.env.GEOSCAPE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Address search is temporarily unavailable. Please try again later." }, { status: 503 });
  }

  try {
    const first = await geoscapeSuggest(apiKey, query);
    if (first.status === 401 || first.status === 403) {
      return Response.json({ error: "Address search isn't enabled for this API key. In Geoscape Hub, add the Predictive API to the key, then try again." }, { status: 503 });
    }
    if (first.status === 502) {
      return Response.json({ error: "Address search is temporarily unavailable. Please try again later." }, { status: 503 });
    }
    if (first.status !== 200 && first.status !== 400) {
      return Response.json({ error: "Address search is temporarily unavailable. Please try again later." }, { status: 503 });
    }

    const inPostcode = (address: string) => address.toUpperCase().endsWith(`VIC ${postcode}`);
    let labels = first.addresses.filter(inPostcode);
    if (labels.length === 0 && /^\d+[a-z]?$/i.test(query)) {
      const widened = await addressesInPostcode(apiKey, query, postcode);
      labels = widened.length > 0 ? widened : first.addresses;
    } else if (labels.length === 0) {
      labels = first.addresses;
    }

    const results = labels.flatMap((label) => {
      const parsed = parseSuggestion(label);
      return parsed ? [{ street: parsed.street, label: parsed.label }] : [];
    }).slice(0, 20);

    return Response.json(results);
  } catch {
    return Response.json({ error: "Address search is temporarily unavailable. Please try again later." }, { status: 503 });
  }
}
