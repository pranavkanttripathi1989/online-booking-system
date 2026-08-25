import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// REQ031 (US-INS-01/03, P1 scope) — Payers is global reference data (no
// org filter at all); PayerEmpanelments/PatientInsurancePolicies are the
// genuinely tenant-scoped half, which is what this spec focuses on.
describe('InsuranceService', () => {
  let service: InsuranceService;
  let prisma: {
    payers: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock };
    payerEmpanelments: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    patientInsurancePolicies: { findMany: jest.Mock; create: jest.Mock };
    clinics: { findUnique: jest.Mock };
    payerTariffs: { findMany: jest.Mock; upsert: jest.Mock; findUnique: jest.Mock };
    products: { findUnique: jest.Mock };
    patients: { findUnique: jest.Mock };
  };
  let patientsService: { ownAndDependantPatientIds: jest.Mock };

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const clinicA = { id: 'clinic-a', client_org_id: 'org-a', is_deleted: false };
  const clinicB = { id: 'clinic-b', client_org_id: 'org-b', is_deleted: false };

  beforeEach(async () => {
    prisma = {
      payers: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
      payerEmpanelments: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      patientInsurancePolicies: { findMany: jest.fn(), create: jest.fn() },
      clinics: { findUnique: jest.fn() },
      payerTariffs: { findMany: jest.fn(), upsert: jest.fn(), findUnique: jest.fn() },
      products: { findUnique: jest.fn() },
      patients: { findUnique: jest.fn() },
    };
    patientsService = { ownAndDependantPatientIds: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsuranceService,
        { provide: PrismaService, useValue: prisma },
        { provide: PatientsService, useValue: patientsService },
      ],
    }).compile();
    service = module.get(InsuranceService);
  });

  it('findPayers applies no org filter at all — a global directory', async () => {
    prisma.payers.findMany.mockResolvedValue([]);
    await service.findPayers(undefined);
    expect(prisma.payers.findMany).toHaveBeenCalledWith({ where: {}, orderBy: { name: 'asc' } });
  });

  describe('createEmpanelment — Hard Rule 6', () => {
    it('rejects an unknown payer_id', async () => {
      prisma.payers.findUnique.mockResolvedValue(null);
      await expect(
        service.createEmpanelment({ payer_id: 'nope', clinic_id: 'clinic-a', start_date: '2026-01-01' } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a clinic_id belonging to a different org', async () => {
      prisma.payers.findUnique.mockResolvedValue({ id: 'payer-1' });
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      await expect(
        service.createEmpanelment({ payer_id: 'payer-1', clinic_id: 'clinic-b', start_date: '2026-01-01' } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('stamps client_org_id from the validated clinic', async () => {
      prisma.payers.findUnique.mockResolvedValue({ id: 'payer-1' });
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.payerEmpanelments.create.mockResolvedValue({ id: 'emp-1' });
      await service.createEmpanelment({ payer_id: 'payer-1', clinic_id: 'clinic-a', start_date: '2026-01-01' } as any, orgAUser);
      expect(prisma.payerEmpanelments.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ client_org_id: 'org-a' }) }),
      );
    });
  });

  it('rejects updating the status of a cross-org empanelment', async () => {
    prisma.payerEmpanelments.findUnique.mockResolvedValue({ id: 'emp-b', client_org_id: 'org-b' });
    await expect(
      service.updateEmpanelmentStatus('emp-b', { status: 'blacklisted' } as any, orgAUser),
    ).rejects.toThrow(NotFoundException);
  });

  describe('findPolicies / createPolicy — patient self-scope', () => {
    it('rejects a patient caller reading an arbitrary patient_id policy list', async () => {
      const patientCaller = { sub: 'u2', roles: ['patient'], client_org_id: 'org-a', patient_id: 'self', clinician_id: null } as JwtPayload;
      patientsService.ownAndDependantPatientIds.mockResolvedValue(['self']);
      await expect(service.findPolicies('someone-else', patientCaller)).rejects.toThrow(BadRequestException);
    });

    it('rejects an unknown payer_id on policy creation', async () => {
      prisma.payers.findUnique.mockResolvedValue(null);
      await expect(
        service.createPolicy({ patient_id: 'p1', payer_id: 'nope', policy_number: 'X', policy_holder_name: 'X', valid_from: '2026-01-01' } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // REQ031 (US-INS-02) — payer-specific tariff master data, deliberately
  // not wired into billing yet (see PayerTariffs' own schema comment).
  describe('findTariffs / setPayerTariff', () => {
    it('scopes findTariffs to the caller org', async () => {
      prisma.payerTariffs.findMany.mockResolvedValue([]);
      await service.findTariffs(undefined, undefined, orgAUser);
      expect(prisma.payerTariffs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ client_org_id: 'org-a' }) }),
      );
    });

    it('converts tariff_price from paise to rupees and flattens the product name', async () => {
      prisma.payerTariffs.findMany.mockResolvedValue([
        { id: 't1', payer_id: 'payer-1', product_id: 'prod-1', tariff_price: 45000, updated_at: new Date(), payer: { id: 'payer-1', name: 'Star Health' }, product: { id: 'prod-1', name: 'GP Consultation' } },
      ]);
      const [result] = await service.findTariffs(undefined, undefined, orgAUser);
      expect(result.tariff_price).toBe(450);
      expect(result.product_name).toBe('GP Consultation');
      expect(result.payer.name).toBe('Star Health');
    });

    it('rejects an unknown payer_id on setPayerTariff', async () => {
      prisma.payers.findUnique.mockResolvedValue(null);
      await expect(
        service.setPayerTariff({ payer_id: 'nope', product_id: 'prod-1', tariff_price: 500 } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a cross-org product on setPayerTariff (Hard Rule 6)', async () => {
      prisma.payers.findUnique.mockResolvedValue({ id: 'payer-1', name: 'Star Health' });
      prisma.products.findUnique.mockResolvedValue({ id: 'prod-b', client_org_id: 'org-b', is_deleted: false });
      await expect(
        service.setPayerTariff({ payer_id: 'payer-1', product_id: 'prod-b', tariff_price: 500 } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.payerTariffs.upsert).not.toHaveBeenCalled();
    });

    it('upserts a tariff, converting rupees to paise', async () => {
      prisma.payers.findUnique.mockResolvedValue({ id: 'payer-1', name: 'Star Health' });
      prisma.products.findUnique.mockResolvedValue({ id: 'prod-1', client_org_id: 'org-a', is_deleted: false });
      prisma.payerTariffs.upsert.mockResolvedValue({
        id: 't1', payer_id: 'payer-1', product_id: 'prod-1', tariff_price: 45000, updated_at: new Date(),
        payer: { id: 'payer-1', name: 'Star Health' }, product: { id: 'prod-1', name: 'GP Consultation' },
      });
      const result = await service.setPayerTariff({ payer_id: 'payer-1', product_id: 'prod-1', tariff_price: 450 } as any, orgAUser);
      expect(prisma.payerTariffs.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { payer_id_product_id: { payer_id: 'payer-1', product_id: 'prod-1' } },
          create: expect.objectContaining({ tariff_price: 45000, client_org_id: 'org-a' }),
          update: { tariff_price: 45000 },
        }),
      );
      expect(result.tariff_price).toBe(450);
    });
  });

  // REQ100
  describe('estimatedPayerCharge', () => {
    it('returns the tariff amount when one exists, has_tariff true', async () => {
      prisma.products.findUnique.mockResolvedValue({ id: 'prod-1', client_org_id: 'org-a', is_deleted: false, price: 50000 });
      prisma.payers.findUnique.mockResolvedValue({ id: 'payer-1', name: 'Star Health' });
      prisma.payerTariffs.findUnique.mockResolvedValue({ tariff_price: 20000 });
      const result = await service.estimatedPayerCharge('prod-1', 'payer-1', undefined, orgAUser);
      expect(result).toEqual({ amount: 200, has_tariff: true });
    });

    it('falls through to the base/category price when no tariff exists, has_tariff false', async () => {
      prisma.products.findUnique.mockResolvedValue({ id: 'prod-1', client_org_id: 'org-a', is_deleted: false, price: 50000 });
      prisma.payers.findUnique.mockResolvedValue({ id: 'payer-1', name: 'Star Health' });
      prisma.payerTariffs.findUnique.mockResolvedValue(null);
      const result = await service.estimatedPayerCharge('prod-1', 'payer-1', undefined, orgAUser);
      expect(result).toEqual({ amount: 500, has_tariff: false });
    });

    it('rejects a cross-org product', async () => {
      prisma.products.findUnique.mockResolvedValue({ id: 'prod-1', client_org_id: 'org-b', is_deleted: false });
      await expect(service.estimatedPayerCharge('prod-1', 'payer-1', undefined, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects an unknown payer', async () => {
      prisma.products.findUnique.mockResolvedValue({ id: 'prod-1', client_org_id: 'org-a', is_deleted: false, price: 50000 });
      prisma.payers.findUnique.mockResolvedValue(null);
      await expect(service.estimatedPayerCharge('prod-1', 'payer-999', undefined, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects a patient-role caller passing someone else\'s patientId', async () => {
      const patientUser: JwtPayload = { sub: 'u2', roles: ['patient'], client_org_id: 'org-a', patient_id: 'own-patient', clinician_id: null } as JwtPayload;
      prisma.products.findUnique.mockResolvedValue({ id: 'prod-1', client_org_id: 'org-a', is_deleted: false, price: 50000 });
      prisma.payers.findUnique.mockResolvedValue({ id: 'payer-1', name: 'Star Health' });
      patientsService.ownAndDependantPatientIds.mockResolvedValue(['own-patient']);
      await expect(service.estimatedPayerCharge('prod-1', 'payer-1', 'someone-elses-patient', patientUser)).rejects.toThrow(BadRequestException);
    });
  });
});
