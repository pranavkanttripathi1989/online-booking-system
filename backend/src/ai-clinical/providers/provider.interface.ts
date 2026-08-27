// P1-11 (FR-AI-02, FR-AI-12) — one file per transcription provider, each
// conforming to this shape, matching notifications/providers'
// provider.interface.ts precedent exactly (adding provider #2 means one
// file plus one registry.ts entry, no resolver/schema change).

export interface ProviderField {
  key: string;
  label: string;
  type: 'text' | 'password';
  required: boolean;
}

export interface TranscriptionResult {
  transcribed: boolean;
  text?: string;
  error?: string;
}

export interface TranscriptionProvider {
  id: string;
  label: string;
  fields: ProviderField[];
  // audioBase64 is passed straight through and never persisted by this
  // service (FR-AI-07) — the provider call is the only place it exists in
  // memory beyond the request handler itself. languageHint is a BCP-47-ish
  // code ('en', 'hi', ...) so a caller can bias recognition; every real
  // provider implementation may ignore it if it auto-detects instead.
  transcribe(credentials: Record<string, string>, audioBase64: string, languageHint?: string): Promise<TranscriptionResult>;
}

export function validateCredentials(provider: TranscriptionProvider, credentials: Record<string, string>): string | null {
  for (const field of provider.fields) {
    if (field.required && !credentials[field.key]) {
      return `Missing required field "${field.label}" for ${provider.label}`;
    }
  }
  return null;
}
