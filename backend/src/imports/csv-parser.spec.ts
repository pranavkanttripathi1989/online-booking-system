import { parseCsv } from './csv-parser';

describe('parseCsv (P2-05)', () => {
  it('parses headers and rows from a simple CSV', () => {
    const result = parseCsv('name,phone\nAnita Sharma,9876543210\nRahul Verma,9123456780\n');
    expect(result.headers).toEqual(['name', 'phone']);
    expect(result.rows).toEqual([
      ['Anita Sharma', '9876543210'],
      ['Rahul Verma', '9123456780'],
    ]);
  });

  it('handles CRLF line endings identically to LF', () => {
    const result = parseCsv('name,phone\r\nAnita Sharma,9876543210\r\n');
    expect(result.rows).toEqual([['Anita Sharma', '9876543210']]);
  });

  it('handles a quoted field containing a comma', () => {
    const result = parseCsv('name,address\n"Sharma, Anita","123 MG Road, Bangalore"\n');
    expect(result.rows).toEqual([['Sharma, Anita', '123 MG Road, Bangalore']]);
  });

  it('handles a quoted field containing an embedded newline', () => {
    const result = parseCsv('name,notes\n"Anita Sharma","Line one\nLine two"\n');
    expect(result.rows).toEqual([['Anita Sharma', 'Line one\nLine two']]);
  });

  it('unescapes a doubled quote inside a quoted field', () => {
    const result = parseCsv('name,notes\n"Anita","She said ""hello"""\n');
    expect(result.rows).toEqual([['Anita', 'She said "hello"']]);
  });

  it('does not emit a phantom trailing row for a trailing newline', () => {
    const result = parseCsv('name,phone\nAnita,9876543210\n\n');
    expect(result.rows).toHaveLength(1);
  });

  it('parses a file with no trailing newline at all', () => {
    const result = parseCsv('name,phone\nAnita,9876543210');
    expect(result.rows).toEqual([['Anita', '9876543210']]);
  });

  it('returns empty headers and rows for empty content', () => {
    expect(parseCsv('')).toEqual({ headers: [], rows: [] });
  });

  it('trims whitespace from header names but preserves it in row values', () => {
    const result = parseCsv(' name , phone \nAnita, 9876543210\n');
    expect(result.headers).toEqual(['name', 'phone']);
    expect(result.rows[0][1]).toBe(' 9876543210');
  });

  it('preserves an empty cell as an empty string, not undefined', () => {
    const result = parseCsv('name,email,phone\nAnita,,9876543210\n');
    expect(result.rows[0]).toEqual(['Anita', '', '9876543210']);
  });
});
