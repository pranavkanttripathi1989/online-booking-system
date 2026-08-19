import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ConflictException } from '@nestjs/common';
import { LookupsResolver } from './lookups.resolver';
import { LookupsService } from './lookups.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

describe('LookupsResolver', () => {
  let resolver: LookupsResolver;
  let service: { findAll: jest.Mock; create: jest.Mock; update: jest.Mock; remove: jest.Mock };
  const reflector = new Reflector();

  beforeEach(async () => {
    service = { findAll: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [LookupsResolver, { provide: LookupsService, useValue: service }],
    }).compile();
    resolver = module.get(LookupsResolver);
  });

  describe('role gating (@Auth annotations)', () => {
    it('leaves clinicianTypes/roomTypes ungated for any authenticated role', () => {
      expect(reflector.get(ROLES_KEY, LookupsResolver.prototype.clinicianTypes)).toBeUndefined();
      expect(reflector.get(ROLES_KEY, LookupsResolver.prototype.roomTypes)).toBeUndefined();
    });

    it.each([
      ['createClinicianType', LookupsResolver.prototype.createClinicianType],
      ['updateClinicianType', LookupsResolver.prototype.updateClinicianType],
      ['deleteClinicianType', LookupsResolver.prototype.deleteClinicianType],
      ['createRoomType', LookupsResolver.prototype.createRoomType],
      ['updateRoomType', LookupsResolver.prototype.updateRoomType],
      ['deleteRoomType', LookupsResolver.prototype.deleteRoomType],
    ])('%s is gated to admin/super_admin', (_name, handler) => {
      expect(reflector.get(ROLES_KEY, handler)).toEqual(['admin', 'super_admin']);
    });
  });

  describe('dispatches to the correct model', () => {
    it('createClinicianType calls service.create with "clinicianTypeModel"', async () => {
      service.create.mockResolvedValue({ id: 'ct-1' });
      await resolver.createClinicianType({ name: 'X' } as any);
      expect(service.create).toHaveBeenCalledWith('clinicianTypeModel', { name: 'X' });
    });

    it('createRoomType calls service.create with "roomTypeModel"', async () => {
      service.create.mockResolvedValue({ id: 'rt-1' });
      await resolver.createRoomType({ name: 'X' } as any);
      expect(service.create).toHaveBeenCalledWith('roomTypeModel', { name: 'X' });
    });

    it('deleteRoomType calls service.remove with "roomTypeModel" and the id', async () => {
      service.remove.mockResolvedValue(true);
      await resolver.deleteRoomType('rt-1');
      expect(service.remove).toHaveBeenCalledWith('roomTypeModel', 'rt-1');
    });
  });

  describe('toResult mapping (shared with languages)', () => {
    it('returns {success:true} on success', async () => {
      service.create.mockResolvedValue({ id: 'ct-1' });
      const result = await resolver.createClinicianType({ name: 'X' } as any);
      expect(result).toEqual({ success: true, userErrors: [] });
    });

    it('maps a ConflictException into {success:false, userErrors} instead of throwing', async () => {
      service.create.mockRejectedValue(new ConflictException('"X" already exists (case-insensitive match)'));
      const result = await resolver.createClinicianType({ name: 'X' } as any);
      expect(result).toEqual({
        success: false,
        userErrors: [{ message: '"X" already exists (case-insensitive match)' }],
      });
    });

    it('re-throws a non-HttpException error rather than swallowing it', async () => {
      service.remove.mockRejectedValue(new Error('db connection lost'));
      await expect(resolver.deleteClinicianType('ct-1')).rejects.toThrow('db connection lost');
    });
  });
});
