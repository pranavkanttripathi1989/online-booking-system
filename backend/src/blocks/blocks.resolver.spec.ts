import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { BlocksResolver } from './blocks.resolver';
import { BlocksService } from './blocks.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

// BUG012: spacerBlocks/roomBlocks/getSpacerBlocks previously had no @Auth()
// at all -- any authenticated role, including patient, could read every
// block in the org (or, for getSpacerBlocks, in ANY org, since it had no
// scoping either -- see blocks.service.spec.ts for that half of the fix).
describe('BlocksResolver — role gating (BUG012)', () => {
  let resolver: BlocksResolver;
  let service: Record<string, jest.Mock>;
  const reflector = new Reflector();

  beforeEach(async () => {
    service = {
      spacerBlocks: jest.fn(),
      roomBlocks: jest.fn(),
      getSpacerBlocks: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlocksResolver, { provide: BlocksService, useValue: service }],
    }).compile();
    resolver = module.get(BlocksResolver);
  });

  it.each([
    ['spacerBlocks', BlocksResolver.prototype.spacerBlocks],
    ['roomBlocks', BlocksResolver.prototype.roomBlocks],
  ])('%s is gated to manager/admin/super_admin', (_name, handler) => {
    expect(reflector.get(ROLES_KEY, handler)).toEqual(['manager', 'admin', 'super_admin']);
  });

  it('getSpacerBlocks is gated to manager/admin/super_admin/clinician (the self-service caller)', () => {
    expect(reflector.get(ROLES_KEY, BlocksResolver.prototype.getSpacerBlocks)).toEqual(['manager', 'admin', 'super_admin', 'clinician']);
  });

  it('getSpacerBlocks forwards clinicianId/date/user to the service unchanged', async () => {
    service.getSpacerBlocks.mockResolvedValue([]);
    const user = { sub: 'u-1', roles: ['clinician'], client_org_id: 'org-1', clinician_id: 'cln-1' } as any;
    await resolver.getSpacerBlocks('cln-1', '2026-01-01', user);
    expect(service.getSpacerBlocks).toHaveBeenCalledWith('cln-1', '2026-01-01', user);
  });
});
