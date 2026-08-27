import { suggestColumnMapping } from './column-mapping';

describe('suggestColumnMapping (P2-05)', () => {
  it.each([
    ['First Name', 'first_name'],
    ['Given Name', 'first_name'],
    ['Last Name', 'last_name'],
    ['Surname', 'last_name'],
    ['Date of Birth', 'date_of_birth'],
    ['DOB', 'date_of_birth'],
    ['Email', 'email'],
    ['Email Address', 'email'],
    ['Phone', 'phone'],
    ['Mobile Number', 'phone'],
    ['Gender', 'gender'],
    ['Sex', 'gender'],
    ['Address', 'address'],
    ['Medical History', 'medical_notes'],
    ['Notes', 'medical_notes'],
    ['Name', 'full_name'],
    ['Patient Name', 'full_name'],
    ['Full Name', 'full_name'],
  ])('maps "%s" to %s', (header, expected) => {
    expect(suggestColumnMapping([header])[0].targetField).toBe(expected);
  });

  it('prefers the more specific first_name/last_name match over the bare "name" full_name rule', () => {
    const [first, last] = suggestColumnMapping(['First Name', 'Last Name']);
    expect(first.targetField).toBe('first_name');
    expect(last.targetField).toBe('last_name');
  });

  it('leaves an unrecognized header unmapped, never guessing a target', () => {
    const [result] = suggestColumnMapping(['Internal Reference Code']);
    expect(result.targetField).toBeNull();
  });

  it('is case-insensitive and tolerant of underscores/hyphens', () => {
    expect(suggestColumnMapping(['date_of_birth'])[0].targetField).toBe('date_of_birth');
    expect(suggestColumnMapping(['DATE-OF-BIRTH'])[0].targetField).toBe('date_of_birth');
  });

  it('returns one mapping entry per header, preserving order', () => {
    const result = suggestColumnMapping(['Name', 'Phone', 'Unknown Column']);
    expect(result.map((r) => r.sourceColumn)).toEqual(['Name', 'Phone', 'Unknown Column']);
  });
});
