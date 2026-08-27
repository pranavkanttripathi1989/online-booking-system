import { mapRow, validateCandidate } from './row-validation';

describe('mapRow (P2-05)', () => {
  const headers = ['Full Name', 'Email', 'Phone', 'DOB'];
  const mapping = [
    { sourceColumn: 'Full Name', targetField: 'full_name' as const },
    { sourceColumn: 'Email', targetField: 'email' as const },
    { sourceColumn: 'Phone', targetField: 'phone' as const },
    { sourceColumn: 'DOB', targetField: 'date_of_birth' as const },
  ];

  it('splits a mapped full_name column into first_name/last_name', () => {
    const candidate = mapRow(headers, ['Anita Sharma', 'anita@example.com', '9876543210', '1990-01-01'], mapping);
    expect(candidate.first_name).toBe('Anita');
    expect(candidate.last_name).toBe('Sharma');
  });

  it('handles a single-word full name with an empty last_name, not a crash', () => {
    const candidate = mapRow(headers, ['Anita', 'anita@example.com', '9876543210', '1990-01-01'], mapping);
    expect(candidate.first_name).toBe('Anita');
    expect(candidate.last_name).toBe('');
  });

  it('joins a multi-word surname into last_name, not truncating at the first space', () => {
    const candidate = mapRow(headers, ['Anita Sharma Verma', 'a@example.com', '9876543210', '1990-01-01'], mapping);
    expect(candidate.first_name).toBe('Anita');
    expect(candidate.last_name).toBe('Sharma Verma');
  });

  it('leaves a target unset when its source cell is empty, rather than an empty string', () => {
    const candidate = mapRow(headers, ['Anita Sharma', '', '9876543210', '1990-01-01'], mapping);
    expect(candidate.email).toBeUndefined();
  });

  it('ignores a mapping entry whose source column is not in the real headers', () => {
    const badMapping = [...mapping, { sourceColumn: 'Nonexistent', targetField: 'gender' as const }];
    const candidate = mapRow(headers, ['Anita Sharma', 'a@example.com', '9876543210', '1990-01-01'], badMapping);
    expect(candidate.gender).toBeUndefined();
  });

  it('an explicit first_name mapping wins over a same-row full_name split', () => {
    const dualMapping = [{ sourceColumn: 'First', targetField: 'first_name' as const }, ...mapping];
    const dualHeaders = ['First', ...headers];
    const candidate = mapRow(dualHeaders, ['Explicit', 'Anita Sharma', 'a@example.com', '9876543210', '1990-01-01'], dualMapping);
    expect(candidate.first_name).toBe('Explicit');
  });
});

describe('validateCandidate (P2-05)', () => {
  const validCandidate = {
    first_name: 'Anita',
    last_name: 'Sharma',
    email: 'anita@example.com',
    phone: '9876543210',
    date_of_birth: '1990-01-01',
  };

  it('accepts a fully-populated, correctly-shaped candidate', () => {
    const result = validateCandidate(validCandidate);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it.each([
    ['first_name', { ...validCandidate, first_name: undefined }, 'first_name is required'],
    ['last_name', { ...validCandidate, last_name: undefined }, 'last_name is required'],
    ['email (missing)', { ...validCandidate, email: undefined }, 'email is required'],
    ['phone', { ...validCandidate, phone: undefined }, 'phone is required'],
    ['date_of_birth (missing)', { ...validCandidate, date_of_birth: undefined }, 'date_of_birth is required'],
  ])('rejects a candidate missing %s', (_label, candidate, expectedError) => {
    const result = validateCandidate(candidate);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(expectedError);
  });

  it('rejects a malformed email, matching PatientInput\'s own @IsEmail() contract', () => {
    const result = validateCandidate({ ...validCandidate, email: 'not-an-email' });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/not a valid email/);
  });

  it('rejects an unparseable date of birth', () => {
    const result = validateCandidate({ ...validCandidate, date_of_birth: 'not-a-date' });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/not a valid date/);
  });

  it('reports every violated rule at once, not just the first', () => {
    const result = validateCandidate({});
    expect(result.errors).toHaveLength(5);
  });
});
