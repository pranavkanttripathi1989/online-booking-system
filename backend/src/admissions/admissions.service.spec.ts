import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { AdmissionsService } from './admissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('AdmissionsService', () => {
  let service: AdmissionsService;
  let prisma: any;
  let notificationTrigger: any;

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const orgBUser: JwtPayload = { sub: 'u2', roles: ['manager'], client_org_id: 'org-b', patient_id: null, clinician_id: null } as JwtPayload;

  const clinicA = { id: 'clinic-a', is_deleted: false, client_org_id: 'org-a' };
  const bedA = { id: 'bed-a', client_org_id: 'org-a', clinic_id: 'clinic-a', ward_id: 'ward-a', bed_number: 'A-01', is_deleted: false, is_active: true, ward: { name: 'Ward A' } };
  const patientA = { id: 'pat-a', is_deleted: false, client_org_id: 'org-a' };
  const clinicianA = { id: 'clin-a', is_deleted: false, clinic: { client_org_id: 'org-a' } };

  const baseAdmission = {
    id: 'adm-a',
    client_org_id: 'org-a',
    clinic_id: 'clinic-a',
    patient_id: 'pat-a',
    admission_number: 'ADM/2026-27/CLINICA/00001',
    status: 'admitted',
    admission_type: 'general',
    admitted_at: new Date('2026-09-01T10:00:00.000Z'),
    admitting_clinician_id: 'clin-a',
    attending_clinician_id: 'clin-a',
    provisional_diagnosis: '',
    admission_notes: '',
    billing_mode: 'itemized',
    is_mlc: false,
    is_critical: false,
    payer_id: null,
    department_id: null,
    source_appointment_id: null,
    source_encounter_id: null,
    final_diagnosis: null,
    discharge_type: null,
    discharged_at: null,
    created_at: new Date(),
    patient: { id: 'pat-a', first_name: 'Jane', last_name: 'Doe', phone: null, gender: null, date_of_birth: null },
    admitting_clinician: { id: 'clin-a', first_name: 'Sam', last_name: 'Rao', clinician_type: 'doctor' },
    attending_clinician: { id: 'clin-a', first_name: 'Sam', last_name: 'Rao', clinician_type: 'doctor' },
    clinic: { id: 'clinic-a', name: 'Clinic A' },
    department: null,
    payer: null,
    occupancies: [
      { id: 'occ-1', bed_id: 'bed-a', ward_id: 'ward-a', start_at: new Date('2026-09-01T10:00:00.000Z'), end_at: null, end_reason: null, bed: { bed_number: 'A-01' }, ward: { name: 'Ward A', ward_type: 'general' } },
    ],
  };

  beforeEach(async () => {
    prisma = {
      clinics: { findUnique: jest.fn() },
      beds: { findUnique: jest.fn(), update: jest.fn() },
      patients: { findUnique: jest.fn() },
      clinicians: { findUnique: jest.fn() },
      admissions: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
      bedOccupancies: { create: jest.fn(), update: jest.fn() },
      admissionEvents: { create: jest.fn(), findMany: jest.fn() },
      invoiceSequences: { upsert: jest.fn().mockResolvedValue({ last_number: 1 }) },
      userProfiles: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((cb) => cb(prisma)),
    };
    notificationTrigger = { dispatch: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdmissionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationTriggerService, useValue: notificationTrigger },
      ],
    }).compile();
    service = module.get(AdmissionsService);
  });

  describe('create', () => {
    beforeEach(() => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.beds.findUnique.mockResolvedValue(bedA);
      prisma.patients.findUnique.mockResolvedValue(patientA);
      prisma.clinicians.findUnique.mockResolvedValue(clinicianA);
      prisma.admissions.findFirst.mockResolvedValue(null); // no existing live admission
      prisma.admissions.create.mockResolvedValue({ id: 'adm-a', admission_number: 'ADM/2026-27/CLINICA/00001' });
      prisma.admissions.findUnique.mockResolvedValue(baseAdmission);
    });

    it('rejects a bed belonging to a different clinic than the admission', async () => {
      prisma.beds.findUnique.mockResolvedValue({ ...bedA, clinic_id: 'clinic-other' });
      await expect(
        service.create({ clinic_id: 'clinic-a', patient_id: 'pat-a', bed_id: 'bed-a', admitting_clinician_id: 'clin-a' } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a patient with an existing live admission', async () => {
      prisma.admissions.findFirst.mockResolvedValue({ id: 'existing', admission_number: 'ADM/EXISTING' });
      await expect(
        service.create({ clinic_id: 'clinic-a', patient_id: 'pat-a', bed_id: 'bed-a', admitting_clinician_id: 'clin-a' } as any, orgAUser),
      ).rejects.toThrow(ConflictException);
      expect(prisma.admissions.create).not.toHaveBeenCalled();
    });

    it('defaults attending clinician to the admitting clinician', async () => {
      await service.create({ clinic_id: 'clinic-a', patient_id: 'pat-a', bed_id: 'bed-a', admitting_clinician_id: 'clin-a' } as any, orgAUser);
      const data = prisma.admissions.create.mock.calls[0][0].data;
      expect(data.attending_clinician_id).toBe('clin-a');
    });

    it('defaults billing_mode to package for an insurance admission, itemized otherwise', async () => {
      await service.create({ clinic_id: 'clinic-a', patient_id: 'pat-a', bed_id: 'bed-a', admitting_clinician_id: 'clin-a', admission_type: 'insurance' } as any, orgAUser);
      expect(prisma.admissions.create.mock.calls[0][0].data.billing_mode).toBe('package');

      await service.create({ clinic_id: 'clinic-a', patient_id: 'pat-a', bed_id: 'bed-a', admitting_clinician_id: 'clin-a' } as any, orgAUser);
      expect(prisma.admissions.create.mock.calls[1][0].data.billing_mode).toBe('itemized');
    });

    it('writes the occupancy row and marks the bed occupied inside the same transaction', async () => {
      await service.create({ clinic_id: 'clinic-a', patient_id: 'pat-a', bed_id: 'bed-a', admitting_clinician_id: 'clin-a' } as any, orgAUser);
      expect(prisma.bedOccupancies.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ bed_id: 'bed-a', admission_id: 'adm-a', occupancy_kind: 'occupied' }) }),
      );
      expect(prisma.beds.update).toHaveBeenCalledWith({ where: { id: 'bed-a' }, data: { status: 'occupied' } });
    });

    it('logs an "admitted" AdmissionEvents row', async () => {
      await service.create({ clinic_id: 'clinic-a', patient_id: 'pat-a', bed_id: 'bed-a', admitting_clinician_id: 'clin-a' } as any, orgAUser);
      expect(prisma.admissionEvents.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ event_type: 'admitted' }) }),
      );
    });

    it('translates a bed-overlap exclusion violation into a clean conflict message', async () => {
      prisma.bedOccupancies.create.mockRejectedValue(
        new Error('conflicting key value violates exclusion constraint "bed_occupancies_no_double_occupancy"'),
      );
      await expect(
        service.create({ clinic_id: 'clinic-a', patient_id: 'pat-a', bed_id: 'bed-a', admitting_clinician_id: 'clin-a' } as any, orgAUser),
      ).rejects.toThrow(ConflictException);
    });

    it('propagates a genuinely different database error unchanged', async () => {
      prisma.bedOccupancies.create.mockRejectedValue(new Error('connection reset'));
      await expect(
        service.create({ clinic_id: 'clinic-a', patient_id: 'pat-a', bed_id: 'bed-a', admitting_clinician_id: 'clin-a' } as any, orgAUser),
      ).rejects.toThrow('connection reset');
    });
  });

  describe('transferBed', () => {
    beforeEach(() => {
      prisma.admissions.findUnique.mockResolvedValue({ ...baseAdmission });
      prisma.beds.findUnique.mockResolvedValue({ ...bedA, id: 'bed-b', bed_number: 'A-02' });
      prisma.admissions.findUnique.mockImplementation((args: any) =>
        args.include ? Promise.resolve(baseAdmission) : Promise.resolve({ ...baseAdmission }),
      );
    });

    it('rejects transferring an admission that is not currently live', async () => {
      prisma.admissions.findUnique.mockResolvedValue({ ...baseAdmission, status: 'discharged', occupancies: [] });
      await expect(
        service.transferBed({ admission_id: 'adm-a', to_bed_id: 'bed-b' } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects transferring to a bed in a different clinic', async () => {
      prisma.beds.findUnique.mockResolvedValue({ ...bedA, id: 'bed-b', clinic_id: 'clinic-other' });
      await expect(
        service.transferBed({ admission_id: 'adm-a', to_bed_id: 'bed-b' } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects transferring to the same bed the patient is already in', async () => {
      prisma.beds.findUnique.mockResolvedValue({ ...bedA }); // bed-a, same as current occupancy
      await expect(
        service.transferBed({ admission_id: 'adm-a', to_bed_id: 'bed-a' } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('closes the source occupancy before opening the destination one', async () => {
      const callOrder: string[] = [];
      prisma.bedOccupancies.update.mockImplementation(() => {
        callOrder.push('close-source');
        return Promise.resolve({});
      });
      prisma.bedOccupancies.create.mockImplementation(() => {
        callOrder.push('open-destination');
        return Promise.resolve({});
      });
      await service.transferBed({ admission_id: 'adm-a', to_bed_id: 'bed-b' } as any, orgAUser);
      expect(callOrder).toEqual(['close-source', 'open-destination']);
      expect(prisma.beds.update).toHaveBeenCalledWith({ where: { id: 'bed-a' }, data: { status: 'cleaning' } });
      expect(prisma.beds.update).toHaveBeenCalledWith({ where: { id: 'bed-b' }, data: { status: 'occupied' } });
    });

    it('translates a bed-overlap exclusion violation into a clean conflict message', async () => {
      prisma.bedOccupancies.create.mockRejectedValue(
        new Error('conflicting key value violates exclusion constraint "bed_occupancies_no_double_occupancy"'),
      );
      await expect(
        service.transferBed({ admission_id: 'adm-a', to_bed_id: 'bed-b' } as any, orgAUser),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('discharge', () => {
    beforeEach(() => {
      prisma.admissions.findUnique.mockResolvedValue({ ...baseAdmission });
    });

    it('rejects discharging an already-discharged admission', async () => {
      prisma.admissions.findUnique.mockResolvedValue({ ...baseAdmission, status: 'discharged' });
      await expect(service.discharge({ admission_id: 'adm-a' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects a discharge time before the admission time', async () => {
      await expect(
        service.discharge({ admission_id: 'adm-a', discharged_at: new Date('2020-01-01') } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('closes the occupancy, sets the bed to cleaning (not available), and marks discharged', async () => {
      await service.discharge({ admission_id: 'adm-a' } as any, orgAUser);
      expect(prisma.bedOccupancies.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ end_reason: 'discharge' }) }),
      );
      expect(prisma.beds.update).toHaveBeenCalledWith({ where: { id: 'bed-a' }, data: { status: 'cleaning' } });
      expect(prisma.admissions.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'discharged' }) }),
      );
    });

    it('defaults discharge_type to routine', async () => {
      await service.discharge({ admission_id: 'adm-a' } as any, orgAUser);
      expect(prisma.admissions.update.mock.calls[0][0].data.discharge_type).toBe('routine');
    });
  });

  describe('cancel', () => {
    it('returns a clean failure, not a throw, for a cross-org admission', async () => {
      prisma.admissions.findUnique.mockResolvedValue(baseAdmission);
      const result = await service.cancel('adm-a', 'test', orgBUser);
      expect(result.success).toBe(false);
    });

    it('refuses to cancel an already-discharged admission', async () => {
      prisma.admissions.findUnique.mockResolvedValue({ ...baseAdmission, status: 'discharged' });
      const result = await service.cancel('adm-a', 'test', orgAUser);
      expect(result.success).toBe(false);
    });

    it('cancels (not just closes) the occupancy row and frees the bed to available', async () => {
      prisma.admissions.findUnique.mockResolvedValue(baseAdmission);
      const result = await service.cancel('adm-a', 'Admitted in error', orgAUser);
      expect(result.success).toBe(true);
      expect(prisma.bedOccupancies.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ is_cancelled: true, end_reason: 'cancelled' }) }),
      );
      expect(prisma.beds.update).toHaveBeenCalledWith({ where: { id: 'bed-a' }, data: { status: 'available' } });
    });
  });

  describe('findOne / findAll — tenant isolation', () => {
    it('throws NotFoundException for a cross-org single read', async () => {
      prisma.admissions.findUnique.mockResolvedValue(baseAdmission);
      await expect(service.findOne('adm-a', orgBUser)).rejects.toThrow(NotFoundException);
    });

    it('scopes findAll to the caller org', async () => {
      prisma.admissions.findMany.mockResolvedValue([]);
      await service.findAll(undefined, orgAUser);
      const call = prisma.admissions.findMany.mock.calls[0][0];
      expect(call.where.client_org_id).toBe('org-a');
    });
  });

  describe('length_of_stay_days', () => {
    it('is inclusive of the admission day (a same-day stay reads 1, not 0)', async () => {
      const now = baseAdmission.admitted_at;
      prisma.admissions.findUnique.mockResolvedValue({ ...baseAdmission, admitted_at: now });
      const result = await service.findOne('adm-a', orgAUser);
      expect(result!.length_of_stay_days).toBeGreaterThanOrEqual(1);
    });
  });
});
