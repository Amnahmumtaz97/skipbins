import "server-only";
export type VictorianLocality = {
  suburb: string;
  postcode: string;
  state: "VIC";
};
export async function victorianLocalities(
  query: string,
): Promise<VictorianLocality[]> {
  const key = process.env.AUSPOST_API_KEY?.trim();
  if (!key) throw new Error("Postcode lookup is not configured");
  const url = `https://digitalapi.auspost.com.au/postcode/search.json?q=${encodeURIComponent(query)}&state=VIC&excludepostboxflag=true`;
  const response = await fetch(url, {
    headers: { "auth-key": key },
    signal: AbortSignal.timeout(8000),
    redirect: "error",
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error("Postcode lookup is unavailable");
  const data = await response.json();
  const raw = data.localities?.locality;
  const values = !raw ? [] : Array.isArray(raw) ? raw : [raw];
  return values
    .filter((v: { state?: string }) => v.state?.toUpperCase() === "VIC")
    .map((v: { location: string; postcode: number }) => ({
      suburb: v.location.toUpperCase(),
      postcode: String(v.postcode).padStart(4, "0"),
      state: "VIC" as const,
    }));
}
