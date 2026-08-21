import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { PUB_SUB } from '../common/pubsub.provider';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Security regression coverage: appointments() previously only org-scoped,
// never self-scoped -- any authenticated 'patient' role account could read
// every appointment (reason, notes, other patients' names) within the org.
describe('AppointmentsService — access scoping', () => {
  let service: AppointmentsService;
  let prisma: {
    appointments: { findMany: jest.Mock; count: jest.Mock; findUnique: jest.Mock; findFirst: jest.Mock; create: jest.Mock };
    appointmentStatusLogs: { findMany: jest.Mock; create: jest.Mock };
    clinics: { findUnique: jest.Mock };
    products: { findUnique: jest.Mock };
    rooms: { findFirst: jest.Mock };
    userProfiles: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let notificationTrigger: { dispatch: jest.Mock };

  const staffUser: JwtPayload = { sub: 'staff-1', roles: ['manager'], client_org_id: 'org-1' } as JwtPayload;
  const patientUser: JwtPayload = { sub: 'user-1', roles: ['patient'], client_org_id: 'org-1', patient_id: 'pat-1' } as JwtPayload;
  const unlinkedPatientUser: JwtPayload = { sub: 'user-2', roles: ['patient'], client_org_id: 'org-1', patient_id: null } as JwtPayload;
  const clinicianUser: JwtPayload = { sub: 'user-3', roles: ['clinician'], client_org_id: 'org-1', clinician_id: 'cln-1' } as JwtPayload;
  const unlinkedClinicianUser: JwtPayload = { sub: 'user-4', roles: ['clinician'], client_org_id: 'org-1', clinician_id: null } as JwtPayload;

  beforeEach(async () => {
    prisma = {
      appointments: {
        findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), findUnique: jest.fn(), findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'appt-new', patient_id: 'pat-1', clinician_id: 'cln-1', clinic: { client_org_id: 'org-1' },
          patient: { id: 'pat-1', first_name: 'A', last_name: 'B', date_of_birth: new Date() },
          clinician: { id: 'cln-1', first_name: 'X', last_name: 'Y' }, room: {}, appointment_time: new Date(), duration_minutes: 30, status: 'scheduled',
        }),
      },
      appointmentStatusLogs: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
      clinics: { findUnique: jest.fn() },
      products: { findUnique: jest.fn().mockResolvedValue({ id: 'svc-1', duration_minutes: 30 }) },
      rooms: { findFirst: jest.fn().mockResolvedValue({ id: 'room-1' }) },
      userProfiles: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((ops) => (typeof ops === 'function' ? ops(prisma) : Promise.all(ops))),
    };
    notificationTrigger = { dispatch: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PUB_SUB, useValue: { publish: jest.fn(), asyncIterableIterator: jest.fn() } },
        { provide: NotificationTriggerService, useValue: notificationTrigger },
      ],
    }).compile();
    service = module.get(AppointmentsService);
  });

  describe('findAll', () => {
    it('does not restrict by patient_id for a staff caller', async () => {
      await service.findAll(undefined, 20, 1, staffUser);
      const where = prisma.appointments.findMany.mock.calls[0][0].where;
      expect(where.patient_id).toBeUndefined();
    });

    it('restricts a patient caller to only their own linked patient_id', async () => {
      await service.findAll(undefined, 20, 1, patientUser);
      const where = prisma.appointments.findMany.mock.calls[0][0].where;
      expect(where.patient_id).toBe('pat-1');
    });

    it('an unlinked patient account (no patient_id) sees nothing, never falls through to "everyone"', async () => {
      await service.findAll(undefined, 20, 1, unlinkedPatientUser);
      const where = prisma.appointments.findMany.mock.calls[0][0].where;
      expect(where.patient_id).toBe('__no_patient_link__');
    });

    it('restricts a clinician caller to only their own linked clinician_id (TC-APPT-API-010)', async () => {
      await service.findAll(undefined, 20, 1, clinicianUser);
      const where = prisma.appointments.findMany.mock.calls[0][0].where;
      expect(where.clinician_id).toBe('cln-1');
    });

    it('an unlinked clinician account (no clinician_id) sees nothing, never falls through to "everyone"', async () => {
      await service.findAll(undefined, 20, 1, unlinkedClinicianUser);
      const where = prisma.appointments.findMany.mock.calls[0][0].where;
      expect(where.clinician_id).toBe('__no_clinician_link__');
    });
  });

  describe('create', () => {
    const baseInput = { clinician_id: 'cln-1', clinic_id: 'clinic-1', patient_id: 'pat-1', service_id: 'svc-1', start_datetime: new Date().toISOString(), notes: '' };

    it('rejects creating an appointment for a clinic in a different org (previously no check at all)', async () => {
      prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-2' });
      await expect(service.create(baseInput as any, staffUser)).rejects.toThrow('Clinic not found');
      expect(prisma.products.findUnique).not.toHaveBeenCalled();
    });

    it('allows creating an appointment for a clinic in the caller\'s own org', async () => {
      prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
      await expect(service.create(baseInput as any, staffUser)).resolves.toBeDefined();
    });

    // REQ008/PLAN017
    it('dispatches new_appointment to the clinician\'s linked profile', async () => {
      prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
      prisma.userProfiles.findFirst.mockResolvedValue({ id: 'profile-cln-1' });
      await service.create(baseInput as any, staffUser);
      expect(notificationTrigger.dispatch).toHaveBeenCalledWith(
        'profile-cln-1',
        'new_appointment',
        expect.objectContaining({ type: 'appointment' }),
      );
    });

    it('does not dispatch when the clinician has no linked profile', async () => {
      prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
      prisma.userProfiles.findFirst.mockResolvedValue(null);
      await service.create(baseInput as any, staffUser);
      expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
    });

    it('is a no-op for an org-less caller (patient self-serve booking goes through a separate mutation)', async () => {
      const orgLessPatient: JwtPayload = { sub: 'p-1', roles: ['patient'], client_org_id: null, patient_id: 'pat-1' } as JwtPayload;
      await expect(service.create(baseInput as any, orgLessPatient)).resolves.toBeDefined();
      expect(prisma.clinics.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    const baseAppointment = (overrides: Partial<Record<string, unknown>> = {}) => ({
      id: 'appt-1',
      is_deleted: false,
      patient_id: 'pat-1',
      clinician_id: 'cln-1',
      clinic: { client_org_id: 'org-1' },
      patient: { id: 'pat-1', first_name: 'A', last_name: 'B', date_of_birth: new Date() },
      clinician: { id: 'cln-1', first_name: 'X', last_name: 'Y' },
      room: {},
      appointment_time: new Date(),
      duration_minutes: 30,
      status: 'scheduled',
      ...overrides,
    });

    it('a patient caller can load their own appointment', async () => {
      prisma.appointments.findUnique.mockResolvedValue(baseAppointment());
      await expect(service.findOne('appt-1', patientUser)).resolves.toBeDefined();
    });

    it('a patient caller is rejected loading another patient\'s appointment', async () => {
      prisma.appointments.findUnique.mockResolvedValue(baseAppointment({ patient_id: 'pat-2' }));
      await expect(service.findOne('appt-1', patientUser)).rejects.toThrow(NotFoundException);
    });

    it('a clinician caller can load their own appointment', async () => {
      prisma.appointments.findUnique.mockResolvedValue(baseAppointment());
      await expect(service.findOne('appt-1', clinicianUser)).resolves.toBeDefined();
    });

    it('a clinician caller is rejected loading another clinician\'s appointment (TC-APPT-API-010)', async () => {
      prisma.appointments.findUnique.mockResolvedValue(baseAppointment({ clinician_id: 'cln-2' }));
      await expect(service.findOne('appt-1', clinicianUser)).rejects.toThrow(NotFoundException);
    });
  });
});
