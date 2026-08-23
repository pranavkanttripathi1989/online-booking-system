import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Security regression coverage for the patient-self-scoping fix: patients()
// previously only org-scoped, never self-scoped, so any authenticated
// 'patient' role account could read every patient's PHI within the org.
describe('PatientsService — access scoping', () => {
  let service: PatientsService;
  let prisma: {
    patients: { findMany: jest.Mock; count: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    appointments: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };

  const staffUser: JwtPayload = { sub: 'staff-1', roles: ['manager'], client_org_id: 'org-1' } as JwtPayload;
  const patientUser: JwtPayload = { sub: 'user-1', roles: ['patient'], client_org_id: 'org-1', patient_id: 'pat-1' } as JwtPayload;
  const unlinkedPatientUser: JwtPayload = { sub: 'user-2', roles: ['patient'], client_org_id: 'org-1', patient_id: null } as JwtPayload;
  const clinicianUser: JwtPayload = { sub: 'user-3', roles: ['clinician'], client_org_id: 'org-1', clinician_id: 'cln-1' } as JwtPayload;

  beforeEach(async () => {
    prisma = {
      patients: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), findUnique: jest.fn(), update: jest.fn() },
      appointments: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [PatientsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(PatientsService);
  });

  describe('findAll', () => {
    it('does not restrict by patient_id for a staff caller', async () => {
      await service.findAll(undefined, 20, 1, staffUser);
      const where = prisma.patients.findMany.mock.calls[0][0].where;
      expect(where.id).toBeUndefined();
    });

    it('restricts a patient caller to only their own linked patient_id', async () => {
      await service.findAll(undefined, 20, 1, patientUser);
      const where = prisma.patients.findMany.mock.calls[0][0].where;
      expect(where.id).toBe('pat-1');
    });

    it('an unlinked patient account (no patient_id) sees nothing, never falls through to "everyone"', async () => {
      await service.findAll(undefined, 20, 1, unlinkedPatientUser);
      const where = prisma.patients.findMany.mock.calls[0][0].where;
      expect(where.id).toBe('__no_patient_link__');
    });

    it('restricts a clinician caller to patients they have treated (TC-AUTH-API-009)', async () => {
      await service.findAll(undefined, 20, 1, clinicianUser);
      const where = prisma.patients.findMany.mock.calls[0][0].where;
      expect(where.appointments).toEqual({ some: { clinician_id: 'cln-1' } });
    });
  });

  describe('findOne', () => {
    it('a patient caller can load their own record', async () => {
      prisma.patients.findUnique.mockResolvedValue({ id: 'pat-1', is_deleted: false, first_name: 'A', last_name: 'B' });
      await expect(service.findOne('pat-1', patientUser)).resolves.toBeDefined();
    });

    it('a patient caller is rejected (not found, not forbidden) reading a different patient record', async () => {
      prisma.patients.findUnique.mockResolvedValue({ id: 'pat-2', is_deleted: false, first_name: 'A', last_name: 'B' });
      await expect(service.findOne('pat-2', patientUser)).rejects.toThrow(NotFoundException);
    });

    it('a clinician caller can load a patient they have treated (TC-AUTH-API-009)', async () => {
      prisma.patients.findUnique.mockResolvedValue({ id: 'pat-1', is_deleted: false, first_name: 'A', last_name: 'B' });
      prisma.appointments.findFirst.mockResolvedValue({ id: 'appt-1' }); // treated=true, and satisfies the later org-scope checks too
      await expect(service.findOne('pat-1', clinicianUser)).resolves.toBeDefined();
    });

    it('a clinician caller is rejected reading a patient they have never treated', async () => {
      prisma.patients.findUnique.mockResolvedValue({ id: 'pat-9', is_deleted: false, first_name: 'A', last_name: 'B' });
      prisma.appointments.findFirst.mockResolvedValue(null); // no shared appointment
      await expect(service.findOne('pat-9', clinicianUser)).rejects.toThrow(NotFoundException);
    });
  });

  // update() delegates its scoping entirely to findOne() (called first, before
  // any write) -- these two cases confirm that delegation actually blocks a
  // cross-patient write, now that updatePatient's resolver gate was opened up
  // to the 'patient' role for profile self-service (pages/patient/Profile.jsx).
  describe('update', () => {
    const validInput = { first_name: 'A', last_name: 'B', email: 'a@b.com', phone: '123', date_of_birth: '1990-01-01' };

    it('a patient caller can update their own record', async () => {
      prisma.patients.findUnique.mockResolvedValue({ id: 'pat-1', is_deleted: false, first_name: 'A', last_name: 'B' });
      prisma.patients.update.mockResolvedValue({ id: 'pat-1', first_name: 'A', last_name: 'B' });
      await expect(service.update('pat-1', validInput as any, patientUser)).resolves.toBeDefined();
      expect(prisma.patients.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'pat-1' } }));
    });

    it('a patient caller is rejected updating a different patient record, and no write is attempted', async () => {
      prisma.patients.findUnique.mockResolvedValue({ id: 'pat-2', is_deleted: false, first_name: 'A', last_name: 'B' });
      await expect(service.update('pat-2', validInput as any, patientUser)).rejects.toThrow(NotFoundException);
      expect(prisma.patients.update).not.toHaveBeenCalled();
    });
  });
});
