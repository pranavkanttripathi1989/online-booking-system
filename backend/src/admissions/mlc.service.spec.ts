import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { MlcService } from './mlc.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('MlcService', () => {
  let service: MlcService;
  let prisma: any;

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const orgBUser: JwtPayload = { sub: 'u2', roles: ['manager'], client_org_id: 'org-b', patient_id: null, clinician_id: null } as JwtPayload;

  const admissionA = { id: 'adm-a', client_org_id: 'org-a', clinic_id: 'clinic-a', is_deleted: false, mlc: null };
  const clinicianA = { id: 'clin-a', is_deleted: false, clinic: { client_org_id: 'org-a' } };

  const registerRow = {
    id: 'mlc-1',
    client_org_id: 'org-a',
    clinic_id: 'clinic-a',
    admission_id: 'adm-a',
    mlc_number: 'MLC/2026-27/CLINICA/00001',
    mlc_category: 'road_accident',
    identification_mark_1: 'Scar left arm',
    identification_mark_2: 'Mole right eye',
    injury_details: 'Abrasions',
    incident_datetime: null,
    incident_place: null,
    brought_by_name: null,
    brought_by_relation: null,
    brought_by_contact: null,
    brought_by_id_proof: null,
    police_station: null,
    police_intimated_at: null,
    receiving_officer_name: null,
    receiving_officer_buckle_no: null,
    intimation_mode: null,
    recorded_at: new Date(),
    admission: { admission_number: 'ADM/2026-27/00001', patient: { first_name: 'Jane', last_name: 'Doe' } },
    examined_by: { first_name: 'Sam', last_name: 'Rao' },
    recorded_by: { first_name: 'Front', last_name: 'Desk' },
    amendments: [],
  };

  beforeEach(async () => {
    prisma = {
      admissions: { findUnique: jest.fn(), update: jest.fn() },
      clinicians: { findUnique: jest.fn() },
      mlcRegisters: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      admissionEvents: { create: jest.fn() },
      invoiceSequences: { upsert: jest.fn().mockResolvedValue({ last_number: 1 }) },
      mlcAmendments: { create: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [MlcService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(MlcService);
  });

  describe('record', () => {
    beforeEach(() => {
      prisma.admissions.findUnique.mockResolvedValue(admissionA);
      prisma.clinicians.findUnique.mockResolvedValue(clinicianA);
      prisma.mlcRegisters.create.mockResolvedValue({ id: 'mlc-1' });
      prisma.mlcRegisters.findUnique.mockResolvedValue(registerRow);
    });

    it('rejects an admission that already has an MLC register', async () => {
      prisma.admissions.findUnique.mockResolvedValue({ ...admissionA, mlc: { mlc_number: 'MLC/EXISTING' } });
      await expect(
        service.record({ admission_id: 'adm-a', mlc_category: 'road_accident', identification_mark_1: 'x', identification_mark_2: 'y', examined_by_clinician_id: 'clin-a' } as any, orgAUser),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects a cross-org admission', async () => {
      await expect(
        service.record({ admission_id: 'adm-a', mlc_category: 'road_accident', identification_mark_1: 'x', identification_mark_2: 'y', examined_by_clinician_id: 'clin-a' } as any, orgBUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a cross-org examining clinician', async () => {
      prisma.clinicians.findUnique.mockResolvedValue({ id: 'clin-b', is_deleted: false, clinic: { client_org_id: 'org-b' } });
      await expect(
        service.record({ admission_id: 'adm-a', mlc_category: 'road_accident', identification_mark_1: 'x', identification_mark_2: 'y', examined_by_clinician_id: 'clin-b' } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets the denormalised is_mlc flag on the admission', async () => {
      await service.record({ admission_id: 'adm-a', mlc_category: 'road_accident', identification_mark_1: 'x', identification_mark_2: 'y', examined_by_clinician_id: 'clin-a' } as any, orgAUser);
      expect(prisma.admissions.update).toHaveBeenCalledWith({ where: { id: 'adm-a' }, data: { is_mlc: true } });
    });

    it('logs an mlc_flagged AdmissionEvents row', async () => {
      await service.record({ admission_id: 'adm-a', mlc_category: 'assault', identification_mark_1: 'x', identification_mark_2: 'y', examined_by_clinician_id: 'clin-a' } as any, orgAUser);
      expect(prisma.admissionEvents.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ event_type: 'mlc_flagged' }) }),
      );
    });
  });

  describe('recordPoliceIntimation', () => {
    it('rejects when intimation is already recorded (the trigger carve-out is exactly once)', async () => {
      prisma.mlcRegisters.findUnique.mockResolvedValue({ ...registerRow, client_org_id: 'org-a', police_intimated_at: new Date() });
      await expect(
        service.recordPoliceIntimation({ mlc_register_id: 'mlc-1', police_station: 'X', receiving_officer_name: 'Y' } as any, orgAUser),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects a cross-org register', async () => {
      prisma.mlcRegisters.findUnique.mockResolvedValue({ ...registerRow, client_org_id: 'org-b' });
      await expect(
        service.recordPoliceIntimation({ mlc_register_id: 'mlc-1', police_station: 'X', receiving_officer_name: 'Y' } as any, orgAUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('defaults intimation_mode to in_person', async () => {
      prisma.mlcRegisters.findUnique.mockResolvedValue({ ...registerRow, client_org_id: 'org-a', police_intimated_at: null });
      prisma.mlcRegisters.update.mockResolvedValue({});
      const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue({} as any);
      await service.recordPoliceIntimation({ mlc_register_id: 'mlc-1', police_station: 'X', receiving_officer_name: 'Y' } as any, orgAUser);
      expect(prisma.mlcRegisters.update.mock.calls[0][0].data.intimation_mode).toBe('in_person');
      findOneSpy.mockRestore();
    });
  });

  describe('amend', () => {
    it('rejects an unlisted field name (only statutory fields are amendable)', async () => {
      prisma.mlcRegisters.findUnique.mockResolvedValue({ ...registerRow, client_org_id: 'org-a' });
      await expect(
        service.amend({ mlc_register_id: 'mlc-1', field_name: 'mlc_number', corrected_value: 'x', reason: 'test' } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a cross-org register', async () => {
      prisma.mlcRegisters.findUnique.mockResolvedValue({ ...registerRow, client_org_id: 'org-b' });
      await expect(
        service.amend({ mlc_register_id: 'mlc-1', field_name: 'injury_details', corrected_value: 'x', reason: 'test' } as any, orgAUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('reads previous_value from the row itself, never from the caller-supplied input', async () => {
      prisma.mlcRegisters.findUnique.mockResolvedValue({ ...registerRow, client_org_id: 'org-a', injury_details: 'REAL PREVIOUS VALUE' });
      const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue({} as any);
      await service.amend({ mlc_register_id: 'mlc-1', field_name: 'injury_details', corrected_value: 'new value', reason: 'correction' } as any, orgAUser);
      expect(prisma.mlcAmendments.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ previous_value: 'REAL PREVIOUS VALUE', corrected_value: 'new value' }) }),
      );
      findOneSpy.mockRestore();
    });
  });

  describe('findAll / findOne — tenant isolation', () => {
    it('scopes findAll to the caller org', async () => {
      prisma.mlcRegisters.findMany.mockResolvedValue([]);
      await service.findAll(undefined, undefined, orgAUser);
      const call = prisma.mlcRegisters.findMany.mock.calls[0][0];
      expect(call.where.client_org_id).toBe('org-a');
    });

    it('rejects a cross-org single read', async () => {
      prisma.mlcRegisters.findUnique.mockResolvedValue({ ...registerRow, client_org_id: 'org-b' });
      await expect(service.findOne('mlc-1', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('flags police_intimation_overdue once past 24h with no intimation', async () => {
      const old = new Date(Date.now() - 25 * 3_600_000);
      prisma.mlcRegisters.findUnique.mockResolvedValue({ ...registerRow, client_org_id: 'org-a', recorded_at: old, police_intimated_at: null });
      const result = await service.findOne('mlc-1', orgAUser);
      expect(result!.police_intimation_overdue).toBe(true);
    });

    it('does not flag overdue once intimation is recorded, regardless of elapsed time', async () => {
      const old = new Date(Date.now() - 48 * 3_600_000);
      prisma.mlcRegisters.findUnique.mockResolvedValue({ ...registerRow, client_org_id: 'org-a', recorded_at: old, police_intimated_at: new Date() });
      const result = await service.findOne('mlc-1', orgAUser);
      expect(result!.police_intimation_overdue).toBe(false);
    });
  });
});
