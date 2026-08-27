import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgIdForWrite } from '../common/scoping/tenant-scope';
import { parseCsv } from './csv-parser';
import { suggestColumnMapping } from './column-mapping';
import { mapRow, validateCandidate, ColumnMapping } from './row-validation';
import { structureImportedNotes } from './structure-notes';
import { DryRunImportInput, CommitImportInput } from './dto/imports.input';

// A per-response cap: a genuinely bad file (wrong file entirely, header
// row misread as data) could have thousands of error rows -- reporting
// every one back over GraphQL would be both slow and useless past the
// first screenful. totalRows/errorRows still reflect the real full
// count; only the itemized list is capped.
const MAX_REPORTED_ROW_ERRORS = 100;
const MAX_SAMPLE_ROWS = 5;

// P2-05 — CSV/Excel migration importer (Excel: the frontend converts a
// worksheet to CSV client-side before upload; this service only ever
// sees CSV text, one parsing implementation shared by preview/dry-run/
// commit, matching this codebase's own "reuse, don't re-derive" ethic).
// Deliberately scoped to Patients only this slice -- appointments/
// encounters import needs a real Clinic/Clinician/Service mapping step
// of its own, logged as a named follow-on rather than half-built here.
@Injectable()
export class ImportsService {
  constructor(private readonly prisma: PrismaService) {}

  parseImportPreview(csvContent: string) {
    const { headers, rows } = parseCsv(csvContent);
    return {
      headers,
      sampleRows: rows.slice(0, MAX_SAMPLE_ROWS).map((values) => ({ values })),
      suggestedMapping: suggestColumnMapping(headers),
      totalRows: rows.length,
    };
  }

  // Shared by dryRunImport/commitImport -- both must validate against
  // the SAME freshly-parsed content and mapping; commit never trusts a
  // client-supplied "this was already validated" flag (Hard Rule: match
  // the existing contract, re-derive nothing from an untrusted claim).
  private mapAndValidateRows(csvContent: string, mapping: ColumnMapping[]) {
    const { headers, rows } = parseCsv(csvContent);
    return rows.map((row) => {
      const candidate = mapRow(headers, row, mapping);
      return validateCandidate(candidate);
    });
  }

  dryRunImport(input: DryRunImportInput) {
    // +2: 1-indexed, plus the header row itself -- the row number a
    // human editing the real source file in a spreadsheet would see.
    const numbered = this.mapAndValidateRows(input.csvContent, input.mapping as ColumnMapping[]).map((r, index) => ({
      rowNumber: index + 2,
      ...r,
    }));
    const validRows = numbered.filter((r) => r.valid);
    const errorRows = numbered.filter((r) => !r.valid);

    return {
      totalRows: numbered.length,
      validRows: validRows.length,
      errorRows: errorRows.length,
      rowErrors: errorRows.slice(0, MAX_REPORTED_ROW_ERRORS).map(({ rowNumber, errors }) => ({ rowNumber, errors })),
      sampleValidRows: validRows.slice(0, MAX_SAMPLE_ROWS).map(({ rowNumber, candidate }) => ({
        rowNumber,
        first_name: candidate.first_name!,
        last_name: candidate.last_name!,
        email: candidate.email!,
        phone: candidate.phone!,
        date_of_birth: candidate.date_of_birth,
      })),
    };
  }

  async commitImport(input: CommitImportInput, user: JwtPayload) {
    const numbered = this.mapAndValidateRows(input.csvContent, input.mapping as ColumnMapping[]).map((r, index) => ({
      rowNumber: index + 2,
      ...r,
    }));
    const validRows = numbered.filter((r) => r.valid);
    const errorRows = numbered.filter((r) => !r.valid);
    const orgId = orgIdForWrite(user, 'ImportJob');
    // orgIdForWrite returns undefined only for a true org-less platform
    // operator (admin/super_admin with no client_org_id of their own) --
    // reject explicitly rather than let a required-column NOT NULL
    // violation surface as a raw Prisma error, the same bug class
    // tasks.service.ts's own create() already documents and guards
    // against.
    if (!orgId) {
      throw new BadRequestException('Select an organization before importing patients');
    }

    if (validRows.length > 0) {
      await this.prisma.patients.createMany({
        data: validRows.map(({ candidate }) => ({
          client_org_id: orgId,
          first_name: candidate.first_name!,
          last_name: candidate.last_name!,
          email: candidate.email!,
          phone: candidate.phone!,
          date_of_birth: new Date(candidate.date_of_birth!),
          gender: candidate.gender,
          address: candidate.address ?? '',
          // P2-05's own AI wedge -- see structure-notes.ts.
          medical_notes: candidate.medical_notes ? structureImportedNotes(candidate.medical_notes) : '',
        })),
      });
    }

    const allRowErrors = errorRows.map(({ rowNumber, errors }) => ({ rowNumber, errors }));

    const job = await this.prisma.importJobs.create({
      data: {
        client_org_id: orgId,
        created_by_user_id: user.sub,
        total_rows: numbered.length,
        imported_rows: validRows.length,
        error_rows: errorRows.length,
        // Full list persisted (not the display cap) -- an admin
        // reviewing a past job's own record should see everything that
        // went wrong, even if a single GraphQL response never does.
        row_errors_json: allRowErrors as any,
      },
    });

    return {
      importJobId: job.id,
      totalRows: numbered.length,
      importedRows: validRows.length,
      errorRows: errorRows.length,
      rowErrors: allRowErrors.slice(0, MAX_REPORTED_ROW_ERRORS),
    };
  }
}
