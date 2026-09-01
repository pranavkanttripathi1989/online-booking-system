import { PrismaService } from '../../prisma/prisma.service';

/**
 * Shared, gapless document numbering.
 *
 * REQ179 (IPD slice 1) extracted this from two places that had already
 * duplicated `financialYearFor` verbatim — `appointment-payments.service.ts`
 * and `platform-billing.service.ts` — rather than adding a third copy for
 * IPD's own `ADM`/`MLC` series. Both original call sites now delegate here.
 */

/**
 * Indian financial year: April 1 – March 31. A document raised in Jan–Mar 2027
 * belongs to FY "2026-27", not "2027-28".
 *
 * @param date the document date
 * @returns the FY label, e.g. `"2026-27"`
 */
export function financialYearFor(date: Date): string {
  const month = date.getMonth() + 1; // 1-12
  const startYear = month >= 4 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

/**
 * The document-number series this codebase issues. `InvoiceSequences` is keyed
 * `@@unique([clinic_id, series, financial_year])`, so each series gets its own
 * independent counter per clinic per FY — an IPD bill never shares a counter
 * with an OPD invoice.
 */
export const DOCUMENT_SERIES = {
  /** OPD appointment invoice (the original, pre-existing series). */
  APPOINTMENT_INVOICE: 'APPT',
  /** IPD admission number. */
  ADMISSION: 'ADM',
  /** Medico-legal case register number. */
  MLC: 'MLC',
  /** IPD final bill number (slice 4). */
  IPD_BILL: 'IPD',
  /** IPD payment receipt (slice 4). */
  IPD_RECEIPT: 'IPDR',
  /** Insurance pre-authorization (slice 5). */
  PRE_AUTH: 'PA',
  /** IPD insurance claim (slice 5). */
  IPD_CLAIM: 'IPC',
} as const;

export type DocumentSeries = (typeof DOCUMENT_SERIES)[keyof typeof DOCUMENT_SERIES];

/**
 * Reserve the next number in a clinic's per-series, per-financial-year
 * sequence.
 *
 * Gaplessness comes from the atomic `upsert` + `increment` on
 * `InvoiceSequences`, not from counting existing documents — two concurrent
 * callers cannot receive the same number. Call this **inside** the same
 * transaction as the row it numbers, so a rolled-back document does not burn a
 * number.
 *
 * @param prisma a PrismaService, or a transaction client from `$transaction`
 * @param clinicId the issuing clinic
 * @param series one of {@link DOCUMENT_SERIES}
 * @param prefix leading token of the formatted number (default `'INV'`)
 * @param now the document date, for FY resolution (default: current time)
 * @returns e.g. `"ADM/2026-27/A1B2C3D4/00042"`
 */
export async function nextDocumentNumber(
  prisma: PrismaService | Pick<PrismaService, 'invoiceSequences'>,
  clinicId: string,
  series: string,
  prefix = 'INV',
  now: Date = new Date(),
): Promise<string> {
  const financialYear = financialYearFor(now);
  const sequence = await prisma.invoiceSequences.upsert({
    where: { clinic_id_series_financial_year: { clinic_id: clinicId, series, financial_year: financialYear } },
    create: { clinic_id: clinicId, series, financial_year: financialYear, last_number: 1 },
    update: { last_number: { increment: 1 } },
  });
  return `${prefix}/${financialYear}/${clinicId.slice(0, 8).toUpperCase()}/${String(sequence.last_number).padStart(5, '0')}`;
}
