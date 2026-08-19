import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { AvailabilityResolver } from './availability.resolver';
import { AvailabilityService } from './availability.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';

describe('AvailabilityResolver', () => {
  let resolver: AvailabilityResolver;
  let service: Record<string, jest.Mock>;
  const reflector = new Reflector();

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getClinicianAvailability: jest.fn(),
      getLunchBreaks: jest.fn(),
      getRooms: jest.fn(),
      saveClinicianAvailability: jest.fn(),
      deleteClinicianAvailability: jest.fn(),
      saveLunchBreak: jest.fn(),
      deleteLunchBreak: jest.fn(),
      availableSlots: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [AvailabilityResolver, { provide: AvailabilityService, useValue: service }],
    }).compile();
    resolver = module.get(AvailabilityResolver);
  });

  describe('getClinicianAvailability — SECURITY fix (@Public)', () => {
    it('is explicitly marked @Public — the public doctor-profile page needs it reachable with no JWT at all', () => {
      expect(reflector.get(IS_PUBLIC_KEY, AvailabilityResolver.prototype.getClinicianAvailability)).toBe(true);
    });

    it('is not role-gated (no @Auth), consistent with being public', () => {
      expect(reflector.get(ROLES_KEY, AvailabilityResolver.prototype.getClinicianAvailability)).toBeUndefined();
    });

    it('forwards clinicianId to the service unchanged', async () => {
      service.getClinicianAvailability.mockResolvedValue([]);
      await resolver.getClinicianAvailability('clinician-1');
      expect(service.getClinicianAvailability).toHaveBeenCalledWith('clinician-1');
    });
  });

  describe('role gating (@Auth annotations) — everything else unaffected by the fix above', () => {
    it('leaves reads ungated for any authenticated role', () => {
      expect(reflector.get(ROLES_KEY, AvailabilityResolver.prototype.availabilities)).toBeUndefined();
      expect(reflector.get(ROLES_KEY, AvailabilityResolver.prototype.getLunchBreaks)).toBeUndefined();
      expect(reflector.get(ROLES_KEY, AvailabilityResolver.prototype.getRooms)).toBeUndefined();
      expect(reflector.get(ROLES_KEY, AvailabilityResolver.prototype.availableSlots)).toBeUndefined();
    });

    it('leaves getLunchBreaks/getRooms/availableSlots NOT @Public — only getClinicianAvailability got that change', () => {
      expect(reflector.get(IS_PUBLIC_KEY, AvailabilityResolver.prototype.getLunchBreaks)).toBeUndefined();
      expect(reflector.get(IS_PUBLIC_KEY, AvailabilityResolver.prototype.getRooms)).toBeUndefined();
      expect(reflector.get(IS_PUBLIC_KEY, AvailabilityResolver.prototype.availableSlots)).toBeUndefined();
    });

    it.each([
      ['createAvailability', AvailabilityResolver.prototype.createAvailability],
      ['updateAvailability', AvailabilityResolver.prototype.updateAvailability],
      ['deleteAvailability', AvailabilityResolver.prototype.deleteAvailability],
    ])('%s is gated to manager/admin/super_admin', (_name, handler) => {
      expect(reflector.get(ROLES_KEY, handler)).toEqual(['manager', 'admin', 'super_admin']);
    });

    it.each([
      ['saveClinicianAvailability', AvailabilityResolver.prototype.saveClinicianAvailability],
      ['deleteClinicianAvailability', AvailabilityResolver.prototype.deleteClinicianAvailability],
      ['saveLunchBreak', AvailabilityResolver.prototype.saveLunchBreak],
      ['deleteLunchBreak', AvailabilityResolver.prototype.deleteLunchBreak],
    ])('%s additionally allows clinician (self-service surface)', (_name, handler) => {
      expect(reflector.get(ROLES_KEY, handler)).toEqual(['manager', 'admin', 'super_admin', 'clinician']);
    });
  });
});
