import { PlatformBillingProvider } from './provider.interface';
import { razorpaySubscriptionsProvider } from './razorpay-subscriptions.provider';
import { stripeProvider } from './stripe.provider';

// REQ178/180 — Razorpay primary (UPI AutoPay/eNACH, real RBI e-mandate
// compliance), Stripe as a secondary card-only fallback — the user's own
// explicit choice. The map is the factory, no switch statement.
export const PROVIDERS: Record<string, PlatformBillingProvider> = {
  razorpay: razorpaySubscriptionsProvider,
  stripe: stripeProvider,
};

export function getProvider(id: string): PlatformBillingProvider | undefined {
  return PROVIDERS[id];
}

export function listProviders(): PlatformBillingProvider[] {
  return Object.values(PROVIDERS);
}
