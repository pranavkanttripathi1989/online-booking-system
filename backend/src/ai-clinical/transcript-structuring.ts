// P1-11 (FR-AI-03, FR-AI-05) — pure, deterministic transcript structuring.
// No LLM call: "buy, don't build" (PRD v2 D1) covers the transcription
// step itself, not this one, and no structuring-LLM provider/credentials
// exist in this environment to call honestly. This is a real, if
// intentionally simple, rule-based first pass — sentence-level keyword
// classification into the same section vocabulary EncounterNotes already
// uses, plus a separate numeric-pattern vitals extractor. Deliberately
// kept as its own pure module (no Prisma/service dependency) so it's
// fully unit-testable and swappable later for an LLM-based structurer
// without touching the service that calls it (the same "provider is
// swappable" spirit FR-AI-12 states for transcription itself).
//
// Every field this produces is written with ai_generated: true and is
// never auto-signed (FR-AI-06) — a wrong classification here is a UX
// annoyance for the clinician to re-file, never a silent clinical error,
// because nothing here can reach a patient's real record without a human
// reviewing and saving it first.

export type NoteSection = 'complaints' | 'history' | 'exam' | 'advice' | 'follow_up';

const SECTION_KEYWORDS: Record<NoteSection, RegExp> = {
  history: /\b(since|history of|previously|last (week|month|year)|known case of|diagnosed with)\b/i,
  exam: /\b(on examination|o\/e|auscultation|palpation|inspection|appears|found to be|tenderness)\b/i,
  advice: /\b(advised?|prescrib(e|ed)|recommend(ed)?|start(ed)? (on|with)|continue|stop taking|avoid)\b/i,
  follow_up: /\b(follow[\s-]?up|review (in|after)|come back|revisit|see (you|me) again|repeat (test|scan) (in|after))\b/i,
  complaints: /\b(complain(s|t|ing)? of|presents? with|c\/o|reports?)\b/i,
};

// Checked in this order — a sentence naming follow-up AND advice both is
// rarer than the reverse, and advice/follow_up are the most clinically
// consequential to get right, so they're checked ahead of the two purely
// descriptive sections.
const SECTION_PRIORITY: NoteSection[] = ['follow_up', 'advice', 'exam', 'history', 'complaints'];

export interface StructuredNotes {
  sections: Partial<Record<NoteSection, string>>;
}

function splitSentences(transcript: string): string[] {
  return transcript
    .split(/(?<=[.!?।])\s+/) // '।' — Hindi/Devanagari sentence-ending danda, alongside Latin punctuation
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function classify(sentence: string): NoteSection {
  for (const section of SECTION_PRIORITY) {
    if (SECTION_KEYWORDS[section].test(sentence)) return section;
  }
  return 'complaints'; // default bucket — matches this section's own role as "what the patient came in with"
}

export function structureTranscript(transcript: string): StructuredNotes {
  const sentences = splitSentences(transcript);
  const buckets: Partial<Record<NoteSection, string[]>> = {};
  for (const sentence of sentences) {
    const section = classify(sentence);
    (buckets[section] ??= []).push(sentence);
  }
  const sections: Partial<Record<NoteSection, string>> = {};
  for (const [section, lines] of Object.entries(buckets)) {
    sections[section as NoteSection] = lines.join(' ');
  }
  return { sections };
}

// P1-11 (FR-AI-05) — Vitals.code's own real enum, matching
// encounters.service.ts's VITAL_UNITS map exactly.
export interface ExtractedVital {
  code: 'height_cm' | 'weight_kg' | 'temperature_c' | 'pulse_bpm' | 'bp_systolic' | 'bp_diastolic' | 'spo2_percent';
  value: number;
}

const VITAL_PATTERNS: Array<{ regex: RegExp; toReadings: (match: RegExpMatchArray) => ExtractedVital[] }> = [
  {
    // "BP 120/80", "blood pressure 120/80 mmHg"
    regex: /\b(?:bp|blood pressure)\s*(?:is|:)?\s*(\d{2,3})\s*\/\s*(\d{2,3})/i,
    toReadings: (m) => [
      { code: 'bp_systolic', value: Number(m[1]) },
      { code: 'bp_diastolic', value: Number(m[2]) },
    ],
  },
  {
    regex: /\b(?:pulse|heart rate|hr)\s*(?:is|:)?\s*(\d{2,3})\s*(?:bpm)?\b/i,
    toReadings: (m) => [{ code: 'pulse_bpm', value: Number(m[1]) }],
  },
  {
    regex: /\b(?:temp(?:erature)?)\s*(?:is|:)?\s*(\d{2,3}(?:\.\d)?)\s*(?:°?\s?[cf])?\b/i,
    toReadings: (m) => [{ code: 'temperature_c', value: Number(m[1]) }],
  },
  {
    regex: /\b(?:spo2|oxygen saturation|sats?)\s*(?:is|:)?\s*(\d{2,3})\s*%?/i,
    toReadings: (m) => [{ code: 'spo2_percent', value: Number(m[1]) }],
  },
  {
    regex: /\bweight\s*(?:is|:)?\s*(\d{1,3}(?:\.\d)?)\s*kgs?\b/i,
    toReadings: (m) => [{ code: 'weight_kg', value: Number(m[1]) }],
  },
  {
    regex: /\bheight\s*(?:is|:)?\s*(\d{2,3}(?:\.\d)?)\s*cm\b/i,
    toReadings: (m) => [{ code: 'height_cm', value: Number(m[1]) }],
  },
];

export function extractVitals(transcript: string): ExtractedVital[] {
  const readings: ExtractedVital[] = [];
  const seen = new Set<string>();
  for (const { regex, toReadings } of VITAL_PATTERNS) {
    const match = transcript.match(regex);
    if (!match) continue;
    for (const reading of toReadings(match)) {
      if (seen.has(reading.code)) continue; // first mention wins — a transcript rarely restates a vital twice with different values
      seen.add(reading.code);
      readings.push(reading);
    }
  }
  return readings;
}
