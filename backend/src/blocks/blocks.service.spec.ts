import { Test, TestingModule } from '@nestjs/testing';
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
});
