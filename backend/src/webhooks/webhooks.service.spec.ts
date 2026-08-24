import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

jest.mock('../common/crypto/secrets', () => ({ encrypt: jest.fn((s: string) => `encrypted(${s})`) }));

// REQ030 (US-INT-02, scoped down) — the behaviour under test that matters
// most: the raw secret is returned exactly once, at creation, and never
// stored in plaintext (create() must always pass encrypt()'s output, not
// the raw value, to Prisma).
describe('WebhooksService', () => {
  let service: WebhooksService;
  let prisma: {
    webhookEndpoints: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    webhookDeliveryLog: { findMany: jest.Mock };
  };

  // 'manager', not 'admin' — isPlatformOperator() treats every admin/
  // super_admin caller as platform-wide unconditionally (tenant-scope.ts),
  // which would make the cross-org rejection assertions below pass
  // vacuously (isSameOrg short-circuits to true before ever comparing ids).
  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const endpointB = { id: 'wh-b', client_org_id: 'org-b', url: 'https://b.test', event_types_json: ['appointment.created'], is_active: true, created_at: new Date() };

  beforeEach(async () => {
    prisma = {
      webhookEndpoints: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      webhookDeliveryLog: { findMany: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebhooksService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(WebhooksService);
  });

  it('never returns the raw secret from findAll (WebhookEndpointType omits it, toGraphQL strips it too)', async () => {
    prisma.webhookEndpoints.findMany.mockResolvedValue([{ ...endpointB, client_org_id: 'org-a', secret: 'raw-secret' }]);
    const result = await service.findAll(orgAUser);
    expect(result[0]).not.toHaveProperty('secret');
  });

  it('create() stores the encrypted secret, not the raw one, and returns the raw one exactly once', async () => {
    prisma.webhookEndpoints.create.mockResolvedValue({ id: 'wh-new', client_org_id: 'org-a', url: 'https://a.test', event_types_json: ['appointment.created'], is_active: true, created_at: new Date() });
    const result = await service.create({ url: 'https://a.test', event_types: ['appointment.created'] } as any, orgAUser);
    const storedSecret = prisma.webhookEndpoints.create.mock.calls[0][0].data.secret;
    expect(storedSecret).toMatch(/^encrypted\(/);
    expect(result.secret).not.toBe(storedSecret);
    expect(result.secret).toHaveLength(48); // 24 random bytes, hex-encoded
  });

  it('rejects deactivating a cross-org endpoint', async () => {
    prisma.webhookEndpoints.findUnique.mockResolvedValue(endpointB);
    await expect(service.deactivate('wh-b', orgAUser)).rejects.toThrow(BadRequestException);
    expect(prisma.webhookEndpoints.update).not.toHaveBeenCalled();
  });

  it('rejects reading the delivery log of a cross-org endpoint', async () => {
    prisma.webhookEndpoints.findUnique.mockResolvedValue(endpointB);
    await expect(service.deliveryLog('wh-b', orgAUser)).rejects.toThrow(BadRequestException);
  });
});
