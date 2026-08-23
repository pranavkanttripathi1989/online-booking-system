// REQ008/PLAN017 — one file per SMS provider, each conforming to this shape.
// Adding provider #5 means adding one file here and registering it in
// registry.ts — no schema change, no resolver change.

export interface ProviderField {
  key: string;
  label: string;
  type: 'text' | 'password';
  required: boolean;
}

export interface SendResult {
  sent: boolean;
  error?: string;
}

export interface NotificationProvider {
  id: string;
  label: string;
  // REQ025 — widened from the original 'sms'-only union. Adding the
  // whatsapp value here is genuinely the whole schema/type impact of
  // adding a channel: NotificationProviderConfig.channel is already a
  // plain, un-enum'd String column (see schema.prisma), and every service/
  // resolver method already takes `channel: string` generically.
  channel: 'sms' | 'whatsapp';
  fields: ProviderField[];
  // Every implementation catches its own errors and returns {sent:false} --
  // a failed/misconfigured send must never throw into (and break) the
  // appointment/message/payment flow that triggered it.
  send(credentials: Record<string, string>, to: string, message: string): Promise<SendResult>;
}

export function validateCredentials(provider: NotificationProvider, credentials: Record<string, string>): string | null {
  for (const field of provider.fields) {
    if (field.required && !credentials[field.key]) {
      return `Missing required field "${field.label}" for ${provider.label}`;
    }
  }
  return null;
}
