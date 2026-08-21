import { Test, TestingModule } from '@nestjs/testing';
import { NotificationProviderConfigService } from './notification-provider-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { decrypt, encryptJson } from '../common/crypto/secrets';

describe('NotificationProviderConfigService', () => {
  let service: NotificationProviderConfigService;
  let prisma: { notificationProviderConfig: { findUnique: jest.Mock; upsert: jest.Mock } };

  const orgUser: JwtPayload = { sub: 'u-1', roles: ['manager'], client_org_id: 'org-a' } as JwtPayload;
  const orgLessUser: JwtPayload = { sub: 'u-2', roles: ['admin'], client_org_id: null } as JwtPayload;

  beforeEach(async () => {
    prisma = { notificationProviderConfig: { findUnique: jest.fn(), upsert: jest.fn() } };
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationProviderConfigService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(NotificationProviderConfigService);
  });

  describe('providers', () => {
    it('lists the registered providers without requiring auth (public catalog, no credentials attached)', () => {
      const result = service.providers();
      expect(result.map((p) => p.id).sort()).toEqual(['aws_sns', 'gupshup', 'msg91', 'twilio']);
    });
  });

  describe('myProviderConfig — tenant isolation', () => {
    it('is scoped to the caller\'s own client_org_id, never a client-supplied org', async () => {
      prisma.notificationProviderConfig.findUnique.mockResolvedValue(null);
      await service.myProviderConfig('sms', orgUser);
      expect(prisma.notificationProviderConfig.findUnique).toHaveBeenCalledWith({
        where: { client_org_id_channel: { client_org_id: 'org-a', channel: 'sms' } },
      });
    });

    it('returns null (no lookup at all) for an org-less caller rather than leaking every org\'s config', async () => {
      const result = await service.myProviderConfig('sms', orgLessUser);
      expect(result).toBeNull();
      expect(prisma.notificationProviderConfig.findUnique).not.toHaveBeenCalled();
    });

    it('reports has_credentials true but never returns the decrypted credentials themselves', async () => {
      prisma.notificationProviderConfig.findUnique.mockResolvedValue({
        channel: 'sms',
        provider: 'msg91',
        sender_id: 'MEDIBK',
        credentials_encrypted: 'opaque-ciphertext',
      });
      const result = await service.myProviderConfig('sms', orgUser);
      expect(result).toEqual({ channel: 'sms', provider: 'msg91', sender_id: 'MEDIBK', has_credentials: true });
      expect(JSON.stringify(result)).not.toContain('opaque-ciphertext');
    });

    it('reports has_credentials false when nothing is configured yet', async () => {
      prisma.notificationProviderConfig.findUnique.mockResolvedValue(null);
      const result = await service.myProviderConfig('sms', orgUser);
      expect(result?.has_credentials).toBe(false);
    });
  });

  describe('updateMyProviderConfig', () => {
    const baseInput = {
      channel: 'sms',
      provider: 'msg91',
      sender_id: 'MEDIBK',
      credentials: [
        { key: 'authkey', value: 'real-secret-key' },
        { key: 'sender_id', value: 'MEDIBK' },
      ],
    };

    it('rejects an org-less caller rather than writing an orphaned/global config', async () => {
      const result = await service.updateMyProviderConfig(baseInput as any, orgLessUser);
      expect(result.success).toBe(false);
      expect(prisma.notificationProviderConfig.upsert).not.toHaveBeenCalled();
    });

    it('rejects an unknown provider id', async () => {
      const result = await service.updateMyProviderConfig({ ...baseInput, provider: 'not_a_real_vendor' } as any, orgUser);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown provider');
    });

    it('rejects when a required credential field for the chosen provider is missing', async () => {
      const result = await service.updateMyProviderConfig(
        { ...baseInput, credentials: [{ key: 'authkey', value: 'k' }] } as any, // sender_id missing
        orgUser,
      );
      expect(result.success).toBe(false);
      expect(prisma.notificationProviderConfig.upsert).not.toHaveBeenCalled();
    });

    it('encrypts credentials at rest — the raw plaintext value never appears in the Prisma write', async () => {
      prisma.notificationProviderConfig.upsert.mockResolvedValue({});
      const result = await service.updateMyProviderConfig(baseInput as any, orgUser);

      expect(result.success).toBe(true);
      const upsertCall = prisma.notificationProviderConfig.upsert.mock.calls[0][0];
      expect(upsertCall.where).toEqual({ client_org_id_channel: { client_org_id: 'org-a', channel: 'sms' } });
      expect(upsertCall.create.credentials_encrypted).not.toContain('real-secret-key');
      expect(decrypt(upsertCall.create.credentials_encrypted)).toEqual(
        JSON.stringify({ authkey: 'real-secret-key', sender_id: 'MEDIBK' }),
      );
    });

    it('an empty credentials payload keeps the existing stored secret rather than wiping it (re-saving just the sender id)', async () => {
      prisma.notificationProviderConfig.findUnique.mockResolvedValue({
        credentials_encrypted: 'previously-stored-ciphertext',
      });
      prisma.notificationProviderConfig.upsert.mockResolvedValue({});

      const result = await service.updateMyProviderConfig(
        { channel: 'sms', provider: 'msg91', sender_id: 'NEWNAME', credentials: [] } as any,
        orgUser,
      );

      expect(result.success).toBe(true);
      const upsertCall = prisma.notificationProviderConfig.upsert.mock.calls[0][0];
      expect(upsertCall.update.credentials_encrypted).toBe('previously-stored-ciphertext');
      expect(upsertCall.update.sender_id).toBe('NEWNAME');
    });

    it('rejects an empty-credentials payload for a genuinely new (never-configured) provider', async () => {
      prisma.notificationProviderConfig.findUnique.mockResolvedValue(null);
      const result = await service.updateMyProviderConfig(
        { channel: 'sms', provider: 'msg91', sender_id: 'X', credentials: [] } as any,
        orgUser,
      );
      expect(result.success).toBe(false);
      expect(prisma.notificationProviderConfig.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getActiveConfigForOrg — internal, used only by NotificationTriggerService', () => {
    it('returns null when no row exists for the org/channel', async () => {
      prisma.notificationProviderConfig.findUnique.mockResolvedValue(null);
      expect(await service.getActiveConfigForOrg('org-a', 'sms')).toBeNull();
    });

    it('returns null when the row exists but is_active is false (configured, then deliberately turned off)', async () => {
      prisma.notificationProviderConfig.findUnique.mockResolvedValue({ is_active: false, provider: 'msg91' });
      expect(await service.getActiveConfigForOrg('org-a', 'sms')).toBeNull();
    });

    it('decrypts and returns the provider + credentials for an active config', async () => {
      const encrypted = encryptJson({ authkey: 'k', sender_id: 'MEDIBK' });
      prisma.notificationProviderConfig.findUnique.mockResolvedValue({
        is_active: true,
        provider: 'msg91',
        credentials_encrypted: encrypted,
      });
      const result = await service.getActiveConfigForOrg('org-a', 'sms');
      expect(result?.provider.id).toBe('msg91');
      expect(result?.credentials).toEqual({ authkey: 'k', sender_id: 'MEDIBK' });
    });
  });
});
