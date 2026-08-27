import { structureTranscript } from '../ai-clinical/transcript-structuring';

// P2-05 — the "AI part is the wedge" from the phase plan's own framing:
// a competitor export's free-text history/notes column, reusing P1-11's
// existing deterministic sentence classifier (structureTranscript) --
// not a new NLU capability, and not fabricated. A rival's own export
// becomes labeled, sectioned data inside this product rather than one
// opaque blob, without ever inventing a fact the source text didn't
// already contain.

const SECTION_LABELS: Record<string, string> = {
  complaints: 'Complaints',
  history: 'History',
  exam: 'Examination',
  advice: 'Advice',
  follow_up: 'Follow-up',
};

// Real free text (a genuine multi-sentence blob) gets structured; a
// short, already-terse cell (a single word or short phrase, common for
// a "notes" column that just says "Diabetic" or "Nil") is passed
// through unchanged -- running the sentence classifier on a fragment
// with no real sentence structure would only relabel it, not add value.
const MIN_LENGTH_TO_STRUCTURE = 60;

export function structureImportedNotes(rawNotes: string): string {
  const trimmed = rawNotes.trim();
  if (trimmed.length < MIN_LENGTH_TO_STRUCTURE) return trimmed;

  // structureTranscript() always classifies every real sentence into
  // some section (its own default bucket is 'complaints'), and a
  // non-empty, already-trimmed string of at least MIN_LENGTH_TO_STRUCTURE
  // always yields at least one sentence for it to classify -- there is
  // no real input shape at this point that produces zero sections, so
  // no fallback-to-original-text branch is needed here.
  const { sections } = structureTranscript(trimmed);
  const labeled = Object.entries(sections)
    .filter(([, content]) => content && content.trim().length > 0)
    .map(([section, content]) => `[${SECTION_LABELS[section] ?? section}] ${content}`);
  return labeled.join('\n');
}
