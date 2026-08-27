import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ImportsService } from './imports.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('ImportsService (P2-05)', () => {
  let service: ImportsService;
  let prisma: {
    patients: { createMany: jest.Mock };
    importJobs: { create: jest.Mock };
  };

  const orgUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const orgLessAdmin: JwtPayload = { sub: 'u2', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  const csv =
    'Full Name,Email,Phone,DOB\nAnita Sharma,anita@example.com,9876543210,1990-01-01\nBad Row,not-an-email,,\n';
  const mapping = [
    { sourceColumn: 'Full Name', targetField: 'full_name' },
    { sourceColumn: 'Email', targetField: 'email' },
    { sourceColumn: 'Phone', targetField: 'phone' },
    { sourceColumn: 'DOB', targetField: 'date_of_birth' },
  ];

  beforeEach(async () => {
    prisma = {
      patients: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      importJobs: { create: jest.fn().mockResolvedValue({ id: 'job-1' }) },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ImportsService);
  });

  describe('parseImportPreview', () => {
    it('returns real headers, a bounded sample of rows, a suggested mapping, and the real total row count', () => {
      const result = service.parseImportPreview(csv);
      expect(result.headers).toEqual(['Full Name', 'Email', 'Phone', 'DOB']);
      expect(result.totalRows).toBe(2);
      expect(result.sampleRows).toHaveLength(2);
      expect(result.suggestedMapping).toEqual(
        expect.arrayContaining([{ sourceColumn: 'Full Name', targetField: 'full_name' }]),
      );
    });

    it('caps sample rows even for a large file, never returning the whole thing', () => {
      const header = 'Full Name,Email,Phone,DOB\n';
      const bigCsv = header + Array.from({ length: 500 }, (_, i) => `Person ${i},p${i}@example.com,900000000${i},1990-01-01`).join('\n');
      const result = service.parseImportPreview(bigCsv);
      expect(result.totalRows).toBe(500);
      expect(result.sampleRows.length).toBeLessThanOrEqual(5);
    });
  });

  describe('dryRunImport', () => {
    it('classifies each row as valid or not, with correct counts', () => {
      const result = service.dryRunImport({ csvContent: csv, mapping } as any);
      expect(result.totalRows).toBe(2);
      expect(result.validRows).toBe(1);
      expect(result.errorRows).toBe(1);
    });

    it('reports the real 1-indexed row number (accounting for the header row) for an error row', () => {
      const result = service.dryRunImport({ csvContent: csv, mapping } as any);
      // Row 2 (Anita) is valid; row 3 (Bad Row) is the error.
      expect(result.rowErrors[0].rowNumber).toBe(3);
      expect(result.rowErrors[0].errors.length).toBeGreaterThan(0);
    });

    it('never writes anything to the database — a pure preview', () => {
      service.dryRunImport({ csvContent: csv, mapping } as any);
      expect(prisma.patients.createMany).not.toHaveBeenCalled();
      expect(prisma.importJobs.create).not.toHaveBeenCalled();
    });

    it('returns a sample of the real valid rows, correctly shaped', () => {
      const result = service.dryRunImport({ csvContent: csv, mapping } as any);
      expect(result.sampleValidRows).toEqual([
        expect.objectContaining({ rowNumber: 2, first_name: 'Anita', last_name: 'Sharma', email: 'anita@example.com' }),
      ]);
    });
  });

  describe('commitImport', () => {
    it('rejects an org-less platform operator rather than a raw NOT NULL violation', async () => {
      await expect(service.commitImport({ csvContent: csv, mapping } as any, orgLessAdmin)).rejects.toThrow(BadRequestException);
      expect(prisma.patients.createMany).not.toHaveBeenCalled();
    });

    it('creates only the valid rows, scoped to the caller org', async () => {
      await service.commitImport({ csvContent: csv, mapping } as any, orgUser);
      expect(prisma.patients.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            client_org_id: 'org-a',
            first_name: 'Anita',
            last_name: 'Sharma',
            email: 'anita@example.com',
            phone: '9876543210',
          }),
        ],
      });
    });

    it('skips the bulk create entirely when there are zero valid rows', async () => {
      const allBadCsv = 'Full Name,Email\nBad,not-an-email\n';
      await service.commitImport({ csvContent: allBadCsv, mapping } as any, orgUser);
      expect(prisma.patients.createMany).not.toHaveBeenCalled();
    });

    it('writes a real ImportJobs audit row with the full result', async () => {
      await service.commitImport({ csvContent: csv, mapping } as any, orgUser);
      expect(prisma.importJobs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          client_org_id: 'org-a',
          created_by_user_id: 'u1',
          total_rows: 2,
          imported_rows: 1,
          error_rows: 1,
        }),
      });
    });

    it('returns the real importJobId and result summary', async () => {
      const result = await service.commitImport({ csvContent: csv, mapping } as any, orgUser);
      expect(result).toMatchObject({ importJobId: 'job-1', totalRows: 2, importedRows: 1, errorRows: 1 });
    });

    it('runs the medical_notes AI-structuring wedge on import when a notes column is mapped', async () => {
      const notesCsv =
        'Full Name,Email,Phone,DOB,Notes\nAnita Sharma,anita@example.com,9876543210,1990-01-01,"Patient complains of fever since 3 days. On examination, throat is inflamed. Advised paracetamol and rest."\n';
      const notesMapping = [...mapping, { sourceColumn: 'Notes', targetField: 'medical_notes' }];
      await service.commitImport({ csvContent: notesCsv, mapping: notesMapping } as any, orgUser);
      const created = prisma.patients.createMany.mock.calls[0][0].data[0];
      expect(created.medical_notes).toMatch(/\[(History|Complaints)\]/);
    });

    it('never fabricates a medical_notes value for a row with no notes column mapped', async () => {
      await service.commitImport({ csvContent: csv, mapping } as any, orgUser);
      const created = prisma.patients.createMany.mock.calls[0][0].data[0];
      expect(created.medical_notes).toBe('');
    });
  });
});
