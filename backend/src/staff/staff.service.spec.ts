import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { StaffService } from './staff.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Security regression coverage: findOne/update/deactivate previously had NO
// org-scoping check at all -- only findAll() did. A manager from ANY
// organization could view, edit, or DEACTIVATE any other organization's
// staff account just by knowing/guessing its id.
describe('StaffService — access scoping', () => {
  let service: StaffService;
  let prisma: { userProfiles: { findUnique: jest.Mock; update: jest.Mock } };

  const managerSameOrg: JwtPayload = { sub: 'u-1', roles: ['manager'], client_org_id: 'org-1' } as JwtPayload;
  const managerOtherOrg: JwtPayload = { sub: 'u-2', roles: ['manager'], client_org_id: 'org-2' } as JwtPayload;
  const platformAdmin: JwtPayload = { sub: 'u-3', roles: ['admin'], client_org_id: null } as JwtPayload;

  const staffRow = { id: 'staff-1', is_deleted: false, client_org_id: 'org-1', first_name: 'A', last_name: 'B', role: { name: 'staff' } };

  beforeEach(async () => {
    prisma = {
      userProfiles: {
        findUnique: jest.fn().mockResolvedValue(staffRow),
        update: jest.fn().mockResolvedValue(staffRow),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [StaffService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(StaffService);
  });

  describe('findOne', () => {
    it('allows a same-org manager', async () => {
      await expect(service.findOne('staff-1', managerSameOrg)).resolves.toBeDefined();
    });

    it('rejects a different-org manager', async () => {
      await expect(service.findOne('staff-1', managerOtherOrg)).rejects.toThrow(NotFoundException);
    });

    it('allows a platform admin (org-less)', async () => {
      await expect(service.findOne('staff-1', platformAdmin)).resolves.toBeDefined();
    });
  });

  describe('update', () => {
    it('rejects a different-org manager, no write performed', async () => {
      await expect(service.update('staff-1', {} as any, managerOtherOrg)).rejects.toThrow(NotFoundException);
      expect(prisma.userProfiles.update).not.toHaveBeenCalled();
    });

    it('allows a same-org manager', async () => {
      await expect(service.update('staff-1', {} as any, managerSameOrg)).resolves.toBeDefined();
    });
  });

  describe('deactivate', () => {
    it('rejects a different-org manager, no write performed (previously could deactivate any org\'s staff)', async () => {
      await expect(service.deactivate('staff-1', managerOtherOrg)).rejects.toThrow(NotFoundException);
      expect(prisma.userProfiles.update).not.toHaveBeenCalled();
    });

    it('allows a same-org manager', async () => {
      await expect(service.deactivate('staff-1', managerSameOrg)).resolves.toBeDefined();
    });
  });

  // Regression coverage for a real bug found live via e2e: phone is globally
  // @unique on UserProfiles, but create()/update() let a collision on it (or
  // email, on update) hit Prisma directly, leaking a raw unique-constraint
  // error — including an internal file path — straight to the client instead
  // of a clean ConflictException.
  describe('update — email/phone conflict', () => {
    it('rejects a duplicate email without writing', async () => {
      prisma.userProfiles.findUnique = jest.fn((args: any) =>
        args.where.id ? Promise.resolve(staffRow) : Promise.resolve({ id: 'other-user' }),
      );
      await expect(
        service.update('staff-1', { email: 'taken@example.com' } as any, managerSameOrg),
      ).rejects.toThrow(ConflictException);
      expect(prisma.userProfiles.update).not.toHaveBeenCalled();
    });

    it('rejects a duplicate phone without writing', async () => {
      prisma.userProfiles.findUnique = jest.fn((args: any) =>
        args.where.id ? Promise.resolve(staffRow) : Promise.resolve({ id: 'other-user' }),
      );
      await expect(
        service.update('staff-1', { phone: '+919810000000' } as any, managerSameOrg),
      ).rejects.toThrow(ConflictException);
      expect(prisma.userProfiles.update).not.toHaveBeenCalled();
    });
  });
});

describe('StaffService — create', () => {
  let service: StaffService;
  let prisma: any;
  const currentUser: JwtPayload = { sub: 'u-1', roles: ['manager'], client_org_id: 'org-1' } as JwtPayload;
  const createInput = {
    name: 'New Staff', email: 'new.staff@example.com', phone: '+919810000099',
    role: 'Receptionist', password: 'password123',
  } as any;

  beforeEach(async () => {
    prisma = {
      userProfiles: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'new-id' }) },
      userRoles: { findFirst: jest.fn().mockResolvedValue({ id: 'role-staff' }) },
      users: { create: jest.fn().mockResolvedValue({ id: 'new-id' }) },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [StaffService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(StaffService);
  });

  it('creates a staff member when email and phone are both free', async () => {
    await expect(service.create(createInput, currentUser)).resolves.toBeDefined();
    expect(prisma.userProfiles.create).toHaveBeenCalled();
  });

  it('rejects a duplicate email without creating a user', async () => {
    prisma.userProfiles.findUnique = jest.fn((args: any) => (args.where.email ? Promise.resolve({ id: 'existing' }) : Promise.resolve(null)));
    await expect(service.create(createInput, currentUser)).rejects.toThrow(ConflictException);
    expect(prisma.users.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate phone without creating a user', async () => {
    prisma.userProfiles.findUnique = jest.fn((args: any) => (args.where.phone ? Promise.resolve({ id: 'existing' }) : Promise.resolve(null)));
    await expect(service.create(createInput, currentUser)).rejects.toThrow(ConflictException);
    expect(prisma.users.create).not.toHaveBeenCalled();
  });
});
