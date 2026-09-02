// P2-14 -- the inverse of html-to-plain-text.ts's own decode table.
// EncounterNotes.content is TipTap-authored HTML (FORM-20); this codebase's
// first server-side write into that column from raw, patient-supplied text
// (encounters.service.ts's booking-intake auto-population) needs this to
// avoid landing an unescaped stored-XSS payload straight into a clinician's
// encounter note.
const ESCAPE_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/[&<>"']/g, (ch) => ESCAPE_ENTITIES[ch]);
}
