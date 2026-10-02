import { getBinBySizeOrId } from "@/lib/data/skip-bins";
import { adminStripeTestAmountCents } from "@/lib/data/admin-stripe-test";
import { isAdminUser } from "@/lib/server/admin-auth";
import { rateLimit } from "@/lib/server/rate-limit";
import { apiError, InputError, readJson } from "@/lib/server/request";
import { getTestStripe } from "@/lib/server/stripe";
import { createClient } from "@/lib/supabase/server";

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
    const session = await getTestStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "aud",
          unit_amount: adminStripeTestAmountCents,
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
    if (error instanceof Error && error.message === "Stripe test mode is not configured") {
      return Response.json(
        { error: "Stripe test mode is not configured. Add STRIPE_TEST_SECRET_KEY with an sk_test_ key and redeploy." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (stripeErrorCode(error) === "amount_too_small") {
      return Response.json(
        { error: "Stripe rejected the test amount because it is below this account's settlement-currency minimum." },
        { status: 422, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (stripeErrorType(error) === "StripeAuthenticationError" || stripeErrorCode(error) === "api_key_expired") {
      return Response.json(
        { error: "Stripe rejected the test credentials. Check STRIPE_TEST_SECRET_KEY in the deployment environment and redeploy." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    return apiError(error);
  }
}

function stripeErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return "";
  return typeof error.code === "string" ? error.code : "";
}

function stripeErrorType(error: unknown) {
  if (!error || typeof error !== "object" || !("type" in error)) return "";
  return typeof error.type === "string" ? error.type : "";
}
