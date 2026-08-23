import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Security regression coverage: saveClinicianAvailability/deleteClinicianAvailability/
// saveLunchBreak/deleteLunchBreak (the clinician self-service surface) had NO
// ownership or tenant check at all -- any authenticated clinician (or manager
// from any org) could create/edit/delete ANY OTHER clinician's availability
// template or lunch break, across organizations. An unrestricted cross-tenant
// WRITE/DELETE path, not just a read leak.
describe('AvailabilityService — clinician self-service access scoping', () => {
  let service: AvailabilityService;
  let prisma: {
    clinicians: { findUnique: jest.Mock };
    clinicianAvailability: { findUnique: jest.Mock; update: jest.Mock; create: jest.Mock };
    lunchBreaks: { findUnique: jest.Mock; update: jest.Mock; create: jest.Mock };
    clinics: { findUnique: jest.Mock };
  };

  const ownClinicianUser: JwtPayload = { sub: 'u-1', roles: ['clinician'], client_org_id: 'org-1', clinician_id: 'cln-1' } as JwtPayload;
  const otherClinicianUser: JwtPayload = { sub: 'u-2', roles: ['clinician'], client_org_id: 'org-1', clinician_id: 'cln-2' } as JwtPayload;
  const managerSameOrg: JwtPayload = { sub: 'u-3', roles: ['manager'], client_org_id: 'org-1' } as JwtPayload;
  const managerOtherOrg: JwtPayload = { sub: 'u-4', roles: ['manager'], client_org_id: 'org-2' } as JwtPayload;

  const targetClinician = { id: 'cln-1', clinic_id: 'clinic-1', clinic: { id: 'clinic-1', client_org_id: 'org-1' } };

  beforeEach(async () => {
    prisma = {
      clinicians: { findUnique: jest.fn().mockResolvedValue(targetClinician) },
      clinicianAvailability: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({ id: 'avail-1' }), create: jest.fn().mockResolvedValue({ id: 'avail-1' }) },
      lunchBreaks: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({ id: 'lb-1' }), create: jest.fn().mockResolvedValue({ id: 'lb-1' }) },
      clinics: { findUnique: jest.fn().mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' }) },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [AvailabilityService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(AvailabilityService);
  });

  const baseAvailInput = { clinicianId: 'cln-1', recurrenceType: 'weekly', startTime: '09:00', endTime: '17:00' };
  const baseLunchInput = { clinicianId: 'cln-1', dayOfWeek: 'daily', startTime: '13:00', endTime: '14:00' };

  describe('create (canonical manager-facing availability)', () => {
    it('rejects creating a template for a clinic in a different org (previously no check at all)', async () => {
      prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-9', client_org_id: 'org-2' });
      const result = await service.create({ clinic_id: 'clinic-9', clinician_id: 'cln-1', recurrence_type: 'weekly', start_time: '09:00', end_time: '17:00' } as any, managerSameOrg);
      expect(result.success).toBe(false);
      expect(prisma.clinicianAvailability.create).not.toHaveBeenCalled();
    });

    it('allows creating a template for a clinic in the caller\'s own org', async () => {
      prisma.clinicianAvailability.create.mockResolvedValue({
        id: 'avail-1', clinician: { id: 'cln-1', first_name: 'A', last_name: 'B' }, clinic: { id: 'clinic-1', name: 'C' }, room: null,
      });
      const result = await service.create({ clinic_id: 'clinic-1', clinician_id: 'cln-1', recurrence_type: 'weekly', start_time: '09:00', end_time: '17:00' } as any, managerSameOrg);
      expect(result.success).toBe(true);
    });
  });

  describe('saveClinicianAvailability', () => {
    it('allows a clinician to save their own availability', async () => {
      await expect(service.saveClinicianAvailability(baseAvailInput as any, ownClinicianUser)).resolves.toBeDefined();
    });

    it('rejects a clinician saving a template targeting a different clinician', async () => {
      await expect(service.saveClinicianAvailability(baseAvailInput as any, otherClinicianUser)).rejects.toThrow(NotFoundException);
    });

    it('allows a same-org manager to save it', async () => {
      await expect(service.saveClinicianAvailability(baseAvailInput as any, managerSameOrg)).resolves.toBeDefined();
    });

    it('rejects a different-org manager (previously had NO org check at all)', async () => {
      await expect(service.saveClinicianAvailability(baseAvailInput as any, managerOtherOrg)).rejects.toThrow(NotFoundException);
    });

    it('re-checks ownership against the EXISTING record on update, not just the input clinicianId', async () => {
      prisma.clinicianAvailability.findUnique.mockResolvedValue({
        id: 'avail-9', clinician_id: 'cln-2', clinic: { client_org_id: 'org-1' },
      });
      await expect(
        service.saveClinicianAvailability({ ...baseAvailInput, id: 'avail-9' } as any, ownClinicianUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteClinicianAvailability', () => {
    it('allows a clinician to delete their own record', async () => {
      prisma.clinicianAvailability.findUnique.mockResolvedValue({ id: 'avail-1', clinician_id: 'cln-1', is_deleted: false, clinic: { client_org_id: 'org-1' } });
      await expect(service.deleteClinicianAvailability('avail-1', ownClinicianUser)).resolves.toBe(true);
    });

    it('rejects a clinician deleting another clinician\'s record', async () => {
      prisma.clinicianAvailability.findUnique.mockResolvedValue({ id: 'avail-1', clinician_id: 'cln-1', is_deleted: false, clinic: { client_org_id: 'org-1' } });
      await expect(service.deleteClinicianAvailability('avail-1', otherClinicianUser)).rejects.toThrow(NotFoundException);
      expect(prisma.clinicianAvailability.update).not.toHaveBeenCalled();
    });
  });

  describe('saveLunchBreak / deleteLunchBreak', () => {
    it('rejects a clinician saving a lunch break for a different clinician', async () => {
      await expect(service.saveLunchBreak(baseLunchInput as any, otherClinicianUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects a clinician deleting another clinician\'s lunch break', async () => {
      prisma.lunchBreaks.findUnique.mockResolvedValue({ id: 'lb-1', clinician_id: 'cln-1', is_deleted: false, clinic: { client_org_id: 'org-1' } });
      await expect(service.deleteLunchBreak('lb-1', otherClinicianUser)).rejects.toThrow(NotFoundException);
      expect(prisma.lunchBreaks.update).not.toHaveBeenCalled();
    });

    it('allows a clinician to delete their own lunch break', async () => {
      prisma.lunchBreaks.findUnique.mockResolvedValue({ id: 'lb-1', clinician_id: 'cln-1', is_deleted: false, clinic: { client_org_id: 'org-1' } });
      await expect(service.deleteLunchBreak('lb-1', ownClinicianUser)).resolves.toBe(true);
    });
  });
});

// REQ017 — dual-mode scheduling (session/token mode). availableSlots()'s
// slot-generation algorithm and the new sessionAvailability() method had no
// prior test coverage at all (only the security/self-scoping suite above
// existed for this service) — this describe block is the first coverage
// for the actual scheduling logic.
describe('AvailabilityService — REQ017 session/hybrid mode', () => {
  let service: AvailabilityService;
  let prisma: {
    clinicians: { findUnique: jest.Mock };
    products: { findUnique: jest.Mock };
    clinicianAvailability: { findMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock };
    lunchBreaks: { findMany: jest.Mock };
    spacerBlocks: { findMany: jest.Mock };
    appointments: { findMany: jest.Mock; count: jest.Mock };
  };

  const clinician = { id: 'cln-1', first_name: 'Sarah', last_name: 'Mitchell' };

  beforeEach(async () => {
    prisma = {
      clinicians: { findUnique: jest.fn().mockResolvedValue(clinician) },
      products: { findUnique: jest.fn().mockResolvedValue({ id: 'svc-1', duration_minutes: 15 }) },
      clinicianAvailability: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
      lunchBreaks: { findMany: jest.fn().mockResolvedValue([]) },
      spacerBlocks: { findMany: jest.fn().mockResolvedValue([]) },
      appointments: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [AvailabilityService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(AvailabilityService);
  });

  describe('availableSlots — skips non-slot windows', () => {
    it('does not generate discrete slots for a session-mode window', async () => {
      prisma.clinicianAvailability.findMany.mockResolvedValue([
        { mode: 'session', start_time: '18:00', end_time: '21:00', valid_until: null, day_of_week: 1, recurrence_type: 'weekly' },
      ]);
      const slots = await service.availableSlots('cln-1', '2026-08-24', undefined);
      expect(slots).toEqual([]);
    });

    it('still generates discrete slots for a slot-mode window (regression: extension must not break existing behavior)', async () => {
      prisma.clinicianAvailability.findMany.mockResolvedValue([
        { mode: 'slot', start_time: '09:00', end_time: '09:30', valid_until: null, day_of_week: 1, recurrence_type: 'weekly' },
      ]);
      const slots = await service.availableSlots('cln-1', '2026-08-24', undefined);
      expect(slots.length).toBe(1);
    });
  });

  describe('sessionAvailability', () => {
    const sessionWindow = {
      mode: 'session', start_time: '18:00', end_time: '21:00', capacity: 40, overbook_allowance: 3, valid_until: null,
    };

    it('returns null when no session/hybrid window matches this clinician/date', async () => {
      prisma.clinicianAvailability.findFirst.mockResolvedValue(null);
      const result = await service.sessionAvailability('cln-1', '2026-08-24', undefined);
      expect(result).toBeNull();
    });

    it('computes remaining/estimate correctly from the current booked count', async () => {
      prisma.clinicianAvailability.findFirst.mockResolvedValue(sessionWindow);
      prisma.appointments.count.mockResolvedValue(10);
      const result = await service.sessionAvailability('cln-1', '2026-08-24', 'svc-1');
      expect(result).toMatchObject({
        mode: 'session', capacity: 40, overbookAllowance: 3, bookedCount: 10, remaining: 33, isFull: false,
        estimatedWaitMinutes: 150, // 10 * 15 (the mocked service's duration_minutes)
      });
    });

    it('reports isFull once capacity + overbook_allowance is reached', async () => {
      prisma.clinicianAvailability.findFirst.mockResolvedValue(sessionWindow);
      prisma.appointments.count.mockResolvedValue(43);
      const result = await service.sessionAvailability('cln-1', '2026-08-24', undefined);
      expect(result!.remaining).toBe(0);
      expect(result!.isFull).toBe(true);
    });

    it('only counts non-slot-mode appointments toward the session count', async () => {
      prisma.clinicianAvailability.findFirst.mockResolvedValue(sessionWindow);
      await service.sessionAvailability('cln-1', '2026-08-24', undefined);
      const where = prisma.appointments.count.mock.calls[0][0].where;
      expect(where.booking_mode).toEqual({ not: 'slot' });
    });
  });
});
