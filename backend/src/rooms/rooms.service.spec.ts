import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('RoomsService', () => {
  let service: RoomsService;
  let prisma: {
    rooms: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; count: jest.Mock };
    clinics: { findUnique: jest.Mock };
    roomTypeModel: { findUnique: jest.Mock };
    clinicianTypeModel: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u2', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  const clinicA = { id: 'clinic-a', client_org_id: 'org-a', is_deleted: false };
  const clinicB = { id: 'clinic-b', client_org_id: 'org-b', is_deleted: false };

  const roomA = {
    id: 'room-a1',
    room_number: 'Room 1',
    capacity: 4,
    clinic_id: 'clinic-a',
    is_deleted: false,
    room_type: null,
    clinician_type: null,
    clinic: clinicA,
  };
  const roomB = { ...roomA, id: 'room-b1', clinic_id: 'clinic-b', clinic: clinicB };

  beforeEach(async () => {
    prisma = {
      rooms: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
      clinics: { findUnique: jest.fn() },
      roomTypeModel: { findUnique: jest.fn() },
      clinicianTypeModel: { findUnique: jest.fn() },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(RoomsService);
  });

  describe('findAll — tenant isolation', () => {
    it('scopes to the caller org via the clinic relation', async () => {
      prisma.rooms.findMany.mockResolvedValue([]);
      await service.findAll(undefined, orgAUser);
      expect(prisma.rooms.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clinic: { client_org_id: 'org-a' } }) }),
      );
    });

    it('does not scope by org for a platform-wide caller', async () => {
      prisma.rooms.findMany.mockResolvedValue([]);
      await service.findAll(undefined, platformUser);
      expect(prisma.rooms.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clinic: undefined }) }),
      );
    });

    it('applies an explicit clinicId filter additively', async () => {
      prisma.rooms.findMany.mockResolvedValue([]);
      await service.findAll('clinic-a', orgAUser);
      expect(prisma.rooms.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clinic_id: 'clinic-a' }) }),
      );
    });

    it('shapes room_number into both name and room_number, resolving type names', async () => {
      prisma.rooms.findMany.mockResolvedValue([{ ...roomA, room_type: 'rt-1', clinician_type: 'ct-1' }]);
      prisma.roomTypeModel.findUnique.mockResolvedValue({ id: 'rt-1', name: 'Exam Room' });
      prisma.clinicianTypeModel.findUnique.mockResolvedValue({ id: 'ct-1', name: 'Consultant' });
      const [result] = await service.findAll(undefined, orgAUser);
      expect(result.name).toBe('Room 1');
      expect(result.roomTypeName).toBe('Exam Room');
      expect(result.clinicianTypeName).toBe('Consultant');
    });
  });

  describe('findAllPaginated — tenant isolation + search + pageInfo', () => {
    it('scopes to the caller org and applies free-text search on room_number', async () => {
      prisma.rooms.count.mockResolvedValue(1);
      prisma.rooms.findMany.mockResolvedValue([roomA]);
      await service.findAllPaginated('Room', 10, 0, orgAUser);
      const [countArgs] = prisma.rooms.count.mock.calls[0];
      expect(countArgs.where).toEqual(
        expect.objectContaining({
          clinic: { client_org_id: 'org-a' },
          room_number: { contains: 'Room', mode: 'insensitive' },
        }),
      );
    });

    it('computes hasNextPage/hasPreviousPage from total/limit/offset', async () => {
      prisma.rooms.count.mockResolvedValue(25);
      prisma.rooms.findMany.mockResolvedValue([roomA]);
      const result = await service.findAllPaginated(undefined, 10, 10, orgAUser);
      expect(result.pageInfo).toEqual({ total: 25, limit: 10, offset: 10, hasNextPage: true, hasPreviousPage: true });
    });

    it('defaults limit to 20 and offset to 0', async () => {
      prisma.rooms.count.mockResolvedValue(0);
      prisma.rooms.findMany.mockResolvedValue([]);
      const result = await service.findAllPaginated(undefined, undefined, undefined, orgAUser);
      expect(result.pageInfo.limit).toBe(20);
      expect(result.pageInfo.offset).toBe(0);
    });
  });

  describe('findOne — tenant isolation', () => {
    it('returns a same-org room', async () => {
      prisma.rooms.findUnique.mockResolvedValue(roomA);
      const result = await service.findOne('room-a1', orgAUser);
      expect(result.id).toBe('room-a1');
    });

    it('rejects a cross-org room with NotFoundException', async () => {
      prisma.rooms.findUnique.mockResolvedValue(roomB);
      await expect(service.findOne('room-b1', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects a soft-deleted room', async () => {
      prisma.rooms.findUnique.mockResolvedValue({ ...roomA, is_deleted: true });
      await expect(service.findOne('room-a1', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects when the room does not exist', async () => {
      prisma.rooms.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing', orgAUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create — closes the cross-org create gap at the clinic boundary', () => {
    it('rejects when clinic_id is omitted', async () => {
      await expect(service.create({ name: 'New Room' } as any, orgAUser)).rejects.toThrow(BadRequestException);
      expect(prisma.rooms.create).not.toHaveBeenCalled();
    });

    it('rejects a clinic_id belonging to a different org', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      await expect(
        service.create({ name: 'New Room', clinic_id: 'clinic-b' } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.rooms.create).not.toHaveBeenCalled();
    });

    it('rejects a nonexistent clinic_id', async () => {
      prisma.clinics.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ name: 'New Room', clinic_id: 'missing' } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates when the clinic belongs to the caller org', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.rooms.create.mockResolvedValue(roomA);
      const result = await service.create({ name: 'Room 1', clinic_id: 'clinic-a', capacity: 4 } as any, orgAUser);
      expect(prisma.rooms.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ clinic_id: 'clinic-a', room_number: 'Room 1' }) }),
      );
      expect(result.id).toBe('room-a1');
    });

    it('allows an org-less platform caller to attach any clinic', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      prisma.rooms.create.mockResolvedValue(roomB);
      await expect(
        service.create({ name: 'Room B', clinic_id: 'clinic-b' } as any, platformUser),
      ).resolves.toBeDefined();
    });
  });

  describe('update — tenant isolation on both the existing room and any clinic re-assignment', () => {
    it('rejects when the room does not exist', async () => {
      prisma.rooms.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', {} as any, orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects a cross-org existing room', async () => {
      prisma.rooms.findUnique.mockResolvedValue(roomB);
      await expect(service.update('room-b1', { name: 'X' } as any, orgAUser)).rejects.toThrow(NotFoundException);
      expect(prisma.rooms.update).not.toHaveBeenCalled();
    });

    it('rejects re-assigning the room to a different-org clinic', async () => {
      prisma.rooms.findUnique.mockResolvedValue(roomA);
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      await expect(
        service.update('room-a1', { name: 'X', clinic_id: 'clinic-b' } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.rooms.update).not.toHaveBeenCalled();
    });

    it('does not re-check the clinic when clinic_id is unchanged', async () => {
      prisma.rooms.findUnique.mockResolvedValue(roomA);
      prisma.rooms.update.mockResolvedValue(roomA);
      await service.update('room-a1', { name: 'Renamed', clinic_id: 'clinic-a' } as any, orgAUser);
      expect(prisma.clinics.findUnique).not.toHaveBeenCalled();
    });

    it('updates a same-org room', async () => {
      prisma.rooms.findUnique.mockResolvedValue(roomA);
      prisma.rooms.update.mockResolvedValue({ ...roomA, room_number: 'Renamed' });
      const result = await service.update('room-a1', { name: 'Renamed' } as any, orgAUser);
      expect(result.name).toBe('Renamed');
    });
  });

  describe('remove — tenant isolation (returns a result object, not a throw)', () => {
    it('returns {success:false} when the room does not exist', async () => {
      prisma.rooms.findUnique.mockResolvedValue(null);
      const result = await service.remove('missing', orgAUser);
      expect(result).toEqual({ success: false, userErrors: [{ message: 'Room not found' }] });
    });

    it('returns {success:false} for a cross-org room without ever calling update', async () => {
      prisma.rooms.findUnique.mockResolvedValue(roomB);
      const result = await service.remove('room-b1', orgAUser);
      expect(result).toEqual({ success: false, userErrors: [{ message: 'Room not found' }] });
      expect(prisma.rooms.update).not.toHaveBeenCalled();
    });

    it('soft-deletes a same-org room', async () => {
      prisma.rooms.findUnique.mockResolvedValue(roomA);
      prisma.rooms.update.mockResolvedValue({ ...roomA, is_deleted: true });
      const result = await service.remove('room-a1', orgAUser);
      expect(prisma.rooms.update).toHaveBeenCalledWith({ where: { id: 'room-a1' }, data: { is_deleted: true } });
      expect(result).toEqual({ success: true, userErrors: [] });
    });
  });
});
