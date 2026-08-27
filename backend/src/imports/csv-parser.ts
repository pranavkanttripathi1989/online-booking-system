// P2-05 — a minimal, dependency-free RFC-4180-shaped CSV parser. Hand-
// rolled rather than a new dependency: this codebase's own established
// preference is a pure, fully unit-testable module for a well-contained
// problem (see coding-suggestion.ts, denial-classification.ts,
// appeal-draft.ts) over adding a package for something this bounded.
// Handles quoted fields (embedded commas, embedded newlines, escaped ""
// within a quoted field), CRLF and LF line endings, and a trailing blank
// line. Does not support every RFC-4180 edge case (e.g. a BOM is not
// stripped) — real-world exports from competitor EMRs are the actual
// target, not full spec conformance.

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export function parseCsv(content: string): ParsedCsv {
  const records = parseRecords(content);
  if (records.length === 0) return { headers: [], rows: [] };
  const [headers, ...rows] = records;
  return { headers: headers.map((h) => h.trim()), rows };
}

function parseRecords(content: string): string[][] {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;
  let i = 0;
  const len = content.length;

  const endField = () => {
    record.push(field);
    field = '';
  };
  const endRecord = () => {
    endField();
    // Skip a fully-empty trailing record (a trailing newline, or a blank
    // line in the middle of the file) rather than emitting a phantom row.
    if (!(record.length === 1 && record[0] === '')) records.push(record);
    record = [];
  };

  while (i < len) {
    const char = content[i];
    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ',') {
      endField();
      i++;
      continue;
    }
    if (char === '\r') {
      // Lookahead for \r\n; a bare \r alone still ends the record.
      if (content[i + 1] === '\n') i++;
      endRecord();
      i++;
      continue;
    }
    if (char === '\n') {
      endRecord();
      i++;
      continue;
    }
    field += char;
    i++;
  }
  // Final field/record if the content didn't end with a newline.
  if (field.length > 0 || record.length > 0) endRecord();

  return records;
}
