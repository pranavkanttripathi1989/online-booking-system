import { NotificationProvider } from './provider.interface';

// Gupshup's documented WhatsApp Business API (distinct product/endpoint
// from gupshup.provider.ts's SMS "Enterprise SMS" API above -- different
// credential shape, so a separate provider entry, not a shared one with a
// channel switch). Same honest caveat as the SMS providers: no real
// sandbox credentials to test delivery against yet.
const SEND_URL = 'https://api.gupshup.io/wa/api/v1/msg';

export const gupshupWhatsappProvider: NotificationProvider = {
  id: 'gupshup_whatsapp',
  label: 'Gupshup (WhatsApp)',
  channel: 'whatsapp',
  fields: [
    { key: 'apikey', label: 'API Key', type: 'password', required: true },
    { key: 'source', label: 'WhatsApp Source Number', type: 'text', required: true },
    { key: 'app_name', label: 'App Name', type: 'text', required: true },
  ],
  async send(credentials, to, message) {
    try {
      const params = new URLSearchParams({
        channel: 'whatsapp',
        source: credentials.source,
        destination: to,
        message: JSON.stringify({ type: 'text', text: message }),
        'src.name': credentials.app_name,
      });
      const res = await fetch(SEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          apikey: credentials.apikey,
        },
        body: params.toString(),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { sent: false, error: `Gupshup WhatsApp responded ${res.status}: ${body.slice(0, 200)}` };
      }
      const body = (await res.json().catch(() => null)) as { status?: string } | null;
      if (body?.status && body.status !== 'submitted') {
        return { sent: false, error: `Gupshup WhatsApp did not accept the message (status: ${body.status})` };
      }
      return { sent: true };
    } catch (e: any) {
      return { sent: false, error: e.message ?? 'Gupshup WhatsApp request failed' };
    }
  },
};
