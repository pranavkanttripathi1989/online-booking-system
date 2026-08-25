import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConsentService } from './consent.service';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// REQ034 — the behaviour under test that matters most: a 'patient'-role
// caller can only act on their own record or a genuine dependant's (Hard
// Rule 6's bug class), and RightsRequests never auto-resolves — it's a
// queued request an admin must explicitly act on.
describe('ConsentService', () => {
  let service: ConsentService;
  let prisma: {
    consents: { findMany: jest.Mock; create: jest.Mock };
    rightsRequests: { findMany: jest.Mock; create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    retentionPolicies: { findMany: jest.Mock; upsert: jest.Mock };
  };
  let patientsService: { ownAndDependantPatientIds: jest.Mock };

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const patientCaller: JwtPayload = { sub: 'u2', roles: ['patient'], client_org_id: 'org-a', patient_id: 'patient-self', clinician_id: null } as JwtPayload;
  const platformAdmin: JwtPayload = { sub: 'u3', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  beforeEach(async () => {
    prisma = {
      consents: { findMany: jest.fn(), create: jest.fn() },
      rightsRequests: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      retentionPolicies: { findMany: jest.fn(), upsert: jest.fn() },
    };
    patientsService = { ownAndDependantPatientIds: jest.fn().mockResolvedValue(['patient-self', 'patient-dependant']) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentService,
        { provide: PrismaService, useValue: prisma },
        { provide: PatientsService, useValue: patientsService },
      ],
    }).compile();
    service = module.get(ConsentService);
  });

  describe('assertPatientAccessible (via updateConsent)', () => {
    it('rejects a patient caller acting on an arbitrary patient_id', async () => {
      await expect(
        service.updateConsent({ patient_id: 'someone-elses-record', purpose: 'treatment', granted: true } as any, patientCaller),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.consents.create).not.toHaveBeenCalled();
    });

    it('allows a patient caller acting on their own record', async () => {
      prisma.consents.create.mockResolvedValue({ id: 'c1' });
      await service.updateConsent({ patient_id: 'patient-self', purpose: 'treatment', granted: true } as any, patientCaller);
      expect(prisma.consents.create).toHaveBeenCalled();
    });

    it('allows a patient caller acting on a genuine dependant', async () => {
      prisma.consents.create.mockResolvedValue({ id: 'c1' });
      await service.updateConsent({ patient_id: 'patient-dependant', purpose: 'treatment', granted: true } as any, patientCaller);
      expect(prisma.consents.create).toHaveBeenCalled();
    });
  });

  it('records a revoked_at timestamp when granted is false, none when true', async () => {
    prisma.consents.create.mockResolvedValue({ id: 'c1' });
    await service.updateConsent({ patient_id: 'p1', purpose: 'marketing', granted: false } as any, orgAUser);
    expect(prisma.consents.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ granted: false, revoked_at: expect.any(Date) }) }),
    );
  });

  it('requestDataRights sets an SLA due date in the future, status defaults to pending (schema default)', async () => {
    prisma.rightsRequests.create.mockResolvedValue({ id: 'r1' });
    await service.requestDataRights({ patient_id: 'p1', type: 'erasure' } as any, orgAUser);
    const call = prisma.rightsRequests.create.mock.calls[0][0];
    expect(call.data.sla_due_at.getTime()).toBeGreaterThan(Date.now());
    expect(call.data).not.toHaveProperty('status'); // left to the schema default 'pending'
  });

  describe('resolveRightsRequest — never an automated erasure, only a status change', () => {
    it('rejects resolving a cross-org request', async () => {
      prisma.rightsRequests.findUnique.mockResolvedValue({ id: 'r1', client_org_id: 'org-b' });
      await expect(
        service.resolveRightsRequest('r1', { status: 'approved' } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.rightsRequests.update).not.toHaveBeenCalled();
    });

    it('stamps resolved_at/resolved_by_user_id and the new status only', async () => {
      prisma.rightsRequests.findUnique.mockResolvedValue({ id: 'r1', client_org_id: 'org-a', notes: null });
      prisma.rightsRequests.update.mockResolvedValue({ id: 'r1', status: 'completed' });
      await service.resolveRightsRequest('r1', { status: 'completed', notes: 'Exported and emailed' } as any, orgAUser);
      expect(prisma.rightsRequests.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { status: 'completed', notes: 'Exported and emailed', resolved_at: expect.any(Date), resolved_by_user_id: 'u1' },
      });
    });
  });

  // REQ034 (US-DPDP-06) — retention policies, master data only; the actual
  // purge is a separate cron job (retention-purge.service.spec.ts).
  describe('findRetentionPolicies / setRetentionPolicy', () => {
    it('scopes findRetentionPolicies to the caller org', async () => {
      prisma.retentionPolicies.findMany.mockResolvedValue([]);
      await service.findRetentionPolicies(orgAUser);
      expect(prisma.retentionPolicies.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { client_org_id: 'org-a' } }),
      );
    });

    it('rejects a platform operator with no org of their own', async () => {
      await expect(
        service.setRetentionPolicy({ data_class: 'test_results', retention_years: 5 } as any, platformAdmin),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.retentionPolicies.upsert).not.toHaveBeenCalled();
    });

    it('upserts on the client_org_id + data_class composite key, defaulting legal_hold to false', async () => {
      prisma.retentionPolicies.upsert.mockResolvedValue({ id: 'rp-1' });
      await service.setRetentionPolicy({ data_class: 'test_results', retention_years: 5 } as any, orgAUser);
      expect(prisma.retentionPolicies.upsert).toHaveBeenCalledWith({
        where: { client_org_id_data_class: { client_org_id: 'org-a', data_class: 'test_results' } },
        create: { client_org_id: 'org-a', data_class: 'test_results', retention_years: 5, legal_hold: false },
        update: { retention_years: 5, legal_hold: false },
      });
    });

    it('honors an explicit legal_hold: true', async () => {
      prisma.retentionPolicies.upsert.mockResolvedValue({ id: 'rp-1' });
      await service.setRetentionPolicy({ data_class: 'test_results', retention_years: 10, legal_hold: true } as any, orgAUser);
      expect(prisma.retentionPolicies.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ legal_hold: true }),
          update: expect.objectContaining({ legal_hold: true }),
        }),
      );
    });
  });
});
