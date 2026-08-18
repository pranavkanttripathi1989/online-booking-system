import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CliniciansService } from './clinicians.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Security regression coverage: create() previously never validated the
// target clinic against the caller's org -- only update() did (via
// findOne()'s existing-record lookup). A manager could create a clinician
// record attributed to a DIFFERENT organization's clinic.
describe('CliniciansService — create-path org scoping', () => {
  let service: CliniciansService;
  let prisma: {
    clinics: { findUnique: jest.Mock };
    clinicians: { findUnique: jest.Mock };
    clinicianTypeModel: { findUnique: jest.Mock; findFirst: jest.Mock };
    languages: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };

  const managerSameOrg: JwtPayload = { sub: 'u-1', roles: ['manager'], client_org_id: 'org-1' } as JwtPayload;
  const orgLessAdmin: JwtPayload = { sub: 'u-2', roles: ['admin'], client_org_id: null } as JwtPayload;

  const baseInput = { first_name: 'A', last_name: 'B', email: 'a@b.com', clinic_ids: ['clinic-1'] };

  beforeEach(async () => {
    prisma = {
      clinics: { findUnique: jest.fn() },
      clinicians: { findUnique: jest.fn().mockResolvedValue({ id: 'cln-new', first_name: 'A', last_name: 'B', clinic: { client_org_id: 'org-1' } }) },
      clinicianTypeModel: { findUnique: jest.fn(), findFirst: jest.fn() },
      languages: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(async (fn) => fn({
        clinicians: { create: jest.fn().mockResolvedValue({ id: 'cln-new' }) },
        clinicianLanguages: { createMany: jest.fn() },
        clinicianServices: { createMany: jest.fn() },
      })),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [CliniciansService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(CliniciansService);
  });

  it('rejects creating a clinician for a clinic in a different org', async () => {
    prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-2' });
    await expect(service.create(baseInput as any, managerSameOrg)).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('allows creating a clinician for a clinic in the caller\'s own org', async () => {
    prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
    await expect(service.create(baseInput as any, managerSameOrg)).resolves.toBeDefined();
  });

  it('an org-less caller (admin) is not restricted', async () => {
    await expect(service.create(baseInput as any, orgLessAdmin)).resolves.toBeDefined();
    expect(prisma.clinics.findUnique).not.toHaveBeenCalled();
  });
});
