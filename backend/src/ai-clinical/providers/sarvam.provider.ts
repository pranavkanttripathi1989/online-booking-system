import { TranscriptionProvider } from './provider.interface';

// P1-11 (FR-AI-02) — Sarvam AI's documented Speech-to-Text API
// (https://api.sarvam.ai/speech-to-text), chosen per PRD v2's own D1
// decision ("buy, don't build — Sarvam or equivalent Indian provider")
// specifically for its real support of Hindi and multiple Indian regional
// languages with mid-sentence code-switching, which FR-AI-02 requires and
// most global STT vendors handle poorly. Multipart audio upload,
// api-subscription-key header auth, saarika:v2 is Sarvam's own current
// general-purpose model per their docs. No real Sarvam credentials exist
// in this environment to test an actual transcription against (matching
// notifications/providers/msg91.provider.ts's own precedent) — shaped
// against the published API contract, not fabricated, but flagged
// honestly rather than claimed as live-verified. Re-check field names
// against Sarvam's current docs the first time real credentials land here.
const TRANSCRIBE_URL = 'https://api.sarvam.ai/speech-to-text';

// Sarvam's own language_code values are BCP-47-ish with a required region
// suffix (hi-IN, en-IN, ...) — a plain 'hi'/'en' languageHint from the
// caller is mapped here rather than pushed onto every caller.
const LANGUAGE_CODE_MAP: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
};

export const sarvamProvider: TranscriptionProvider = {
  id: 'sarvam',
  label: 'Sarvam AI',
  fields: [{ key: 'api_key', label: 'API Subscription Key', type: 'password', required: true }],
  async transcribe(credentials, audioBase64, languageHint) {
    try {
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      const form = new FormData();
      form.append('file', new Blob([audioBuffer], { type: 'audio/wav' }), 'consultation.wav');
      form.append('model', 'saarika:v2');
      form.append('language_code', (languageHint && LANGUAGE_CODE_MAP[languageHint]) || 'unknown');

      const res = await fetch(TRANSCRIBE_URL, {
        method: 'POST',
        headers: { 'api-subscription-key': credentials.api_key },
        body: form,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { transcribed: false, error: `Sarvam responded ${res.status}: ${body.slice(0, 200)}` };
      }
      const data = (await res.json()) as { transcript?: string };
      if (!data.transcript) {
        return { transcribed: false, error: 'Sarvam returned no transcript' };
      }
      return { transcribed: true, text: data.transcript };
    } catch (e: any) {
      return { transcribed: false, error: e.message ?? 'Sarvam request failed' };
    }
  },
};
