import { NotificationProvider } from './provider.interface';

// Gupshup's documented Enterprise SMS send API. Same honest caveat as
// msg91.provider.ts -- no real credentials to test delivery against yet.
const SEND_URL = 'https://enterprise.smsgupshup.com/GatewayAPI/rest';

export const gupshupProvider: NotificationProvider = {
  id: 'gupshup',
  label: 'Gupshup',
  channel: 'sms',
  fields: [
    { key: 'user_id', label: 'User ID', type: 'text', required: true },
    { key: 'password', label: 'Password', type: 'password', required: true },
    { key: 'sender_id', label: 'Sender ID', type: 'text', required: true },
  ],
  async send(credentials, to, message) {
    try {
      const params = new URLSearchParams({
        method: 'SendMessage',
        send_to: to,
        msg: message,
        msg_type: 'TEXT',
        userid: credentials.user_id,
        auth_scheme: 'plain',
        password: credentials.password,
        v: '1.1',
        format: 'json',
        mask: credentials.sender_id,
      });
      const res = await fetch(`${SEND_URL}?${params.toString()}`, { method: 'GET' });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { sent: false, error: `Gupshup responded ${res.status}: ${body.slice(0, 200)}` };
      }
      const body = await res.json().catch(() => null) as { response?: { status?: string; details?: string } } | null;
      if (body?.response?.status && body.response.status !== 'success') {
        return { sent: false, error: body.response.details ?? 'Gupshup send failed' };
      }
      return { sent: true };
    } catch (e: any) {
      return { sent: false, error: e.message ?? 'Gupshup request failed' };
    }
  },
};
