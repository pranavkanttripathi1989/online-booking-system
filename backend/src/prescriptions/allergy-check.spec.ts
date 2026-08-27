import { findAllergyConflict } from './allergy-check';

describe('findAllergyConflict', () => {
  it('matches when the allergy text equals the drug name', () => {
    const conflict = findAllergyConflict({ name: 'Amoxicillin', composition: 'Amoxicillin' }, [{ id: 'a1', text: 'Amoxicillin' }]);
    expect(conflict?.id).toBe('a1');
  });

  it('is case-insensitive', () => {
    const conflict = findAllergyConflict({ name: 'Amoxicillin', composition: null }, [{ id: 'a1', text: 'amoxicillin' }]);
    expect(conflict?.id).toBe('a1');
  });

  it('matches a short allergy token that is a substring of the composition (Sulfa vs Sulfamethoxazole)', () => {
    const conflict = findAllergyConflict({ name: 'Bactrim', composition: 'Sulfamethoxazole' }, [{ id: 'a1', text: 'Sulfa' }]);
    expect(conflict?.id).toBe('a1');
  });

  it('matches a free-text allergy description containing the drug name ("Aspirin allergy")', () => {
    const conflict = findAllergyConflict({ name: 'Aspirin', composition: 'Acetylsalicylic Acid' }, [{ id: 'a1', text: 'Aspirin allergy' }]);
    expect(conflict?.id).toBe('a1');
  });

  it('returns null when no allergy matches', () => {
    const conflict = findAllergyConflict({ name: 'Paracetamol', composition: 'Paracetamol' }, [{ id: 'a1', text: 'Amoxicillin' }]);
    expect(conflict).toBeNull();
  });

  it('returns null for an empty allergy list', () => {
    expect(findAllergyConflict({ name: 'Amoxicillin' }, [])).toBeNull();
  });

  it('does NOT match a drug-class-level allergy with no shared text (a named, honest limitation)', () => {
    const conflict = findAllergyConflict({ name: 'Amoxicillin', composition: 'Amoxicillin' }, [{ id: 'a1', text: 'Penicillin' }]);
    expect(conflict).toBeNull();
  });

  it('skips a too-short allergy token rather than false-matching on noise', () => {
    const conflict = findAllergyConflict({ name: 'Ibuprofen', composition: 'Ibuprofen' }, [{ id: 'a1', text: 'I' }]);
    expect(conflict).toBeNull();
  });

  it('returns the first matching allergy when several are recorded', () => {
    const conflict = findAllergyConflict({ name: 'Amoxicillin', composition: 'Amoxicillin' }, [
      { id: 'a1', text: 'Latex' },
      { id: 'a2', text: 'Amoxicillin' },
    ]);
    expect(conflict?.id).toBe('a2');
  });

  it('handles a null composition without throwing', () => {
    expect(() => findAllergyConflict({ name: 'Amoxicillin', composition: null }, [{ id: 'a1', text: 'Amoxicillin' }])).not.toThrow();
  });
});
