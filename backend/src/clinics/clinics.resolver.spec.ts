import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ClinicsResolver } from './clinics.resolver';
import { ClinicsService } from './clinics.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

describe('ClinicsResolver', () => {
  let resolver: ClinicsResolver;
  let service: { findAll: jest.Mock; findOne: jest.Mock; create: jest.Mock; update: jest.Mock };
  const reflector = new Reflector();

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClinicsResolver, { provide: ClinicsService, useValue: service }],
    }).compile();
    resolver = module.get(ClinicsResolver);
  });

  describe('role gating (@Auth annotations)', () => {
    it('leaves clinics/clinic ungated — any authenticated role can read (booking wizard needs it)', () => {
      expect(reflector.get(ROLES_KEY, ClinicsResolver.prototype.clinics)).toBeUndefined();
      expect(reflector.get(ROLES_KEY, ClinicsResolver.prototype.clinic)).toBeUndefined();
    });

    it.each([
      ['createClinic', ClinicsResolver.prototype.createClinic],
      ['updateClinic', ClinicsResolver.prototype.updateClinic],
    ])('%s is gated to manager/admin/super_admin', (_name, handler) => {
      expect(reflector.get(ROLES_KEY, handler)).toEqual(['manager', 'admin', 'super_admin']);
    });
  });

  describe('argument passthrough', () => {
    it('clinics forwards the user and optional search.limit to the service', async () => {
      const user = { client_org_id: 'org-a' } as any;
      service.findAll.mockResolvedValue([]);
      await resolver.clinics(user, { limit: 10 } as any);
      expect(service.findAll).toHaveBeenCalledWith(user, 10);
    });

    it('clinics tolerates an omitted search argument', async () => {
      const user = { client_org_id: 'org-a' } as any;
      service.findAll.mockResolvedValue([]);
      await resolver.clinics(user, undefined);
      expect(service.findAll).toHaveBeenCalledWith(user, undefined);
    });

    it('clinic forwards id and user to the service', async () => {
      const user = { client_org_id: 'org-a' } as any;
      service.findOne.mockResolvedValue({ id: 'clinic-a1' });
      await resolver.clinic('clinic-a1', user);
      expect(service.findOne).toHaveBeenCalledWith('clinic-a1', user);
    });
  });
});
