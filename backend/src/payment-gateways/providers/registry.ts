import { PaymentGatewayProvider } from './provider.interface';
import { razorpayProvider } from './razorpay.provider';
import { cashfreeProvider } from './cashfree.provider';
import { payuProvider } from './payu.provider';
import { phonepeProvider } from './phonepe.provider';

export const PROVIDERS: Record<string, PaymentGatewayProvider> = {
  razorpay: razorpayProvider,
  cashfree: cashfreeProvider,
  payu: payuProvider,
  phonepe: phonepeProvider,
};

export function getProvider(id: string): PaymentGatewayProvider | undefined {
  return PROVIDERS[id];
}

export function listProviders(): PaymentGatewayProvider[] {
  return Object.values(PROVIDERS);
}
