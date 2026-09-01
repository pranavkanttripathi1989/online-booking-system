import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UpdatePaymentGatewayConfigInput } from './entities/payment-gateway.entity';
import { listProviders, getProvider } from './providers/registry';
import { validateCredentials } from './providers/provider.interface';
import { encryptJson, decryptJson } from '../common/crypto/secrets';

// REQ175 — mirrors NotificationProviderConfigService's own shape exactly
// (REQ008), clinic-scoped instead of org-scoped.
@Injectable()
export class PaymentGatewayConfigService {
  constructor(private readonly prisma: PrismaService) {}

  providers() {
    return listProviders();
  }

  // Same "return the clinic row itself, or null" shape as
  // appointment-payments.service.ts's own findScopedClinic.
  private async findScopedClinic(clinicId: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.is_deleted) return null;
    if (user.client_org_id && clinic.client_org_id !== user.client_org_id) return null;
    return clinic;
  }

  async myClinicConfig(clinicId: string, user: JwtPayload) {
    const clinic = await this.findScopedClinic(clinicId, user);
    if (!clinic) return null;
    const row = await this.prisma.paymentGatewayConfig.findUnique({ where: { clinic_id: clinicId } });
    if (!row) return { clinic_id: clinicId, provider: undefined, has_credentials: false, is_active: false };
    return { clinic_id: clinicId, provider: row.provider, has_credentials: true, is_active: row.is_active };
  }

  async updateConfig(input: UpdatePaymentGatewayConfigInput, user: JwtPayload) {
    const clinic = await this.findScopedClinic(input.clinic_id, user);
    if (!clinic) return { success: false, message: 'Clinic not found' };

    const provider = getProvider(input.provider);
    if (!provider) return { success: false, message: `Unknown provider "${input.provider}"` };

    const credentials: Record<string, string> = {};
    for (const f of input.credentials) credentials[f.key] = f.value;

    // Re-saving is_active without re-entering secrets shouldn't wipe them —
    // same "empty payload keeps existing" convention as
    // NotificationProviderConfigService.updateMyProviderConfig().
    const hasNewCredentials = Object.values(credentials).some((v) => v && v.length > 0);
    let credentialsEncrypted: string;
    if (hasNewCredentials) {
      const validationError = validateCredentials(provider, credentials);
      if (validationError) return { success: false, message: validationError };
      credentialsEncrypted = encryptJson(credentials);
    } else {
      const existing = await this.prisma.paymentGatewayConfig.findUnique({ where: { clinic_id: input.clinic_id } });
      if (!existing) return { success: false, message: 'Credentials are required for a new gateway configuration' };
      credentialsEncrypted = existing.credentials_encrypted;
    }

    await this.prisma.paymentGatewayConfig.upsert({
      where: { clinic_id: input.clinic_id },
      create: {
        clinic_id: input.clinic_id,
        client_org_id: clinic.client_org_id,
        provider: input.provider,
        credentials_encrypted: credentialsEncrypted,
        is_active: input.is_active ?? true,
      },
      update: {
        provider: input.provider,
        credentials_encrypted: credentialsEncrypted,
        is_active: input.is_active,
      },
    });
    return { success: true };
  }

  // Internal — used by AppointmentPaymentsService/PharmacyPaymentsService,
  // never exposed on the resolver (decrypted credentials never leave the
  // backend process). Falls back to the platform's own env-var Razorpay
  // credentials when the clinic hasn't configured its own — the
  // zero-regression path every pre-existing org relies on.
  async getActiveConfigForClinic(clinicId: string) {
    const row = await this.prisma.paymentGatewayConfig.findUnique({ where: { clinic_id: clinicId } });
    if (row && row.is_active) {
      const provider = getProvider(row.provider);
      if (provider) {
        return { provider, credentials: decryptJson<Record<string, string>>(row.credentials_encrypted) };
      }
    }
    const provider = getProvider('razorpay')!;
    return {
      provider,
      credentials: {
        key_id: process.env.RAZORPAY_KEY_ID ?? '',
        key_secret: process.env.RAZORPAY_KEY_SECRET ?? '',
        webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
      },
    };
  }
}
