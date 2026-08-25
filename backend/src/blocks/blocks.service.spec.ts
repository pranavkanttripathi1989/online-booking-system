import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BlocksService } from './blocks.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Security regression coverage: createSpacerBlock/createRoomBlock previously
// never validated the target clinic against the caller's org -- only
// update*/delete* did (they look up an existing record first). A manager
// could create a block attributed to a DIFFERENT organization's clinic.
describe('BlocksService — create-path org scoping', () => {
  let service: BlocksService;
  let prisma: { clinics: { findUnique: jest.Mock }; spacerBlocks: { create: jest.Mock }; roomBlocks: { create: jest.Mock } };

  const managerSameOrg: JwtPayload = { sub: 'u-1', roles: ['manager'], client_org_id: 'org-1' } as JwtPayload;
  const orgLessAdmin: JwtPayload = { sub: 'u-2', roles: ['admin'], client_org_id: null } as JwtPayload;

  beforeEach(async () => {
    prisma = {
      clinics: { findUnique: jest.fn() },
      spacerBlocks: {
        create: jest.fn().mockResolvedValue({
          id: 'sb-1', start_time: new Date('1970-01-01T09:00:00Z'), end_time: new Date('1970-01-01T10:00:00Z'), reason: '',
          clinician: { id: 'cln-1', first_name: 'A', last_name: 'B' }, clinic: { id: 'clinic-1', name: 'C' }, room: null,
        }),
      },
      roomBlocks: {
        create: jest.fn().mockResolvedValue({
          id: 'rb-1', start_time: new Date('1970-01-01T09:00:00Z'), end_time: new Date('1970-01-01T10:00:00Z'), reason: '',
          room: { id: 'room-1', room_number: '1' }, clinic: { id: 'clinic-1', name: 'C' },
        }),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlocksService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(BlocksService);
  });

  const spacerInput = { clinic_id: 'clinic-1', clinician_id: 'cln-1', recurrence_type: 'single', start_time: '09:00', end_time: '10:00' };
  const roomInput = { clinic_id: 'clinic-1', room_id: 'room-1', recurrence_type: 'single', start_time: '09:00', end_time: '10:00' };

  it('rejects createSpacerBlock for a clinic in a different org', async () => {
    prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-2' });
    const result = await service.createSpacerBlock(spacerInput as any, managerSameOrg);
    expect(result.success).toBe(false);
    expect(prisma.spacerBlocks.create).not.toHaveBeenCalled();
  });

  it('allows createSpacerBlock for a clinic in the caller\'s own org', async () => {
    prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
    const result = await service.createSpacerBlock(spacerInput as any, managerSameOrg);
    expect(result.success).toBe(true);
  });

  it('rejects createRoomBlock for a clinic in a different org', async () => {
    prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-2' });
    const result = await service.createRoomBlock(roomInput as any, managerSameOrg);
    expect(result.success).toBe(false);
    expect(prisma.roomBlocks.create).not.toHaveBeenCalled();
  });

  it('an org-less caller (admin) is not restricted', async () => {
    const result = await service.createSpacerBlock(spacerInput as any, orgLessAdmin);
    expect(result.success).toBe(true);
    expect(prisma.clinics.findUnique).not.toHaveBeenCalled();
  });

  // BUG021: createSpacerBlock was widened to allow 'clinician' (previously
  // manager/admin/super_admin only) so clinician/Dashboard.jsx's own "Add
  // Block" action can actually save. Without this self-scope check, any
  // clinician could create a block attributed to a DIFFERENT clinician.
  it('allows a clinician to create a block for their own clinician_id', async () => {
    prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-1', client_org_id: 'org-1' });
    const clinicianSelf: JwtPayload = { sub: 'u-5', roles: ['clinician'], client_org_id: 'org-1', clinician_id: 'cln-1' } as JwtPayload;
    const result = await service.createSpacerBlock(spacerInput as any, clinicianSelf);
    expect(result.success).toBe(true);
  });

  it('rejects a clinician creating a block attributed to a DIFFERENT clinician_id', async () => {
    const clinicianOther: JwtPayload = { sub: 'u-6', roles: ['clinician'], client_org_id: 'org-1', clinician_id: 'cln-OTHER' } as JwtPayload;
    const result = await service.createSpacerBlock(spacerInput as any, clinicianOther);
    expect(result.success).toBe(false);
    expect(prisma.spacerBlocks.create).not.toHaveBeenCalled();
  });
});

// BUG012: getSpacerBlocks previously took no `user` at all -- zero self- or
// org-scoping, so any authenticated caller could pass an arbitrary
// clinicianId and read that clinician's block schedule across
// organizations. Mirrors availability.service.ts's assertClinicianAccess.
describe('BlocksService.getSpacerBlocks — self/org scoping', () => {
  let service: BlocksService;
  let prisma: { clinicians: { findUnique: jest.Mock }; spacerBlocks: { findMany: jest.Mock } };

  const clinicianSelf: JwtPayload = { sub: 'u-1', roles: ['clinician'], client_org_id: 'org-1', clinician_id: 'cln-1' } as JwtPayload;
  const clinicianOther: JwtPayload = { sub: 'u-2', roles: ['clinician'], client_org_id: 'org-1', clinician_id: 'cln-OTHER' } as JwtPayload;
  const managerOtherOrg: JwtPayload = { sub: 'u-3', roles: ['manager'], client_org_id: 'org-2' } as JwtPayload;
  const managerSameOrg: JwtPayload = { sub: 'u-4', roles: ['manager'], client_org_id: 'org-1' } as JwtPayload;

  beforeEach(async () => {
    prisma = {
      clinicians: { findUnique: jest.fn().mockResolvedValue({ id: 'cln-1', is_deleted: false, clinic: { client_org_id: 'org-1' } }) },
      spacerBlocks: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlocksService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(BlocksService);
  });

  it('allows a clinician to fetch their own block schedule', async () => {
    await expect(service.getSpacerBlocks('cln-1', '2026-01-01', clinicianSelf)).resolves.toEqual([]);
    expect(prisma.spacerBlocks.findMany).toHaveBeenCalled();
  });

  it('rejects a clinician fetching a DIFFERENT clinician\'s block schedule', async () => {
    await expect(service.getSpacerBlocks('cln-1', '2026-01-01', clinicianOther)).rejects.toThrow(NotFoundException);
    expect(prisma.spacerBlocks.findMany).not.toHaveBeenCalled();
  });

  it('rejects a manager from a different org', async () => {
    await expect(service.getSpacerBlocks('cln-1', '2026-01-01', managerOtherOrg)).rejects.toThrow(NotFoundException);
    expect(prisma.spacerBlocks.findMany).not.toHaveBeenCalled();
  });

  it('allows a manager from the same org', async () => {
    await expect(service.getSpacerBlocks('cln-1', '2026-01-01', managerSameOrg)).resolves.toEqual([]);
  });

  it('rejects an unknown clinician id', async () => {
    prisma.clinicians.findUnique.mockResolvedValue(null);
    await expect(service.getSpacerBlocks('cln-missing', '2026-01-01', managerSameOrg)).rejects.toThrow(NotFoundException);
  });
});
