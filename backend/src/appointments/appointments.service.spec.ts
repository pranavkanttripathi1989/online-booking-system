import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { PUB_SUB } from '../common/pubsub.provider';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Security regression coverage: appointments() previously only org-scoped,
// never self-scoped -- any authenticated 'patient' role account could read
// every appointment (reason, notes, other patients' names) within the org.
describe('AppointmentsService — access scoping', () => {
  let service: AppointmentsService;
  let prisma: {
    appointments: { findMany: jest.Mock; count: jest.Mock; findUnique: jest.Mock };
    appointmentStatusLogs: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };

  const staffUser: JwtPayload = { sub: 'staff-1', roles: ['manager'], client_org_id: 'org-1' } as JwtPayload;
  const patientUser: JwtPayload = { sub: 'user-1', roles: ['patient'], client_org_id: 'org-1', patient_id: 'pat-1' } as JwtPayload;
  const unlinkedPatientUser: JwtPayload = { sub: 'user-2', roles: ['patient'], client_org_id: 'org-1', patient_id: null } as JwtPayload;
  const clinicianUser: JwtPayload = { sub: 'user-3', roles: ['clinician'], client_org_id: 'org-1', clinician_id: 'cln-1' } as JwtPayload;
  const unlinkedClinicianUser: JwtPayload = { sub: 'user-4', roles: ['clinician'], client_org_id: 'org-1', clinician_id: null } as JwtPayload;

  beforeEach(async () => {
    prisma = {
      appointments: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), findUnique: jest.fn() },
      appointmentStatusLogs: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PUB_SUB, useValue: { publish: jest.fn(), asyncIterableIterator: jest.fn() } },
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
