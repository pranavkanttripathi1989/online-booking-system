import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ImmunizationsService, computeImmunizationStatus } from './immunizations.service';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('computeImmunizationStatus (pure)', () => {
  const now = new Date('2026-08-30T00:00:00.000Z');

  it('returns administered when a matching record exists, regardless of due date', () => {
    expect(computeImmunizationStatus(new Date('2020-01-01'), true, now)).toBe('administered');
  });
  it('returns overdue when the due date has passed and nothing was recorded', () => {
    expect(computeImmunizationStatus(new Date('2026-01-01'), false, now)).toBe('overdue');
  });
  it('returns due_soon when the due date is within the next 30 days', () => {
    expect(computeImmunizationStatus(new Date('2026-09-10'), false, now)).toBe('due_soon');
  });
  it('returns upcoming when the due date is more than 30 days away', () => {
    expect(computeImmunizationStatus(new Date('2027-01-01'), false, now)).toBe('upcoming');
  });
});

describe('ImmunizationsService — access scoping', () => {
  let service: ImmunizationsService;
  let prisma: {
    immunizationScheduleItems: { findMany: jest.Mock; findUnique: jest.Mock };
    immunizationRecords: { findMany: jest.Mock; create: jest.Mock };
    patients: { findUnique: jest.Mock };
    appointments: { findFirst: jest.Mock };
  };
  let patientsService: { ownAndDependantPatientIds: jest.Mock };

  const staffUser: JwtPayload = { sub: 'staff-1', roles: ['manager'], client_org_id: 'org-1' } as JwtPayload;
  const clinicianUser: JwtPayload = { sub: 'clin-1', roles: ['clinician'], client_org_id: 'org-1', clinician_id: 'clin-1' } as JwtPayload;
  const patientUser: JwtPayload = { sub: 'user-1', roles: ['patient'], client_org_id: 'org-1', patient_id: 'pat-1' } as JwtPayload;

  beforeEach(async () => {
    prisma = {
      immunizationScheduleItems: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
      immunizationRecords: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
      patients: { findUnique: jest.fn() },
      appointments: { findFirst: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImmunizationsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: PatientsService,
          useValue: (patientsService = {
            ownAndDependantPatientIds: jest.fn().mockImplementation(async (user: JwtPayload) => [user.patient_id ?? '__no_patient_link__']),
          }),
        },
      ],
    }).compile();
    service = module.get(ImmunizationsService);
  });

  describe('assertPatientAccess (via patientImmunizations)', () => {
    it('a patient caller can read their own records', async () => {
      await expect(service.patientImmunizations('pat-1', patientUser)).resolves.toEqual([]);
    });

    it('a patient caller is rejected reading a patient outside their own+dependants', async () => {
      await expect(service.patientImmunizations('pat-2', patientUser)).rejects.toThrow(NotFoundException);
    });

    it('a patient caller can read a dependant\'s records', async () => {
      patientsService.ownAndDependantPatientIds.mockResolvedValue(['pat-1', 'dep-1']);
      await expect(service.patientImmunizations('dep-1', patientUser)).resolves.toEqual([]);
    });

    it('a clinician who has treated the patient can read their records', async () => {
      prisma.appointments.findFirst.mockResolvedValue({ id: 'appt-1' });
      await expect(service.patientImmunizations('pat-1', clinicianUser)).resolves.toEqual([]);
      expect(prisma.appointments.findFirst).toHaveBeenCalledWith({ where: { patient_id: 'pat-1', clinician_id: 'clin-1' } });
    });

    it('a clinician who never treated the patient is rejected', async () => {
      prisma.appointments.findFirst.mockResolvedValue(null);
      await expect(service.patientImmunizations('pat-1', clinicianUser)).rejects.toThrow(NotFoundException);
    });

    it('a staff caller from the same org, where the patient has an appointment elsewhere, is rejected', async () => {
      prisma.appointments.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'appt-1' });
      await expect(service.patientImmunizations('pat-1', staffUser)).rejects.toThrow(NotFoundException);
    });

    it('a staff caller is allowed when the patient has an appointment in their org', async () => {
      prisma.appointments.findFirst.mockResolvedValueOnce({ id: 'appt-1' }).mockResolvedValueOnce({ id: 'appt-1' });
      await expect(service.patientImmunizations('pat-1', staffUser)).resolves.toEqual([]);
    });

    it('a staff caller is allowed when the patient has no appointments anywhere yet (nothing to compare against)', async () => {
      prisma.appointments.findFirst.mockResolvedValue(null);
      await expect(service.patientImmunizations('pat-1', staffUser)).resolves.toEqual([]);
    });
  });

  describe('patientImmunizationStatus / computePatientStatus', () => {
    const dob = new Date('2026-01-01T00:00:00.000Z');

    it('computes overdue/upcoming correctly against the patient\'s date_of_birth', async () => {
      prisma.patients.findUnique.mockResolvedValue({ id: 'pat-1', is_deleted: false, date_of_birth: dob });
      prisma.immunizationScheduleItems.findMany.mockResolvedValue([
        { id: 'item-1', vaccine_name: 'BCG', dose_number: 1, due_age_days: 0 },
        { id: 'item-2', vaccine_name: 'Pentavalent', dose_number: 1, due_age_days: 42 },
      ]);
      prisma.immunizationRecords.findMany.mockResolvedValue([
        { id: 'rec-1', schedule_item_id: 'item-1', patient_id: 'pat-1', vaccine_name: 'BCG', dose_number: 1, administered_at: dob, administeredBy: null },
      ]);
      const result = await service.patientImmunizationStatus('pat-1', staffUser);
      expect(result.find((r: any) => r.schedule_item_id === 'item-1')?.status).toBe('administered');
      expect(result.find((r: any) => r.schedule_item_id === 'item-2')?.status).toBe('overdue');
    });

    it('matches an off-schedule record by vaccine name + dose number when no schedule_item_id link exists', async () => {
      prisma.patients.findUnique.mockResolvedValue({ id: 'pat-1', is_deleted: false, date_of_birth: dob });
      prisma.immunizationScheduleItems.findMany.mockResolvedValue([{ id: 'item-1', vaccine_name: 'BCG', dose_number: 1, due_age_days: 0 }]);
      prisma.immunizationRecords.findMany.mockResolvedValue([
        { id: 'rec-1', schedule_item_id: null, patient_id: 'pat-1', vaccine_name: 'BCG', dose_number: 1, administered_at: dob, administeredBy: null },
      ]);
      const result = await service.patientImmunizationStatus('pat-1', staffUser);
      expect(result[0].status).toBe('administered');
    });

    it('rejects an unknown/deleted patient', async () => {
      prisma.patients.findUnique.mockResolvedValue(null);
      await expect(service.computePatientStatus('pat-nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordImmunization', () => {
    const validInput = { patient_id: 'pat-1', vaccine_name: 'BCG', dose_number: 1 };

    it('rejects an unknown patient_id', async () => {
      prisma.patients.findUnique.mockResolvedValue(null);
      await expect(service.recordImmunization(validInput as any, staffUser)).rejects.toThrow(BadRequestException);
      expect(prisma.immunizationRecords.create).not.toHaveBeenCalled();
    });

    it('rejects a patient belonging to a different org (Hard Rule 6)', async () => {
      prisma.patients.findUnique.mockResolvedValue({ id: 'pat-1', is_deleted: false, client_org_id: 'org-2' });
      await expect(service.recordImmunization(validInput as any, staffUser)).rejects.toThrow(NotFoundException);
      expect(prisma.immunizationRecords.create).not.toHaveBeenCalled();
    });

    it('rejects an unknown schedule_item_id', async () => {
      prisma.patients.findUnique.mockResolvedValue({ id: 'pat-1', is_deleted: false, client_org_id: 'org-1' });
      prisma.immunizationScheduleItems.findUnique.mockResolvedValue(null);
      await expect(
        service.recordImmunization({ ...validInput, schedule_item_id: 'bad-id' } as any, staffUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('writes patient_id and denormalized vaccine fields on the created row', async () => {
      prisma.patients.findUnique.mockResolvedValue({ id: 'pat-1', is_deleted: false, client_org_id: 'org-1' });
      prisma.immunizationRecords.create.mockResolvedValue({
        id: 'rec-new', patient_id: 'pat-1', vaccine_name: 'BCG', dose_number: 1, administered_at: new Date(), administeredBy: null,
      });
      await service.recordImmunization(validInput as any, staffUser);
      expect(prisma.immunizationRecords.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ patient_id: 'pat-1', vaccine_name: 'BCG', dose_number: 1, administered_by_user_id: 'staff-1' }) }),
      );
    });

    it('a platform operator can record a dose for a patient with no client_org_id yet', async () => {
      prisma.patients.findUnique.mockResolvedValue({ id: 'pat-1', is_deleted: false, client_org_id: null });
      prisma.immunizationRecords.create.mockResolvedValue({
        id: 'rec-new', patient_id: 'pat-1', vaccine_name: 'BCG', dose_number: 1, administered_at: new Date(), administeredBy: null,
      });
      const platformAdmin: JwtPayload = { sub: 'admin-1', roles: ['admin'], client_org_id: null } as JwtPayload;
      await expect(service.recordImmunization(validInput as any, platformAdmin)).resolves.toBeDefined();
    });
  });
});
