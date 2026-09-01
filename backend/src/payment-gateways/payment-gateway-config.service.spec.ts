import { Test, TestingModule } from '@nestjs/testing';
import { PaymentGatewayConfigService } from './payment-gateway-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { decryptJson, encryptJson } from '../common/crypto/secrets';

const ORIGINAL_ENV = process.env;

describe('PaymentGatewayConfigService', () => {
  let service: PaymentGatewayConfigService;
  let prisma: {
    clinics: { findUnique: jest.Mock };
    paymentGatewayConfig: { findUnique: jest.Mock; upsert: jest.Mock };
  };

  const orgUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u2', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;
  const clinicA = { id: 'clinic-a', client_org_id: 'org-a', is_deleted: false };
  const clinicB = { id: 'clinic-b', client_org_id: 'org-b', is_deleted: false };

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV, RAZORPAY_KEY_ID: 'env_key_id', RAZORPAY_KEY_SECRET: 'env_key_secret', RAZORPAY_WEBHOOK_SECRET: 'env_webhook_secret' };
    prisma = {
      clinics: { findUnique: jest.fn() },
      paymentGatewayConfig: { findUnique: jest.fn(), upsert: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentGatewayConfigService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(PaymentGatewayConfigService);
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('providers', () => {
    it('lists all 4 registered gateways with their own field shapes', () => {
      const providers = service.providers();
      expect(providers.map((p) => p.id).sort()).toEqual(['cashfree', 'payu', 'phonepe', 'razorpay']);
      expect(providers.find((p) => p.id === 'razorpay')!.fields.map((f) => f.key)).toEqual(['key_id', 'key_secret', 'webhook_secret']);
    });
  });

  describe('myClinicConfig', () => {
    it('returns null for a clinic outside the caller org (never confirms cross-tenant existence)', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      const result = await service.myClinicConfig('clinic-b', orgUser);
      expect(result).toBeNull();
    });

    it('returns has_credentials:false with no provider when nothing is configured yet', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.paymentGatewayConfig.findUnique.mockResolvedValue(null);
      const result = await service.myClinicConfig('clinic-a', orgUser);
      expect(result).toEqual({ clinic_id: 'clinic-a', provider: undefined, has_credentials: false, is_active: false });
    });

    it('never returns raw credentials — has_credentials only', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.paymentGatewayConfig.findUnique.mockResolvedValue({ provider: 'cashfree', is_active: true, credentials_encrypted: 'ct:iv:tag' });
      const result = await service.myClinicConfig('clinic-a', orgUser);
      expect(result).toEqual({ clinic_id: 'clinic-a', provider: 'cashfree', has_credentials: true, is_active: true });
      expect(JSON.stringify(result)).not.toMatch(/credentials_encrypted|client_secret/);
    });
  });

  describe('updateConfig', () => {
    it('rejects a clinic outside the caller org', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicB);
      const result = await service.updateConfig(
        { clinic_id: 'clinic-b', provider: 'razorpay', credentials: [{ key: 'key_id', value: 'x' }] } as any,
        orgUser,
      );
      expect(result.success).toBe(false);
      expect(prisma.paymentGatewayConfig.upsert).not.toHaveBeenCalled();
    });

    it('rejects an unknown provider id', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      const result = await service.updateConfig({ clinic_id: 'clinic-a', provider: 'stripe_pg', credentials: [] } as any, orgUser);
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/Unknown provider/);
    });

    it('rejects when a required credential field is missing', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      const result = await service.updateConfig(
        { clinic_id: 'clinic-a', provider: 'razorpay', credentials: [{ key: 'key_id', value: 'only_this_one' }] } as any,
        orgUser,
      );
      expect(result.success).toBe(false);
      expect(prisma.paymentGatewayConfig.upsert).not.toHaveBeenCalled();
    });

    it('encrypts and stores real new credentials, stamping the clinic-derived client_org_id, not the caller\'s', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      const result = await service.updateConfig(
        {
          clinic_id: 'clinic-a',
          provider: 'razorpay',
          credentials: [
            { key: 'key_id', value: 'rzp_live_x' },
            { key: 'key_secret', value: 'secret_x' },
            { key: 'webhook_secret', value: 'whsec_x' },
          ],
        } as any,
        platformUser,
      );
      expect(result).toEqual({ success: true });
      const call = prisma.paymentGatewayConfig.upsert.mock.calls[0][0];
      expect(call.create.client_org_id).toBe('org-a');
      expect(call.create.credentials_encrypted).not.toContain('rzp_live_x'); // encrypted, not plaintext
      expect(decryptJson(call.create.credentials_encrypted)).toEqual({ key_id: 'rzp_live_x', key_secret: 'secret_x', webhook_secret: 'whsec_x' });
    });

    it('keeps existing encrypted credentials when re-saving with an empty credentials payload', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.paymentGatewayConfig.findUnique.mockResolvedValue({ credentials_encrypted: 'already-encrypted-blob' });
      const result = await service.updateConfig(
        { clinic_id: 'clinic-a', provider: 'razorpay', credentials: [], is_active: false } as any,
        orgUser,
      );
      expect(result).toEqual({ success: true });
      expect(prisma.paymentGatewayConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: expect.objectContaining({ credentials_encrypted: 'already-encrypted-blob', is_active: false }) }),
      );
    });

    it('rejects an empty-credentials save when no prior configuration exists', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.paymentGatewayConfig.findUnique.mockResolvedValue(null);
      const result = await service.updateConfig({ clinic_id: 'clinic-a', provider: 'razorpay', credentials: [] } as any, orgUser);
      expect(result.success).toBe(false);
    });
  });

  describe('getActiveConfigForClinic', () => {
    it('falls back to env-var Razorpay credentials when the clinic has no configured row (zero-regression path)', async () => {
      prisma.paymentGatewayConfig.findUnique.mockResolvedValue(null);
      const { provider, credentials } = await service.getActiveConfigForClinic('clinic-a');
      expect(provider.id).toBe('razorpay');
      expect(credentials).toEqual({ key_id: 'env_key_id', key_secret: 'env_key_secret', webhook_secret: 'env_webhook_secret' });
    });

    it('falls back to env-var Razorpay when the clinic\'s own row exists but is inactive', async () => {
      prisma.paymentGatewayConfig.findUnique.mockResolvedValue({ provider: 'cashfree', is_active: false, credentials_encrypted: 'x' });
      const { provider } = await service.getActiveConfigForClinic('clinic-a');
      expect(provider.id).toBe('razorpay');
    });

    it('decrypts and returns the clinic\'s own active gateway configuration', async () => {
      prisma.paymentGatewayConfig.findUnique.mockResolvedValue({
        provider: 'cashfree',
        is_active: true,
        credentials_encrypted: encryptJson({ client_id: 'cid', client_secret: 'csecret' }),
      });
      const { provider, credentials } = await service.getActiveConfigForClinic('clinic-a');
      expect(provider.id).toBe('cashfree');
      expect(credentials).toEqual({ client_id: 'cid', client_secret: 'csecret' });
    });
  });
});
