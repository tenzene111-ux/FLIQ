import Stripe from "stripe";

let cached: Stripe | null = null;

/** Throws a clear error at call time (not import time) if Stripe isn't configured, rather than silently no-op'ing a real-money flow. */
export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured — coin purchases are unavailable until it's set.");
  }
  cached = new Stripe(key);
  return cached;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
