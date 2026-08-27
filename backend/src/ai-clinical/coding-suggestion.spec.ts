import { suggestCodes, CodeReference } from './coding-suggestion';

describe('suggestCodes (P2-02)', () => {
  const ICD10_FIXTURES: CodeReference[] = [
    { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', category: 'Respiratory' },
    { code: 'J02.9', description: 'Acute pharyngitis, unspecified', category: 'Respiratory' },
    { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: 'Endocrine' },
    { code: 'J45.909', description: 'Unspecified asthma, uncomplicated', category: 'Respiratory' },
  ];

  const PROCEDURE_FIXTURES: CodeReference[] = [
    { code: 'PR-010', description: 'Wound dressing, minor', category: 'Wound care' },
    { code: 'PR-040', description: 'Electrocardiogram (ECG), 12-lead', category: 'Cardiovascular' },
  ];

  it('suggests a code whose significant description words overlap the note text', () => {
    const results = suggestCodes('Patient presents with acute pharyngitis, sore throat for 3 days.', ICD10_FIXTURES);
    expect(results.map((r) => r.code)).toContain('J02.9');
  });

  it('returns matched_terms explaining exactly why a code was suggested', () => {
    const results = suggestCodes('c/o acute pharyngitis since yesterday', ICD10_FIXTURES);
    const match = results.find((r) => r.code === 'J02.9');
    expect(match?.matched_terms.sort()).toEqual(['acute', 'pharyngitis']);
  });

  it('does not suggest a code with no real keyword overlap', () => {
    const results = suggestCodes('Patient has knee joint pain after a fall.', ICD10_FIXTURES);
    expect(results.map((r) => r.code)).not.toContain('E11.9');
  });

  it('does not fabricate a suggestion outside the supplied reference list', () => {
    const results = suggestCodes('Patient has severe abdominal pain and vomiting.', ICD10_FIXTURES);
    expect(results.every((r) => ICD10_FIXTURES.some((f) => f.code === r.code))).toBe(true);
  });

  it('ranks a stronger keyword match above a weaker one', () => {
    const results = suggestCodes('known case of type 2 diabetes mellitus, on follow up', ICD10_FIXTURES);
    expect(results[0]?.code).toBe('E11.9');
  });

  it('ignores common stopwords and medical filler words so they cannot alone trigger a match', () => {
    // "unspecified" and "of"/"the"/"a" appear in nearly every description --
    // a note containing only those words must never match anything.
    const results = suggestCodes('the patient was seen and the visit was unspecified in nature', ICD10_FIXTURES);
    expect(results).toEqual([]);
  });

  it('caps results at maxResults', () => {
    const manyMatches: CodeReference[] = Array.from({ length: 10 }, (_, i) => ({
      code: `X${i}`,
      description: 'chest pain',
      category: 'Cardiovascular',
    }));
    const results = suggestCodes('patient reports chest pain', manyMatches, { maxResults: 3 });
    expect(results).toHaveLength(3);
  });

  it('respects a custom minOverlapRatio', () => {
    // "Acute upper respiratory infection" has 3 significant words; only
    // "acute" appears in the note -- a 0.5 ratio requirement excludes it,
    // a permissive 0.2 ratio requirement includes it.
    const note = 'acute onset today, otherwise unremarkable';
    expect(suggestCodes(note, ICD10_FIXTURES, { minOverlapRatio: 0.5 }).map((r) => r.code)).not.toContain('J06.9');
    expect(suggestCodes(note, ICD10_FIXTURES, { minOverlapRatio: 0.2 }).map((r) => r.code)).toContain('J06.9');
  });

  it('works identically against the procedure-code reference list, since it is the same shape', () => {
    const results = suggestCodes('Performed wound dressing for a minor laceration.', PROCEDURE_FIXTURES);
    expect(results.map((r) => r.code)).toContain('PR-010');
  });

  it('returns an empty array for a note with no significant words at all', () => {
    expect(suggestCodes('ok fine', ICD10_FIXTURES)).toEqual([]);
    expect(suggestCodes('', ICD10_FIXTURES)).toEqual([]);
  });
});
