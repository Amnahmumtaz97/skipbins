import { isAdminUser } from "@/lib/server/admin-auth";
import { resendBookingPaidEmails } from "@/lib/server/booking-emails";
import { InputError, apiError } from "@/lib/server/request";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const {
      data: { user },
    } = await (await createClient()).auth.getUser();
    if (!user)
      return Response.json(
        { error: "Please sign in as an admin." },
        { status: 401 },
      );
    if (!isAdminUser(user))
      return Response.json(
        { error: "Admin access is required." },
        { status: 403 },
      );
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id))
      throw new InputError("This order cannot be updated.");
    const result = await resendBookingPaidEmails(id);
    return Response.json(
      { resent: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof Error && !(error instanceof InputError)) {
      if (
        error.message === "Order not found" ||
        error.message.startsWith("Only paid orders")
      ) {
        return apiError(new InputError(error.message));
      }
    }
    return apiError(error);
  }
}
