import { classifyDenial } from './denial-classification';

describe('classifyDenial (P2-03)', () => {
  it.each([
    ['Documentation was missing for this claim', 'missing_documentation'],
    ['Discharge summary not attached', 'missing_documentation'],
    ['Incorrect ICD code submitted', 'coding_mismatch'],
    ['Procedure code mismatch with diagnosis', 'coding_mismatch'],
    ['This treatment is not covered under the policy', 'not_covered'],
    ['Service is excluded from coverage', 'not_covered'],
    ['Prior authorization required before treatment', 'authorization_required'],
    ['Pre-authorization was not obtained', 'authorization_required'],
    ['This is a duplicate claim, already submitted last week', 'duplicate_claim'],
  ])('classifies "%s" as %s', (reason, expected) => {
    expect(classifyDenial(reason).category).toBe(expected);
  });

  it('falls back to "other" for an unrecognized rejection reason, never guessing', () => {
    const result = classifyDenial('Claim rejected for internal reasons');
    expect(result.category).toBe('other');
    expect(result.label).toBe('Other / unclassified');
  });

  it('checks authorization/duplicate before the broader coverage/coding categories', () => {
    // "not covered" and "authorization required" could both loosely match
    // a coverage-flavoured sentence -- the more specific category wins.
    expect(classifyDenial('Prior authorization required, not covered without it').category).toBe('authorization_required');
  });

  it('is case-insensitive', () => {
    expect(classifyDenial('DUPLICATE CLAIM').category).toBe('duplicate_claim');
  });

  it('returns a human-readable label alongside the category', () => {
    expect(classifyDenial('missing documentation').label).toBe('Missing documentation');
  });
});
