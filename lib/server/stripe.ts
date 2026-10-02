import Stripe from "stripe";

export function stripeSecret() {
  return process.env.STRIPE_SECRET_KEY?.trim() ?? "";
}

export function getStripe() {
  const key = stripeSecret();
  if (!key) throw new Error("Stripe is not configured");
  return new Stripe(key);
}

export function getTestStripe() {
  const key = process.env.STRIPE_TEST_SECRET_KEY?.trim() || stripeSecret();
  if (!key.startsWith("sk_test_")) {
    throw new Error("Stripe test mode is not configured");
  }
  return new Stripe(key);
}
