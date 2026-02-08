import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

const STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY || '';

if (!STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set. Stripe functionality will be disabled.');
}

// Initialize Stripe client with API version
export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2026-01-28.clover',
  typescript: true,
  appInfo: {
    name: 'SqueezMedia Platform',
    version: '1.0.0'
  }
});

// Re-export Stripe types for convenience
export type { Stripe };

// Helper to check if Stripe is properly configured
export function isStripeConfigured(): boolean {
  return !!STRIPE_SECRET_KEY;
}
