// P1-12 (FR-AI-04) — voice-to-Rx draft extraction. Pure regex pattern
// matching over well-dictated prescription phrasing ("Tab Paracetamol
// 650mg BD for 5 days") — a real, deterministic, testable first pass, not
// true NLU, and honestly documented as such. Every extracted item is a
// DRAFT: drug_name_text is free text here (the caller, ai-clinical
// .service.ts, is what fuzzy-matches it against the real Drugs master —
// deliberately kept out of this pure module so it stays unit-testable
// without a database), and nothing here is ever persisted directly —
// the frontend pre-fills these as editable rows into the existing,
// already-built prescription builder, which is what actually creates a
// real PrescriptionItems row once a clinician reviews and submits it.
// REQ021's own auto-quantity calculation runs there, unchanged and not
// duplicated here.

export interface ExtractedPrescriptionItem {
  drug_name_text: string;
  dose?: string;
  frequency?: 'OD' | 'BD' | 'TDS' | 'QID' | 'HS' | 'SOS';
  duration_days?: number;
}

const FREQUENCY_PHRASES: Array<[RegExp, ExtractedPrescriptionItem['frequency']]> = [
  [/\b(once\s+(a\s+)?day|once\s+daily|od)\b/i, 'OD'],
  [/\b(twice\s+(a\s+)?day|twice\s+daily|bd)\b/i, 'BD'],
  [/\b(three\s+times\s+(a\s+)?day|thrice\s+daily|tds)\b/i, 'TDS'],
  [/\b(four\s+times\s+(a\s+)?day|qid)\b/i, 'QID'],
  [/\b(at\s+(bed\s?time|night)|hs)\b/i, 'HS'],
  [/\b(as\s+needed|when\s+required|sos)\b/i, 'SOS'],
];

const DURATION_PATTERN = /\bfor\s+(\d{1,3})\s*(day|days|week|weeks)\b/i;
const DOSE_PATTERN = /\b(\d{1,4}\s?(?:mg|ml|mcg|g))\b/i;
// Tab/Cap/Syp/Inj markers are the strongest signal a phrase names a drug
// at all — this extractor deliberately only fires on lines carrying one,
// rather than guessing at bare nouns, to keep the false-positive rate low
// (a missed drug is a clinician typing one line by hand, same as today;
// a FABRICATED drug suggestion is a real safety risk this module refuses
// to introduce).
const DRUG_LINE_PATTERN = /\b(tab(?:let)?|cap(?:sule)?|syp|syrup|inj(?:ection)?)\.?\s+([A-Za-z][A-Za-z-]*(?:\s+[A-Za-z][A-Za-z-]*){0,2})/gi;

function toDurationDays(match: RegExpMatchArray | null): number | undefined {
  if (!match) return undefined;
  const n = Number(match[1]);
  return /week/i.test(match[2]) ? n * 7 : n;
}

export function extractPrescriptionDraft(transcript: string): ExtractedPrescriptionItem[] {
  const items: ExtractedPrescriptionItem[] = [];
  const lines = transcript.split(/(?<=[.!?।])\s+/);

  for (const line of lines) {
    DRUG_LINE_PATTERN.lastIndex = 0;
    const drugMatch = DRUG_LINE_PATTERN.exec(line);
    if (!drugMatch) continue;

    const doseMatch = line.match(DOSE_PATTERN);
    const durationMatch = line.match(DURATION_PATTERN);
    let frequency: ExtractedPrescriptionItem['frequency'];
    for (const [pattern, freq] of FREQUENCY_PHRASES) {
      if (pattern.test(line)) {
        frequency = freq;
        break;
      }
    }

    items.push({
      drug_name_text: drugMatch[2].trim(),
      dose: doseMatch?.[1],
      frequency,
      duration_days: toDurationDays(durationMatch),
    });
  }
  return items;
}
