import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookEndpointInput } from './dto/webhook.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, orgIdForWrite, isSameOrg } from '../common/scoping/tenant-scope';
import { encrypt } from '../common/crypto/secrets';

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(endpoint: any) {
    const { secret, client_org_id, event_types_json, ...rest } = endpoint;
    return { ...rest, event_types: Array.isArray(event_types_json) ? event_types_json : [] };
  }

  async findAll(user: JwtPayload) {
    const endpoints = await this.prisma.webhookEndpoints.findMany({ where: { ...orgScope(user) }, orderBy: { created_at: 'desc' } });
    return endpoints.map((e) => this.toGraphQL(e));
  }

  async create(input: WebhookEndpointInput, user: JwtPayload) {
    const orgId = orgIdForWrite(user, 'WebhookEndpoint');
    if (!orgId) throw new BadRequestException('Cannot create a webhook endpoint without an organization');
    // Generated once, shown to the admin exactly once at creation (the
    // frontend surfaces it in a "copy now, you won't see it again" dialog,
    // matching the API key convention) — stored only encrypted (secrets.ts,
    // the same helper used for OTP provider credentials).
    const rawSecret = crypto.randomBytes(24).toString('hex');
    const endpoint = await this.prisma.webhookEndpoints.create({
      data: {
        client_org_id: orgId,
        url: input.url,
        secret: encrypt(rawSecret),
        event_types_json: input.event_types,
        created_by_user_id: user.sub,
      },
    });
    return { ...this.toGraphQL(endpoint), secret: rawSecret };
  }

  async deactivate(id: string, user: JwtPayload) {
    const existing = await this.prisma.webhookEndpoints.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException('Webhook endpoint not found');
    if (!isSameOrg(user, existing.client_org_id)) throw new BadRequestException('Webhook endpoint not found');
    const endpoint = await this.prisma.webhookEndpoints.update({ where: { id }, data: { is_active: false } });
    return this.toGraphQL(endpoint);
  }

  async deliveryLog(endpointId: string, user: JwtPayload) {
    const endpoint = await this.prisma.webhookEndpoints.findUnique({ where: { id: endpointId } });
    if (!endpoint) throw new BadRequestException('Webhook endpoint not found');
    if (!isSameOrg(user, endpoint.client_org_id)) throw new BadRequestException('Webhook endpoint not found');
    return this.prisma.webhookDeliveryLog.findMany({ where: { endpoint_id: endpointId }, orderBy: { attempted_at: 'desc' }, take: 50 });
  }
}
