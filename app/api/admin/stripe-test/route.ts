import { getBinBySizeOrId } from "@/lib/data/skip-bins";
import { isAdminUser } from "@/lib/server/admin-auth";
import { rateLimit } from "@/lib/server/rate-limit";
import { apiError, InputError, readJson } from "@/lib/server/request";
import { getStripe } from "@/lib/server/stripe";
import { createClient } from "@/lib/supabase/server";

const TEST_AMOUNT_CENTS = 50;

export async function POST(request: Request) {
  try {
    const { data: { user } } = await (await createClient()).auth.getUser();
    if (!user) return Response.json({ error: "Please sign in as an admin." }, { status: 401 });
    if (!isAdminUser(user)) return Response.json({ error: "Admin access is required." }, { status: 403 });
    const limited = rateLimit(`admin-stripe-test:${user.id}`, 5);
    if (limited) return limited;

    const data = await readJson(request);
    const bin = typeof data.binId === "string" ? getBinBySizeOrId(data.binId) : undefined;
    if (!bin) throw new InputError("Please choose a valid sample bin.");

    const origin = new URL(request.url).origin;
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "aud",
          unit_amount: TEST_AMOUNT_CENTS,
          product_data: {
            name: `${bin.size} Skip Bin — Admin Stripe Test`,
            description: "Payment diagnostics only. This does not create a customer booking.",
          },
        },
      }],
      metadata: {
        purpose: "admin_stripe_test",
        adminUserId: user.id,
        binId: bin.id,
        binSize: bin.size,
      },
      payment_intent_data: {
        metadata: { purpose: "admin_stripe_test", adminUserId: user.id, binId: bin.id },
      },
      success_url: `${origin}/admin/stripe-test/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/admin/stripe-test?cancelled=1`,
    });

    if (!session.url) throw new Error("Stripe did not return a Checkout URL");
    return Response.json({ checkoutUrl: session.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin-stripe-test] Checkout request failed", error instanceof Error ? error.message : "Unknown error");
    return apiError(error);
  }
}
