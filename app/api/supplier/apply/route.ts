import { createSupplierApplication } from "@/lib/server/operations-service";
import { InputError, apiError, readJson } from "@/lib/server/request";
import { rateLimit } from "@/lib/server/rate-limit";
import { SupplierApplicationValidationError, validateSupplierApplication } from "@/lib/supplier-application";

export async function POST(request: Request) {
  const limited = rateLimit("supplier-applications", 5);
  if (limited) return limited;

  try {
    const body = await readJson(request);
    let input;
    try {
      input = validateSupplierApplication(body);
    } catch (error) {
      if (error instanceof SupplierApplicationValidationError) throw new InputError(error.message);
      throw error;
    }
    await createSupplierApplication(input);
    return Response.json({ submitted: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("already") || message.includes("registered") || message.includes("duplicate")) {
      return apiError(new InputError("An application or account already exists for this email."));
    }
    return apiError(error);
  }
}
