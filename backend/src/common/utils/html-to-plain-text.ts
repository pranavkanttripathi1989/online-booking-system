// FORM-20 -- EncounterNotes.content became TipTap-authored HTML (P1/P2
// clinical note sections). Every plain-text consumer of that column
// (the visit-summary PDF, patientTimeline's snippet) must not leak raw
// tags into its output. Input here is always TipTap StarterKit output
// (paragraphs, headings, bold/italic/code, lists, blockquotes, hard
// breaks) -- a bounded, known shape, not arbitrary third-party HTML --
// so a small deterministic converter is appropriate rather than a new
// dependency.
const BLOCK_CLOSE_TAGS = /<\/(p|div|li|h[1-6]|blockquote|pre)>/gi;
const BREAK_TAGS = /<br\s*\/?>/gi;
const ANY_TAG = /<[^>]*>/g;
const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(BREAK_TAGS, '\n')
    .replace(BLOCK_CLOSE_TAGS, '\n')
    .replace(ANY_TAG, '')
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/gi, (m) => ENTITIES[m.toLowerCase()] ?? m)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
