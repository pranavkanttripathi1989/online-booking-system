// P2-02 (FR-AI coding assist) — deterministic keyword-overlap matching
// between an encounter's own note text and a curated code reference list
// (ICD-10 diagnosis codes or the OPD procedure-code starter set). Not true
// NLU, honestly documented as such, matching every other module in this
// directory (see transcript-structuring.ts's own identical note): "buy,
// don't build" (PRD v2 D1) covers a real structuring/coding LLM, and no
// such provider/credentials exist in this environment to call honestly.
// This is a real, testable first pass -- every suggestion carries the
// exact words that triggered it (matched_terms), so a clinician reviewing
// it can see *why* it was suggested rather than trusting a black box, the
// same transparency discipline extractPrescriptionDraft's structured
// dose/frequency fields already give a drug suggestion.
//
// Deliberately kept as its own pure module (no Prisma/service dependency),
// so it is fully unit-testable without a database and reusable for both
// diagnosis and procedure suggestion from one implementation -- the two
// differ only in which reference list is passed in.

export interface CodeReference {
  code: string;
  description: string;
  category: string;
}

export interface CodeSuggestion extends CodeReference {
  matched_terms: string[];
  score: number;
}

// Common English stopwords plus medical filler words that appear in almost
// every ICD-10/procedure description and would otherwise "match" nearly
// anything, producing false-positive suggestions.
const STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'in', 'on', 'with', 'without', 'and', 'or', 'by',
  'at', 'to', 'for', 'due', 'as', 'is', 'are', 'be', 'this', 'that', 'it',
  'unspecified', 'other', 'not', 'elsewhere', 'classified', 'nos', 'type',
]);

function significantWords(text: string): string[] {
  const words = (text.toLowerCase().match(/[a-z]+/g) ?? []).filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return Array.from(new Set(words));
}

const DEFAULT_MIN_OVERLAP_RATIO = 0.5;
const DEFAULT_MAX_RESULTS = 5;

// A candidate matches when at least half of its own significant
// description words appear verbatim in the note text -- deliberately
// conservative (see prescription-extraction.ts's own reasoning: a missed
// suggestion just means a clinician searches manually, same as today; a
// FABRICATED suggestion risks steering a real diagnosis/procedure code,
// which this module refuses to do by only ever surfacing candidates from
// the real reference list, never inventing one).
export function suggestCodes(
  noteText: string,
  candidates: CodeReference[],
  options?: { minOverlapRatio?: number; maxResults?: number },
): CodeSuggestion[] {
  const minOverlapRatio = options?.minOverlapRatio ?? DEFAULT_MIN_OVERLAP_RATIO;
  const maxResults = options?.maxResults ?? DEFAULT_MAX_RESULTS;
  const noteWords = new Set(significantWords(noteText));
  if (noteWords.size === 0) return [];

  const suggestions: CodeSuggestion[] = [];
  for (const candidate of candidates) {
    const descWords = significantWords(candidate.description);
    if (descWords.length === 0) continue;
    const matched = descWords.filter((w) => noteWords.has(w));
    if (matched.length === 0) continue;
    const score = matched.length / descWords.length;
    if (score < minOverlapRatio) continue;
    suggestions.push({ ...candidate, matched_terms: matched, score });
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, maxResults);
}
