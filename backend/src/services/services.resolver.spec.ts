import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ServicesResolver } from './services.resolver';
import { ServicesService } from './services.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

describe('ServicesResolver', () => {
  let resolver: ServicesResolver;
  let service: { findAll: jest.Mock; findOne: jest.Mock; create: jest.Mock; update: jest.Mock };
  const reflector = new Reflector();

  beforeEach(async () => {
    service = { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn(), update: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServicesResolver, { provide: ServicesService, useValue: service }],
    }).compile();
    resolver = module.get(ServicesResolver);
  });

  describe('role gating (@Auth annotations)', () => {
    it('leaves reads ungated for any authenticated role', () => {
      expect(reflector.get(ROLES_KEY, ServicesResolver.prototype.services)).toBeUndefined();
      expect(reflector.get(ROLES_KEY, ServicesResolver.prototype.service)).toBeUndefined();
    });

    it.each([
      ['createService', ServicesResolver.prototype.createService],
      ['updateService', ServicesResolver.prototype.updateService],
    ])('%s is gated to manager/admin/super_admin', (_name, handler) => {
      expect(reflector.get(ROLES_KEY, handler)).toEqual(['manager', 'admin', 'super_admin']);
    });
  });

  describe('argument passthrough', () => {
    it('services forwards clinicId, isActive, and user', async () => {
      const user = { client_org_id: 'org-a' } as any;
      service.findAll.mockResolvedValue([]);
      await resolver.services('clinic-a', true, user);
      expect(service.findAll).toHaveBeenCalledWith('clinic-a', true, user);
    });

    it('createService forwards input and user (BUG001 — stamps client_org_id)', async () => {
      const user = { client_org_id: 'org-a' } as any;
      service.create.mockResolvedValue({ id: 'svc-1' });
      await resolver.createService({ name: 'X' } as any, user);
      expect(service.create).toHaveBeenCalledWith({ name: 'X' }, user);
    });

    it('updateService forwards id, input, and user', async () => {
      const user = { client_org_id: 'org-a' } as any;
      service.update.mockResolvedValue({ id: 'svc-1' });
      await resolver.updateService('svc-1', { name: 'X' } as any, user);
      expect(service.update).toHaveBeenCalledWith('svc-1', { name: 'X' }, user);
    });
  });
});
