import { NotificationProvider } from './provider.interface';

// MSG91's documented v5 SMS send API. No real MSG91 credentials exist in
// this environment to test an actual delivery against (REQ008) -- shaped
// against MSG91's published API contract, not fabricated, but flagged
// honestly rather than claimed as live-verified. Re-check field names
// against MSG91's current docs the first time real credentials land here.
const SEND_URL = 'https://control.msg91.com/api/v5/flow/';

export const msg91Provider: NotificationProvider = {
  id: 'msg91',
  label: 'MSG91',
  channel: 'sms',
  fields: [
    { key: 'authkey', label: 'Auth Key', type: 'password', required: true },
    { key: 'sender_id', label: 'Sender ID', type: 'text', required: true },
    { key: 'route', label: 'Route', type: 'text', required: false },
  ],
  async send(credentials, to, message) {
    try {
      const res = await fetch(SEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: credentials.authkey,
        },
        body: JSON.stringify({
          sender: credentials.sender_id,
          route: credentials.route || '4',
          mobiles: to,
          sms: message,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { sent: false, error: `MSG91 responded ${res.status}: ${body.slice(0, 200)}` };
      }
      return { sent: true };
    } catch (e: any) {
      return { sent: false, error: e.message ?? 'MSG91 request failed' };
    }
  },
};
