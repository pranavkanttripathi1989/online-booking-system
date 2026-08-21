import { NotificationProvider } from './provider.interface';

// Twilio's documented Messages resource API. Same honest caveat as
// msg91.provider.ts -- no real credentials to test delivery against yet.
export const twilioProvider: NotificationProvider = {
  id: 'twilio',
  label: 'Twilio',
  channel: 'sms',
  fields: [
    { key: 'account_sid', label: 'Account SID', type: 'text', required: true },
    { key: 'auth_token', label: 'Auth Token', type: 'password', required: true },
    { key: 'from_number', label: 'From Number', type: 'text', required: true },
  ],
  async send(credentials, to, message) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${credentials.account_sid}/Messages.json`;
      const auth = Buffer.from(`${credentials.account_sid}:${credentials.auth_token}`).toString('base64');
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${auth}`,
        },
        body: new URLSearchParams({ To: to, From: credentials.from_number, Body: message }).toString(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { message?: string } | null;
        return { sent: false, error: body?.message ?? `Twilio responded ${res.status}` };
      }
      return { sent: true };
    } catch (e: any) {
      return { sent: false, error: e.message ?? 'Twilio request failed' };
    }
  },
};
