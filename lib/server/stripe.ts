import Stripe from "stripe";

export function stripeSecret() {
  return process.env.STRIPE_SECRET_KEY?.trim() ?? "";
}

export function getStripe() {
  const key = stripeSecret();
  if (!key) throw new Error("Stripe is not configured");
  return new Stripe(key);
}
