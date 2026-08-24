import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ApiKeysService } from './api-keys.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// REQ015 (US-SEC-08, scoped down) — the behaviour under test that matters
// most: the raw key is only ever returned once, at creation, hashed the
// same way a password is (bcrypt); verify() never caches a revoked key's
// validity (reads is_active fresh on every call, per its own acceptance
// criterion: "stops working within one request cycle").
describe('ApiKeysService', () => {
  let service: ApiKeysService;
  let prisma: {
    apiKeys: { findMany: jest.Mock; create: jest.Mock; update: jest.Mock; findUnique: jest.Mock };
  };

  // 'manager', not 'admin' — see webhooks.service.spec.ts's own comment:
  // isPlatformOperator() treats every admin/super_admin caller as
  // platform-wide unconditionally, which would make the cross-org
  // rejection test below pass vacuously.
  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;

  beforeEach(async () => {
    prisma = { apiKeys: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), findUnique: jest.fn() } };
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiKeysService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ApiKeysService);
  });

  it('create() stores a bcrypt hash, never the raw key, and returns the raw key exactly once', async () => {
    // create() derives key_prefix/key_hash itself and passes them straight
    // through to Prisma -- echo exactly what it was called with, the same
    // way every other service.create() spec in this codebase asserts a
    // create-echoing mock, rather than a hand-picked literal that could
    // silently drift from what the service actually generates.
    prisma.apiKeys.create.mockImplementation(async ({ data }: any) => ({ id: 'k1', key_prefix: data.key_prefix, name: data.name, created_at: new Date() }));
    const result = await service.create({ name: 'Zapier' } as any, orgAUser);
    const storedHash = prisma.apiKeys.create.mock.calls[0][0].data.key_hash;
    expect(storedHash).not.toBe(result.raw_key);
    expect(result.raw_key).toContain(result.key_prefix);
    // the stored hash genuinely verifies the raw key portion (post-prefix)
    const rawKeyOnly = result.raw_key.split('.')[1];
    await expect(bcrypt.compare(rawKeyOnly, storedHash)).resolves.toBe(true);
  });

  it('rejects revoking a cross-org key', async () => {
    prisma.apiKeys.findUnique.mockResolvedValue({ id: 'k1', client_org_id: 'org-b' });
    await expect(service.revoke('k1', orgAUser)).rejects.toThrow(BadRequestException);
    expect(prisma.apiKeys.update).not.toHaveBeenCalled();
  });

  describe('verify', () => {
    it('returns null for a malformed key (no prefix.key shape)', async () => {
      expect(await service.verify('not-a-real-key')).toBeNull();
    });

    it('returns null when no active key matches the presented prefix', async () => {
      prisma.apiKeys.findMany.mockResolvedValue([]);
      expect(await service.verify('mbk_abc.rawvalue')).toBeNull();
    });

    it('verifies a matching key and updates last_used_at, scoped to that key org', async () => {
      const rawKey = 'genuine-raw-key';
      const hash = await bcrypt.hash(rawKey, 4);
      prisma.apiKeys.findMany.mockResolvedValue([{ id: 'k1', key_hash: hash, client_org_id: 'org-a' }]);
      prisma.apiKeys.update.mockResolvedValue({});
      const result = await service.verify(`mbk_abc.${rawKey}`);
      expect(result).toEqual({ client_org_id: 'org-a' });
      expect(prisma.apiKeys.update).toHaveBeenCalledWith({ where: { id: 'k1' }, data: { last_used_at: expect.any(Date) } });
    });
  });
});
