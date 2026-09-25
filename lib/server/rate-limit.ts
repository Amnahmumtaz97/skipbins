// A bounded process-local limit for preview/single-instance use. A shared edge
// or Redis limiter is a production requirement when running multiple instances.
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(scope: string, limit = 30, now = Date.now()) {
  // Do not trust client-supplied forwarded IP headers. Until a trusted hosting
  // proxy is configured, enforce an aggregate quota for each endpoint.
  let bucket = buckets.get(scope);
  if (!bucket || now >= bucket.reset) {
    bucket = { count: 0, reset: now + 60_000 };
    buckets.set(scope, bucket);
  }
  if (++bucket.count > limit) {
    return Response.json({ error: "Too many requests. Please wait a minute and try again." }, {
      status: 429, headers: { "Retry-After": String(Math.ceil((bucket.reset - now) / 1000)), "Cache-Control": "no-store" },
    });
  }
  return null;
}
