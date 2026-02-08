import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

// Lazy-loaded Stripe client to avoid build-time initialization errors
let stripeClient: Stripe | null = null;

function getStripeSecretKey(): string {
  return env.STRIPE_SECRET_KEY || '';
}

// Helper to check if Stripe is properly configured
export function isStripeConfigured(): boolean {
  return !!getStripeSecretKey();
}

// Get or create Stripe client (lazy initialization)
export function getStripe(): Stripe {
  if (!stripeClient) {
    const secretKey = getStripeSecretKey();
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2025-01-27.acacia',
      typescript: true,
      appInfo: {
        name: 'SqueezMedia Platform',
        version: '1.0.0'
      }
    });
  }
  return stripeClient;
}

// For backwards compatibility - lazy getter
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripe()[prop as keyof Stripe];
  }
});

// Re-export Stripe types for convenience
export type { Stripe };
