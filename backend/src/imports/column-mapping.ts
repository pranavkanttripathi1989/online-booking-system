// P2-05 — deterministic column-mapping suggestion, the same "not true
// NLU, honestly documented as such" discipline every other ai-clinical/*
// -adjacent module in this codebase carries. Matches a source CSV header
// against a fixed keyword table per target field via normalized
// substring/equality checks. A header with no match is left unmapped for
// a human to assign manually or skip — never a fabricated guess.

export type ImportTargetField =
  | 'first_name'
  | 'last_name'
  | 'full_name'
  | 'email'
  | 'phone'
  | 'gender'
  | 'address'
  | 'date_of_birth'
  | 'medical_notes';

export interface SuggestedMapping {
  sourceColumn: string;
  targetField: ImportTargetField | null;
}

// Checked in this order — the more specific "first_name"/"last_name"
// patterns are checked before the broader "full_name" ones, so a header
// like "First Name" maps to first_name rather than the looser "name"
// keyword also matching full_name.
const RULES: Array<[ImportTargetField, RegExp]> = [
  ['first_name', /\b(first\s*name|given\s*name|fname)\b/],
  ['last_name', /\b(last\s*name|surname|family\s*name|lname)\b/],
  ['date_of_birth', /\b(date\s*of\s*birth|dob|birth\s*date)\b/],
  ['email', /\bemail\b/],
  ['phone', /\b(phone|mobile|contact\s*no|contact\s*number|cell)\b/],
  ['gender', /\b(gender|sex)\b/],
  ['address', /\baddress\b/],
  ['medical_notes', /\b(medical\s*history|history|notes|remarks|comments)\b/],
  ['full_name', /\b(full\s*name|patient\s*name)\b/],
];

function normalize(header: string): string {
  return header.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

export function suggestColumnMapping(headers: string[]): SuggestedMapping[] {
  return headers.map((sourceColumn) => {
    const normalized = normalize(sourceColumn);
    // A bare "name" header (no qualifier) is the single most common real
    // export shape for a full-name column -- checked as an exact match
    // rather than folded into the RULES regex table, since a substring
    // match on the word "name" alone would also fire on "first name"/
    // "last name" and short-circuit their own, more specific rules.
    if (normalized === 'name') return { sourceColumn, targetField: 'full_name' };
    const match = RULES.find(([, pattern]) => pattern.test(normalized));
    return { sourceColumn, targetField: match ? match[0] : null };
  });
}
