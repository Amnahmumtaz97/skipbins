import { isValidEmail } from "@/lib/booking-utils";
import { sendContactFormEmail } from "@/lib/server/booking-emails";
import { rateLimit } from "@/lib/server/rate-limit";
import { apiError, InputError, readJson } from "@/lib/server/request";
import { resendApiKey } from "@/lib/server/resend";

export async function POST(request: Request) {
  const limited = rateLimit("contact", 10);
  if (limited) return limited;
  try {
    const data = await readJson(request);
    for (const [key, max] of Object.entries({ name: 120, email: 254, message: 4000 })) {
      const value = data[key];
      if (
        typeof value !== "string" ||
        !value.trim() ||
        value.length > max ||
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)
      ) {
        throw new InputError(
          "Please enter your name, email and a message of up to 4,000 characters.",
        );
      }
    }
    if (!isValidEmail(data.email as string)) {
      throw new InputError("Please enter a valid email address.");
    }
    if (!resendApiKey()) {
      throw new Error("Contact delivery is not configured");
    }
    await sendContactFormEmail({
      name: (data.name as string).trim(),
      email: (data.email as string).trim(),
      message: (data.message as string).trim(),
    });
    return Response.json(
      { sent: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
