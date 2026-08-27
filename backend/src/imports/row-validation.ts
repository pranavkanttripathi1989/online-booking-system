import { ImportTargetField } from './column-mapping';

// P2-05 — maps one parsed CSV row into a candidate Patients record and
// validates it against PatientInput's own real contract (Hard Rule 7:
// match the existing contract, don't invent a relaxed one) --
// first_name/last_name/email/phone/date_of_birth are all required
// there, so they are required here too, not a looser import-specific
// rule. A row failing validation is never silently dropped or coerced
// -- it is reported back with the exact reason, one row at a time.

export interface ColumnMapping {
  sourceColumn: string;
  targetField: ImportTargetField;
}

export interface MappedPatientCandidate {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  address?: string;
  date_of_birth?: string; // ISO date string once validated
  medical_notes?: string;
}

export interface RowValidationResult {
  valid: boolean;
  errors: string[];
  candidate: MappedPatientCandidate;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function splitFullName(fullName: string): { first_name: string; last_name: string } {
  const trimmed = fullName.trim().replace(/\s+/g, ' ');
  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) return { first_name: trimmed, last_name: '' };
  return { first_name: trimmed.slice(0, spaceIndex), last_name: trimmed.slice(spaceIndex + 1) };
}

function isValidDate(value: string): boolean {
  if (!value.trim()) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

// Maps one row (aligned to `headers`, per column-mapping's own
// sourceColumn) into a candidate record -- no validation here, a pure
// reshape. `full_name`, if mapped, is split into first_name/last_name;
// an explicit first_name/last_name mapping (if also present) wins over
// a full_name split for that same field, since it is the more specific
// signal.
export function mapRow(headers: string[], row: string[], mapping: ColumnMapping[]): MappedPatientCandidate {
  const candidate: MappedPatientCandidate = {};
  for (const { sourceColumn, targetField } of mapping) {
    const columnIndex = headers.indexOf(sourceColumn);
    if (columnIndex === -1) continue;
    const value = (row[columnIndex] ?? '').trim();
    if (!value) continue;
    if (targetField === 'full_name') {
      const split = splitFullName(value);
      candidate.first_name = candidate.first_name ?? split.first_name;
      candidate.last_name = candidate.last_name ?? split.last_name;
    } else {
      (candidate as Record<string, string>)[targetField] = value;
    }
  }
  return candidate;
}

export function validateCandidate(candidate: MappedPatientCandidate): RowValidationResult {
  const errors: string[] = [];
  if (!candidate.first_name) errors.push('first_name is required');
  if (!candidate.last_name) errors.push('last_name is required');
  if (!candidate.email) errors.push('email is required');
  else if (!EMAIL_PATTERN.test(candidate.email)) errors.push(`"${candidate.email}" is not a valid email address`);
  if (!candidate.phone) errors.push('phone is required');
  if (!candidate.date_of_birth) errors.push('date_of_birth is required');
  else if (!isValidDate(candidate.date_of_birth)) errors.push(`"${candidate.date_of_birth}" is not a valid date`);

  return { valid: errors.length === 0, errors, candidate };
}
