import { NotificationProvider } from './provider.interface';
import { msg91Provider } from './msg91.provider';
import { gupshupProvider } from './gupshup.provider';
import { twilioProvider } from './twilio.provider';
import { awsSnsProvider } from './aws-sns.provider';

export const PROVIDERS: Record<string, NotificationProvider> = {
  msg91: msg91Provider,
  gupshup: gupshupProvider,
  twilio: twilioProvider,
  aws_sns: awsSnsProvider,
};

export function getProvider(id: string): NotificationProvider | undefined {
  return PROVIDERS[id];
}

export function listProviders(): NotificationProvider[] {
  return Object.values(PROVIDERS);
}
