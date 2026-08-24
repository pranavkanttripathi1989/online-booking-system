import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Security regression coverage for the patient-self-scoping fix: patients()
// previously only org-scoped, never self-scoped, so any authenticated
// 'patient' role account could read every patient's PHI within the org.
// REQ018 widens that same self-scope to include the caller's dependants
// (PatientRelations), and adds dedup-suggestion + merge-audit (US-BOOK-01).
describe('PatientsService — access scoping', () => {
  let service: PatientsService;
  let prisma: any;

  const staffUser: JwtPayload = { sub: 'staff-1', roles: ['manager'], client_org_id: 'org-1' } as JwtPayload;
  const patientUser: JwtPayload = { sub: 'user-1', roles: ['patient'], client_org_id: 'org-1', patient_id: 'pat-1' } as JwtPayload;
  const unlinkedPatientUser: JwtPayload = { sub: 'user-2', roles: ['patient'], client_org_id: 'org-1', patient_id: null } as JwtPayload;
  const clinicianUser: JwtPayload = { sub: 'user-3', roles: ['clinician'], client_org_id: 'org-1', clinician_id: 'cln-1' } as JwtPayload;

  beforeEach(async () => {
    prisma = {
      patients: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
      appointments: { findFirst: jest.fn().mockResolvedValue(null), updateMany: jest.fn() },
      patientRelations: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), updateMany: jest.fn() },
      patientMerges: { create: jest.fn() },
      userProfiles: { findFirst: jest.fn().mockResolvedValue(null), updateMany: jest.fn() },
      encounters: { updateMany: jest.fn() },
      prescriptions: { updateMany: jest.fn() },
      testResults: { updateMany: jest.fn() },
      appointmentPayments: { updateMany: jest.fn() },
      reviews: { updateMany: jest.fn() },
      $transaction: jest.fn((ops) => (typeof ops === 'function' ? ops(prisma) : Promise.all(ops))),
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

    it('restricts a patient caller to only their own linked patient_id (no dependants)', async () => {
      await service.findAll(undefined, 20, 1, patientUser);
      const where = prisma.patients.findMany.mock.calls[0][0].where;
      expect(where.id).toEqual({ in: ['pat-1'] });
    });

    it('includes a dependant\'s id alongside the caller\'s own', async () => {
      prisma.patientRelations.findMany.mockResolvedValue([{ related_patient_id: 'dep-1' }]);
      await service.findAll(undefined, 20, 1, patientUser);
      const where = prisma.patients.findMany.mock.calls[0][0].where;
      expect(where.id).toEqual({ in: ['pat-1', 'dep-1'] });
    });

    it('an unlinked patient account (no patient_id) sees nothing, never falls through to "everyone"', async () => {
      await service.findAll(undefined, 20, 1, unlinkedPatientUser);
      const where = prisma.patients.findMany.mock.calls[0][0].where;
      expect(where.id).toEqual({ in: ['__no_patient_link__'] });
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

    it('a patient caller can load a dependant\'s record', async () => {
      prisma.patients.findUnique.mockResolvedValue({ id: 'dep-1', is_deleted: false, first_name: 'C', last_name: 'D' });
      prisma.patientRelations.findMany.mockResolvedValue([{ related_patient_id: 'dep-1' }]);
      await expect(service.findOne('dep-1', patientUser)).resolves.toBeDefined();
    });

    it('a patient caller is rejected (not found, not forbidden) reading a different, non-dependant patient record', async () => {
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

  // REQ018 US-BOOK-01
  describe('findPotentialDuplicates', () => {
    it('returns exact-phone candidates unfiltered when no name/DOB is given', async () => {
      prisma.patients.findMany.mockResolvedValue([{ id: 'p1', first_name: 'A', last_name: 'B', phone: '999', date_of_birth: new Date() }]);
      const result = await service.findPotentialDuplicates('999', undefined, undefined, undefined);
      expect(result).toHaveLength(1);
    });

    it('filters to candidates matching name or DOB when given', async () => {
      prisma.patients.findMany.mockResolvedValue([
        { id: 'p1', first_name: 'Anita', last_name: 'Sharma', phone: '999', date_of_birth: new Date('1990-01-01') },
        { id: 'p2', first_name: 'Someone', last_name: 'Else', phone: '999', date_of_birth: new Date('1985-05-05') },
      ]);
      const result = await service.findPotentialDuplicates('999', 'Anita', 'Sharma', undefined);
      expect(result.map((r: any) => r.id)).toEqual(['p1']);
    });
  });

  // REQ018 US-BOOK-01
  describe('mergePatients', () => {
    const mergeInput = { surviving_patient_id: 'pat-1', merged_patient_id: 'pat-2' };

    beforeEach(() => {
      prisma.patients.findUnique.mockImplementation(({ where }: any) =>
        Promise.resolve({ id: where.id, is_deleted: false, first_name: 'A', last_name: 'B' }));
    });

    it('rejects merging a patient into themself', async () => {
      await expect(service.mergePatients({ surviving_patient_id: 'pat-1', merged_patient_id: 'pat-1' } as any, staffUser))
        .rejects.toThrow(BadRequestException);
    });

    it('moves every FK reference from the merged patient to the survivor', async () => {
      await service.mergePatients(mergeInput as any, staffUser);
      for (const table of ['appointments', 'encounters', 'prescriptions', 'testResults', 'appointmentPayments', 'reviews']) {
        expect(prisma[table].updateMany).toHaveBeenCalledWith({ where: { patient_id: 'pat-2' }, data: { patient_id: 'pat-1' } });
      }
    });

    it('remaps PatientRelations on both the owner and dependant sides', async () => {
      await service.mergePatients(mergeInput as any, staffUser);
      expect(prisma.patientRelations.updateMany).toHaveBeenCalledWith({ where: { patient_id: 'pat-2' }, data: { patient_id: 'pat-1' } });
      expect(prisma.patientRelations.updateMany).toHaveBeenCalledWith({ where: { related_patient_id: 'pat-2' }, data: { related_patient_id: 'pat-1' } });
    });

    it('relinks the merged patient\'s login only if the survivor has none of their own', async () => {
      prisma.userProfiles.findFirst.mockResolvedValue(null);
      await service.mergePatients(mergeInput as any, staffUser);
      expect(prisma.userProfiles.updateMany).toHaveBeenCalledWith({ where: { patient_id: 'pat-2' }, data: { patient_id: 'pat-1' } });
    });

    it('does not relink a login if the survivor already has one', async () => {
      prisma.userProfiles.findFirst.mockResolvedValue({ id: 'profile-1' });
      await service.mergePatients(mergeInput as any, staffUser);
      expect(prisma.userProfiles.updateMany).not.toHaveBeenCalled();
    });

    it('soft-deletes the merged patient and writes a PatientMerges audit row, never a hard delete', async () => {
      await service.mergePatients({ ...mergeInput, reason: 'duplicate booking' } as any, staffUser);
      expect(prisma.patients.update).toHaveBeenCalledWith({ where: { id: 'pat-2' }, data: { is_deleted: true } });
      expect(prisma.patientMerges.create).toHaveBeenCalledWith({
        data: { surviving_patient_id: 'pat-1', merged_patient_id: 'pat-2', merged_by_user_id: 'staff-1', reason: 'duplicate booking' },
      });
    });
  });

  // REQ018 US-BOOK-02
  describe('myDependants / addDependant', () => {
    it('myDependants returns an empty list for an unlinked patient account', async () => {
      const result = await service.myDependants(unlinkedPatientUser);
      expect(result).toEqual([]);
    });

    it('myDependants lists the caller\'s own dependants, not anyone else\'s', async () => {
      await service.myDependants(patientUser);
      expect(prisma.patientRelations.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { patient_id: 'pat-1' } }));
    });

    it('addDependant rejects a non-patient caller', async () => {
      await expect(service.addDependant({ first_name: 'C', last_name: 'D', date_of_birth: '2015-01-01', relation: 'child' } as any, staffUser))
        .rejects.toThrow(ForbiddenException);
    });

    it('addDependant rejects an unlinked patient account', async () => {
      await expect(service.addDependant({ first_name: 'C', last_name: 'D', date_of_birth: '2015-01-01', relation: 'child' } as any, unlinkedPatientUser))
        .rejects.toThrow(ForbiddenException);
    });

    it('addDependant creates a new patient row and links it under the caller\'s own patient_id', async () => {
      prisma.patients.create.mockResolvedValue({ id: 'dep-1', first_name: 'C', last_name: 'D', date_of_birth: new Date('2015-01-01') });
      prisma.patientRelations.create.mockResolvedValue({
        id: 'rel-1', relation: 'child', related_patient: { id: 'dep-1', first_name: 'C', last_name: 'D', date_of_birth: new Date('2015-01-01') },
      });
      const result = await service.addDependant({ first_name: 'C', last_name: 'D', date_of_birth: '2015-01-01', relation: 'child' } as any, patientUser);
      expect(prisma.patientRelations.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ patient_id: 'pat-1', related_patient_id: 'dep-1', relation: 'child' }),
      }));
      expect(result.relation).toBe('child');
    });
  });
});
