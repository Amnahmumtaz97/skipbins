export class InputError extends Error {}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new InputError("Send a JSON request.");
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) throw new InputError("Please submit this form from our website.");
  const reader = request.body?.getReader();
  if (!reader) throw new InputError("Please complete the form.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 8192) { await reader.cancel(); throw new InputError("Your message is too long."); }
      chunks.push(value);
    }
    const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    return data;
  } catch (error) {
    if (error instanceof InputError) throw error;
    throw new InputError("Please check the form and try again.");
  } finally { reader.releaseLock(); }
}

export function apiError(error: unknown) {
  return Response.json({ error: error instanceof InputError ? error.message : "This service is temporarily unavailable. Please try again later." },
    { status: error instanceof InputError ? 400 : 503, headers: { "Cache-Control": "no-store" } });
}
