import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
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

  // context/open-questions.md #3, resolved: real backdatable `since` and a
  // real admin-set password reset.
  describe('update — since and password reset', () => {
    it('writes a backdated staff_since when since is provided', async () => {
      await service.update('staff-1', { since: '2024-01-15' } as any, managerSameOrg);
      const call = prisma.userProfiles.update.mock.calls[0][0];
      expect(call.data.staff_since).toEqual(new Date('2024-01-15'));
    });

    it('leaves staff_since untouched when since is omitted', async () => {
      await service.update('staff-1', { name: 'New Name' } as any, managerSameOrg);
      const call = prisma.userProfiles.update.mock.calls[0][0];
      expect(call.data.staff_since).toBeUndefined();
    });

    it('hashes and writes a new password when provided', async () => {
      await service.update('staff-1', { password: 'NewPassword123!' } as any, managerSameOrg);
      const call = prisma.userProfiles.update.mock.calls[0][0];
      expect(call.data.password).not.toBe('NewPassword123!');
      expect(await bcrypt.compare('NewPassword123!', call.data.password)).toBe(true);
    });

    it('never clears the existing password when none is provided', async () => {
      await service.update('staff-1', { name: 'New Name' } as any, managerSameOrg);
      const call = prisma.userProfiles.update.mock.calls[0][0];
      expect(call.data.password).toBeUndefined();
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

  // context/open-questions.md #3, resolved: status/since are real requirements.
  it('defaults status to active and leaves staff_since null when neither is provided', async () => {
    await service.create(createInput, currentUser);
    const call = prisma.userProfiles.create.mock.calls[0][0];
    expect(call.data.staff_status).toBe('active');
    expect(call.data.staff_since).toBeUndefined();
  });

  it('honors an explicit status and backdated since', async () => {
    await service.create({ ...createInput, status: 'on_leave', since: '2023-06-01' } as any, currentUser);
    const call = prisma.userProfiles.create.mock.calls[0][0];
    expect(call.data.staff_status).toBe('on_leave');
    expect(call.data.staff_since).toEqual(new Date('2023-06-01'));
  });
});

describe('StaffService — toGraphQL since fallback', () => {
  let service: StaffService;
  let prisma: { userProfiles: { findMany: jest.Mock } };
  const user: JwtPayload = { sub: 'u-1', roles: ['manager'], client_org_id: 'org-1' } as JwtPayload;

  beforeEach(async () => {
    prisma = { userProfiles: { findMany: jest.fn() } };
    const module: TestingModule = await Test.createTestingModule({
      providers: [StaffService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(StaffService);
  });

  it('falls back to created_at when staff_since was never set (pre-existing rows)', async () => {
    const createdAt = new Date('2022-01-01');
    prisma.userProfiles.findMany.mockResolvedValue([
      { id: 's-1', first_name: 'A', last_name: 'B', role: {}, staff_since: null, created_at: createdAt },
    ]);
    const [row] = await service.findAll(undefined, undefined, undefined, user);
    expect(row.since).toBe(createdAt);
  });

  it('uses the real staff_since when it was explicitly set', async () => {
    const since = new Date('2020-05-01');
    prisma.userProfiles.findMany.mockResolvedValue([
      { id: 's-1', first_name: 'A', last_name: 'B', role: {}, staff_since: since, created_at: new Date('2022-01-01') },
    ]);
    const [row] = await service.findAll(undefined, undefined, undefined, user);
    expect(row.since).toBe(since);
  });
});
