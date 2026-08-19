import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { RoomsResolver } from './rooms.resolver';
import { RoomsService } from './rooms.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

describe('RoomsResolver', () => {
  let resolver: RoomsResolver;
  let service: { findAll: jest.Mock; findOne: jest.Mock; findAllPaginated: jest.Mock; create: jest.Mock; update: jest.Mock; remove: jest.Mock };
  const reflector = new Reflector();

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findAllPaginated: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomsResolver, { provide: RoomsService, useValue: service }],
    }).compile();
    resolver = module.get(RoomsResolver);
  });

  describe('role gating (@Auth annotations)', () => {
    it('leaves reads ungated for any authenticated role', () => {
      expect(reflector.get(ROLES_KEY, RoomsResolver.prototype.rooms)).toBeUndefined();
      expect(reflector.get(ROLES_KEY, RoomsResolver.prototype.room)).toBeUndefined();
      expect(reflector.get(ROLES_KEY, RoomsResolver.prototype.roomsPaginated)).toBeUndefined();
    });

    it.each([
      ['createRoom', RoomsResolver.prototype.createRoom],
      ['updateRoom', RoomsResolver.prototype.updateRoom],
      ['deleteRoom', RoomsResolver.prototype.deleteRoom],
    ])('%s is gated to manager/admin/super_admin', (_name, handler) => {
      expect(reflector.get(ROLES_KEY, handler)).toEqual(['manager', 'admin', 'super_admin']);
    });
  });

  describe('argument passthrough', () => {
    it('rooms forwards clinicId and user', async () => {
      const user = { client_org_id: 'org-a' } as any;
      service.findAll.mockResolvedValue([]);
      await resolver.rooms('clinic-a', user);
      expect(service.findAll).toHaveBeenCalledWith('clinic-a', user);
    });

    it('roomsPaginated forwards search/limit/offset and user', async () => {
      const user = { client_org_id: 'org-a' } as any;
      service.findAllPaginated.mockResolvedValue({ data: [], pageInfo: {} });
      await resolver.roomsPaginated({ search: 'Room', limit: 10, offset: 0 } as any, user);
      expect(service.findAllPaginated).toHaveBeenCalledWith('Room', 10, 0, user);
    });

    it('createRoom forwards input and user', async () => {
      const user = { client_org_id: 'org-a' } as any;
      service.create.mockResolvedValue({ id: 'room-1' });
      await resolver.createRoom({ name: 'X' } as any, user);
      expect(service.create).toHaveBeenCalledWith({ name: 'X' }, user);
    });

    it('deleteRoom forwards id and user', async () => {
      const user = { client_org_id: 'org-a' } as any;
      service.remove.mockResolvedValue({ success: true, userErrors: [] });
      await resolver.deleteRoom('room-1', user);
      expect(service.remove).toHaveBeenCalledWith('room-1', user);
    });
  });
});
