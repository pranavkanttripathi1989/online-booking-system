import { TranscriptionProvider } from './provider.interface';
import { sarvamProvider } from './sarvam.provider';

export const TRANSCRIPTION_PROVIDERS: Record<string, TranscriptionProvider> = {
  sarvam: sarvamProvider,
};

export function getTranscriptionProvider(id: string): TranscriptionProvider | undefined {
  return TRANSCRIPTION_PROVIDERS[id];
}

export function listTranscriptionProviders(): TranscriptionProvider[] {
  return Object.values(TRANSCRIPTION_PROVIDERS);
}
