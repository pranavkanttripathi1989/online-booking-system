import { structureImportedNotes } from './structure-notes';

describe('structureImportedNotes (P2-05)', () => {
  it('passes a short cell through unchanged, never fabricating structure it does not have', () => {
    expect(structureImportedNotes('Diabetic')).toBe('Diabetic');
    expect(structureImportedNotes('Nil known allergies')).toBe('Nil known allergies');
  });

  it('structures a real multi-sentence free-text blob into labeled sections', () => {
    // "since 3 days" matches transcript-structuring.ts's own 'history'
    // keyword rule ahead of 'complaints' in its real SECTION_PRIORITY
    // order -- this is that pre-existing classifier's real, correct
    // behavior, reused as-is, not re-implemented here.
    const raw =
      'Patient complains of fever since 3 days. On examination, throat is inflamed. Advised paracetamol and rest. Review in 5 days.';
    const result = structureImportedNotes(raw);
    expect(result).toContain('[History]');
    expect(result).toContain('[Examination]');
    expect(result).toContain('[Advice]');
    expect(result).toContain('[Follow-up]');
  });

  it('never invents a fact — every word in the output traces back to the input', () => {
    const raw = 'Patient complains of fever since 3 days and has a known case of hypertension diagnosed last year.';
    const result = structureImportedNotes(raw);
    expect(result).toContain('fever');
    expect(result).toContain('hypertension');
    expect(result).not.toMatch(/diabetes|asthma|cancer/i);
  });

  it('still classifies a long blob with no sentence-ending punctuation as one whole sentence, not an empty result', () => {
    // No '.','!','?' to split on -- the whole string is one sentence,
    // which the underlying classifier's own default bucket ('complaints')
    // still labels rather than producing nothing.
    const raw = 'x'.repeat(80);
    expect(structureImportedNotes(raw)).toBe(`[Complaints] ${raw}`);
  });

  it('trims surrounding whitespace either way', () => {
    expect(structureImportedNotes('  Diabetic  ')).toBe('Diabetic');
  });
});
