import { Test, TestingModule } from '@nestjs/testing';
import { EntitlementsResolver } from './entitlements.resolver';
import { EntitlementsService } from './entitlements.service';

// P1-04
describe('EntitlementsResolver', () => {
  let resolver: EntitlementsResolver;
  let entitlementsService: { resolveEntitlements: jest.Mock };

  beforeEach(async () => {
    entitlementsService = { resolveEntitlements: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [EntitlementsResolver, { provide: EntitlementsService, useValue: entitlementsService }],
    }).compile();
    resolver = module.get(EntitlementsResolver);
  });

  it('returns is_gated:false with empty arrays for an ungated caller (no plan, or a platform operator)', async () => {
    entitlementsService.resolveEntitlements.mockResolvedValue(null);
    const result = await resolver.myEntitlements({ sub: 'u1', client_org_id: null } as any);
    expect(result).toEqual({ is_gated: false, feature_flags: [], quotas: [] });
  });

  it('scopes strictly to the caller\'s own JWT client_org_id, never a client-supplied argument — there is none to pass', async () => {
    entitlementsService.resolveEntitlements.mockResolvedValue(null);
    await resolver.myEntitlements({ sub: 'u1', client_org_id: 'org-a' } as any);
    expect(entitlementsService.resolveEntitlements).toHaveBeenCalledWith('org-a');
  });

  it('maps a resolved entitlement set into is_gated:true plus [{key,value}] arrays for GraphQL', async () => {
    entitlementsService.resolveEntitlements.mockResolvedValue({
      featureFlags: { pharmacy: true, telemedicine: false },
      quotas: { max_clinician_seats: 10 },
    });
    const result = await resolver.myEntitlements({ sub: 'u1', client_org_id: 'org-a' } as any);
    expect(result).toEqual({
      is_gated: true,
      feature_flags: [
        { key: 'pharmacy', enabled: true },
        { key: 'telemedicine', enabled: false },
      ],
      quotas: [{ key: 'max_clinician_seats', value: 10 }],
    });
  });
});
