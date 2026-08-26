import { Test, TestingModule } from '@nestjs/testing';
import { WaitlistService } from './waitlist.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('WaitlistService', () => {
  let service: WaitlistService;
  let prisma: any;
  let notificationTrigger: any;

  const patientAUser: JwtPayload = { sub: 'u1', roles: ['patient'], client_org_id: 'org-a', patient_id: 'patient-a' } as JwtPayload;
  const unlinkedPatientUser: JwtPayload = { sub: 'u3', roles: ['patient'], client_org_id: 'org-a', patient_id: null } as JwtPayload;
  const managerAUser: JwtPayload = { sub: 'u4', roles: ['manager'], client_org_id: 'org-a' } as JwtPayload;
  const managerBUser: JwtPayload = { sub: 'u5', roles: ['manager'], client_org_id: 'org-b' } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u6', roles: ['admin'], client_org_id: null } as JwtPayload;

  const clinicA = { id: 'clinic-a', client_org_id: 'org-a', is_deleted: false };
  const clinicB = { id: 'clinic-b', client_org_id: 'org-b', is_deleted: false };
  const clinicianA = { id: 'clinician-a', clinic_id: 'clinic-a', is_deleted: false, clinic: clinicA };

  const entryA = {
    id: 'entry-a1', client_org_id: 'org-a', clinic_id: 'clinic-a', clinician_id: 'clinician-a',
    patient_id: 'patient-a', waitlist_date: new Date('2026-09-01T00:00:00.000Z'), status: 'waiting',
    position: 1, notified_at: null, claim_expires_at: null, created_at: new Date(),
  };
  const entryB = { ...entryA, id: 'entry-b1', client_org_id: 'org-b', clinic_id: 'clinic-b', patient_id: 'patient-b' };

  beforeEach(async () => {
    prisma = {
      clinicians: { findUnique: jest.fn() },
      clinics: { findUnique: jest.fn() },
      waitlistEntries: { findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
      userProfiles: { findFirst: jest.fn() },
    };
    notificationTrigger = { dispatch: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitlistService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationTriggerService, useValue: notificationTrigger },
      ],
    }).compile();
    service = module.get(WaitlistService);
  });

  describe('joinWaitlist', () => {
    it('rejects an unlinked patient account', async () => {
      const result = await service.joinWaitlist({ clinician_id: 'clinician-a', date: '2026-09-01' }, unlinkedPatientUser);
      expect(result.success).toBe(false);
      expect(prisma.waitlistEntries.create).not.toHaveBeenCalled();
    });

    it('rejects a nonexistent clinician', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(null);
      const result = await service.joinWaitlist({ clinician_id: 'no-such', date: '2026-09-01' }, patientAUser);
      expect(result.success).toBe(false);
    });

    it('derives client_org_id from the clinician\'s own clinic, never the caller\'s (Hard Rule 6)', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianA);
      prisma.waitlistEntries.findFirst.mockResolvedValue(null);
      prisma.waitlistEntries.count.mockResolvedValue(0);
      prisma.waitlistEntries.create.mockResolvedValue(entryA);
      // A platform operator (client_org_id: null on the caller) still derives
      // the entry's own org from the clinician's clinic, not from the caller.
      await service.joinWaitlist({ clinician_id: 'clinician-a', date: '2026-09-01' }, { ...platformUser, patient_id: 'patient-a' } as JwtPayload);
      expect(prisma.waitlistEntries.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ client_org_id: 'org-a' }),
      }));
    });

    it('rejects a duplicate active entry for the same patient/clinician/date', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianA);
      prisma.waitlistEntries.findFirst.mockResolvedValue(entryA);
      const result = await service.joinWaitlist({ clinician_id: 'clinician-a', date: '2026-09-01' }, patientAUser);
      expect(result.success).toBe(false);
      expect(prisma.waitlistEntries.create).not.toHaveBeenCalled();
    });

    it('computes position as the current waiting count + 1', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianA);
      prisma.waitlistEntries.findFirst.mockResolvedValue(null);
      prisma.waitlistEntries.count.mockResolvedValue(2);
      prisma.waitlistEntries.create.mockResolvedValue({ ...entryA, position: 3 });
      const result = await service.joinWaitlist({ clinician_id: 'clinician-a', date: '2026-09-01' }, patientAUser);
      expect(result.success).toBe(true);
      expect(prisma.waitlistEntries.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ position: 3, patient_id: 'patient-a' }),
      }));
      expect(result.waitlistEntry?.position).toBe(3);
    });

    it('parses the date string as UTC midnight, not a local-clock hour', async () => {
      prisma.clinicians.findUnique.mockResolvedValue(clinicianA);
      prisma.waitlistEntries.findFirst.mockResolvedValue(null);
      prisma.waitlistEntries.count.mockResolvedValue(0);
      prisma.waitlistEntries.create.mockResolvedValue(entryA);
      await service.joinWaitlist({ clinician_id: 'clinician-a', date: '2026-09-01' }, patientAUser);
      expect(prisma.waitlistEntries.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ waitlist_date: new Date('2026-09-01T00:00:00.000Z') }),
      }));
    });
  });

  describe('myWaitlistEntries', () => {
    it('returns [] for an unlinked patient account, never everyone\'s entries', async () => {
      const result = await service.myWaitlistEntries(unlinkedPatientUser);
      expect(result).toEqual([]);
      expect(prisma.waitlistEntries.findMany).not.toHaveBeenCalled();
    });

    it('self-scopes to the caller\'s own patient_id from the JWT', async () => {
      prisma.waitlistEntries.findMany.mockResolvedValue([entryA]);
      const result = await service.myWaitlistEntries(patientAUser);
      expect(result).toHaveLength(1);
      expect(prisma.waitlistEntries.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { patient_id: 'patient-a' },
      }));
    });
  });

  describe('clinicWaitlist', () => {
    it('with no clinic_id, org B\'s caller is scoped to org B, never org A\'s entries', async () => {
      prisma.waitlistEntries.findMany.mockResolvedValue([entryB]);
      const result = await service.clinicWaitlist(undefined, managerBUser);
      expect(result).toHaveLength(1);
      expect(prisma.waitlistEntries.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { clinic: { client_org_id: 'org-b' } },
      }));
    });

    it('rejects a cross-org clinic_id', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      const result = await service.clinicWaitlist('clinic-b', managerAUser);
      expect(result).toEqual([]);
      expect(prisma.waitlistEntries.findMany).not.toHaveBeenCalled();
    });

    it('a platform operator can list any clinic\'s entries', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      prisma.waitlistEntries.findMany.mockResolvedValue([entryB]);
      const result = await service.clinicWaitlist('clinic-b', platformUser);
      expect(result).toHaveLength(1);
    });
  });

  describe('cancelWaitlistEntry', () => {
    it('rejects cancelling another patient\'s entry', async () => {
      prisma.waitlistEntries.findUnique.mockResolvedValue(entryB);
      const result = await service.cancelWaitlistEntry('entry-b1', patientAUser);
      expect(result.success).toBe(false);
      expect(prisma.waitlistEntries.update).not.toHaveBeenCalled();
    });

    it('cancels the caller\'s own entry', async () => {
      prisma.waitlistEntries.findUnique.mockResolvedValue(entryA);
      prisma.waitlistEntries.update.mockResolvedValue({ ...entryA, status: 'cancelled' });
      const result = await service.cancelWaitlistEntry('entry-a1', patientAUser);
      expect(result.success).toBe(true);
      expect(prisma.waitlistEntries.update).toHaveBeenCalledWith({ where: { id: 'entry-a1' }, data: { status: 'cancelled' } });
    });
  });

  describe('promoteNext', () => {
    const date = new Date('2026-09-01T00:00:00.000Z');

    it('does nothing when no waiting entry exists', async () => {
      prisma.waitlistEntries.findFirst.mockResolvedValue(null);
      await service.promoteNext('clinician-a', date);
      expect(prisma.waitlistEntries.update).not.toHaveBeenCalled();
      expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
    });

    it('picks the earliest waiting entry, sets notified + claim_expires_at, and notifies the linked patient', async () => {
      prisma.waitlistEntries.findFirst.mockResolvedValue(entryA);
      prisma.waitlistEntries.update.mockResolvedValue({ ...entryA, status: 'notified' });
      prisma.userProfiles.findFirst.mockResolvedValue({ id: 'profile-1', patient_id: 'patient-a' });
      await service.promoteNext('clinician-a', date);
      expect(prisma.waitlistEntries.findMany).not.toHaveBeenCalled(); // sanity: promoteNext never lists
      expect(prisma.waitlistEntries.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'entry-a1' },
        data: expect.objectContaining({ status: 'notified' }),
      }));
      expect(notificationTrigger.dispatch).toHaveBeenCalledWith('profile-1', 'waitlist_slot_available', expect.any(Object));
    });

    it('skips notification silently for an unlinked patient account', async () => {
      prisma.waitlistEntries.findFirst.mockResolvedValue(entryA);
      prisma.waitlistEntries.update.mockResolvedValue({ ...entryA, status: 'notified' });
      prisma.userProfiles.findFirst.mockResolvedValue(null);
      await service.promoteNext('clinician-a', date);
      expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
    });

    it('orders by position ascending (findFirst\'s own orderBy)', async () => {
      prisma.waitlistEntries.findFirst.mockResolvedValue(entryA);
      prisma.waitlistEntries.update.mockResolvedValue({ ...entryA, status: 'notified' });
      await service.promoteNext('clinician-a', date);
      expect(prisma.waitlistEntries.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: { clinician_id: 'clinician-a', waitlist_date: date, status: 'waiting' },
        orderBy: { position: 'asc' },
      }));
    });
  });
});
