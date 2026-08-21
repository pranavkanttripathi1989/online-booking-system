import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UpdateNotificationProviderConfigInput } from './entities/notification-provider.entity';
import { listProviders, getProvider } from './providers/registry';
import { validateCredentials } from './providers/provider.interface';
import { encryptJson, decryptJson } from '../common/crypto/secrets';

const NOT_LINKED_ERROR = "Your account isn't linked to an organization";

@Injectable()
export class NotificationProviderConfigService {
  constructor(private readonly prisma: PrismaService) {}

  providers() {
    return listProviders();
  }

  async myProviderConfig(channel: string, user: JwtPayload) {
    if (!user.client_org_id) return null;
    const row = await this.prisma.notificationProviderConfig.findUnique({
      where: { client_org_id_channel: { client_org_id: user.client_org_id, channel } },
    });
    if (!row) return { channel, provider: undefined, sender_id: undefined, has_credentials: false };
    return {
      channel: row.channel,
      provider: row.provider,
      sender_id: row.sender_id ?? undefined,
      has_credentials: true,
    };
  }

  async updateMyProviderConfig(input: UpdateNotificationProviderConfigInput, user: JwtPayload) {
    if (!user.client_org_id) return { success: false, message: NOT_LINKED_ERROR };

    const provider = getProvider(input.provider);
    if (!provider) return { success: false, message: `Unknown provider "${input.provider}"` };

    const credentials: Record<string, string> = {};
    for (const f of input.credentials) credentials[f.key] = f.value;

    // Re-saving just the sender ID (e.g.) without re-entering the secret
    // shouldn't wipe the previously-stored credentials -- an empty payload
    // here means "keep what's already there".
    const hasNewCredentials = Object.values(credentials).some((v) => v && v.length > 0);
    let credentialsEncrypted: string;
    if (hasNewCredentials) {
      const validationError = validateCredentials(provider, credentials);
      if (validationError) return { success: false, message: validationError };
      credentialsEncrypted = encryptJson(credentials);
    } else {
      const existing = await this.prisma.notificationProviderConfig.findUnique({
        where: { client_org_id_channel: { client_org_id: user.client_org_id, channel: input.channel } },
      });
      if (!existing) return { success: false, message: 'Credentials are required for a new provider configuration' };
      credentialsEncrypted = existing.credentials_encrypted;
    }

    await this.prisma.notificationProviderConfig.upsert({
      where: { client_org_id_channel: { client_org_id: user.client_org_id, channel: input.channel } },
      create: {
        client_org_id: user.client_org_id,
        channel: input.channel,
        provider: input.provider,
        credentials_encrypted: credentialsEncrypted,
        sender_id: input.sender_id,
      },
      update: {
        provider: input.provider,
        credentials_encrypted: credentialsEncrypted,
        sender_id: input.sender_id,
      },
    });
    return { success: true };
  }

  // Internal — used by NotificationTriggerService, not exposed on the GraphQL
  // resolver (decrypted credentials never leave the backend process).
  async getActiveConfigForOrg(clientOrgId: string, channel: string) {
    const row = await this.prisma.notificationProviderConfig.findUnique({
      where: { client_org_id_channel: { client_org_id: clientOrgId, channel } },
    });
    if (!row || !row.is_active) return null;
    const provider = getProvider(row.provider);
    if (!provider) return null;
    return { provider, credentials: decryptJson<Record<string, string>>(row.credentials_encrypted) };
  }
}
