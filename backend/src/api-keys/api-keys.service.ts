import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ApiKeyInput } from './dto/api-key.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, orgIdForWrite, isSameOrg } from '../common/scoping/tenant-scope';
import { BCRYPT_COST } from '../common/crypto/bcrypt-cost';

// REQ015 (US-SEC-08, scoped down) — key hashing mirrors the password
// convention exactly (bcrypt at BCRYPT_COST), never storing the raw key.
const KEY_PREFIX_LENGTH = 8;

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: JwtPayload) {
    return this.prisma.apiKeys.findMany({ where: { ...orgScope(user) }, orderBy: { created_at: 'desc' } });
  }

  async create(input: ApiKeyInput, user: JwtPayload) {
    const orgId = orgIdForWrite(user, 'ApiKey');
    if (!orgId) throw new BadRequestException('Cannot create an API key without an organization');
    const rawKey = crypto.randomBytes(32).toString('hex');
    const keyPrefix = `mbk_${rawKey.slice(0, KEY_PREFIX_LENGTH)}`;
    const keyHash = await bcrypt.hash(rawKey, BCRYPT_COST);
    const created = await this.prisma.apiKeys.create({
      data: {
        client_org_id: orgId,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        name: input.name,
        created_by_user_id: user.sub,
      },
    });
    return { id: created.id, key_prefix: created.key_prefix, name: created.name, created_at: created.created_at, raw_key: `${keyPrefix}.${rawKey}` };
  }

  async revoke(id: string, user: JwtPayload) {
    const existing = await this.prisma.apiKeys.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException('API key not found');
    if (!isSameOrg(user, existing.client_org_id)) throw new BadRequestException('API key not found');
    return this.prisma.apiKeys.update({ where: { id }, data: { is_active: false, revoked_at: new Date() } });
  }

  // Verifies a presented raw key against every active key sharing its
  // prefix (bcrypt hashes aren't directly comparable, so the prefix
  // narrows the candidate set to effectively one row). Wired to ApiKeyGuard
  // (REQ116). "stops working within one request cycle" (US-SEC-08's own
  // acceptance criterion) holds by construction: is_active is read fresh
  // on every call, never cached.
  async verify(rawKeyWithPrefix: string): Promise<{ client_org_id: string } | null> {
    const [prefix, rawKey] = rawKeyWithPrefix.split('.', 2);
    if (!prefix || !rawKey) return null;
    const candidates = await this.prisma.apiKeys.findMany({ where: { key_prefix: prefix, is_active: true } });
    for (const candidate of candidates) {
      if (await bcrypt.compare(rawKey, candidate.key_hash)) {
        await this.prisma.apiKeys.update({ where: { id: candidate.id }, data: { last_used_at: new Date() } });
        return { client_org_id: candidate.client_org_id };
      }
    }
    return null;
  }

  // REQ116 — the first real endpoint an issued key can call.
  // client_org_id comes from ApiKeyGuard (resolved from the verified key),
  // never a request parameter — the same "scope from the authenticated
  // identity, not caller input" rule Hard Rule 6 applies to the JWT path.
  // Deliberately minimal fields (no patient PHI) since ApiKeys has no
  // per-scope permission column yet (REQ015's own data-model note listed
  // `scopes[]` as intended but it was never migrated) — a fine-grained
  // scopes model is future work, not silently assumed here.
  async listAppointmentsForOrg(orgId: string, date?: string) {
    const where: any = { clinic: { client_org_id: orgId }, is_deleted: false };
    if (date) {
      where.appointment_time = {
        gte: new Date(`${date}T00:00:00.000Z`),
        lte: new Date(`${date}T23:59:59.999Z`),
      };
    }
    const rows = await this.prisma.appointments.findMany({
      where,
      include: { product: true, clinician: true },
      orderBy: { appointment_time: 'asc' },
      take: 200,
    });
    return rows.map((r) => ({
      id: r.id,
      start_datetime: r.appointment_time,
      duration_minutes: r.duration_minutes,
      status: r.status,
      service_name: r.product?.name ?? null,
      clinician_name: r.clinician ? `${r.clinician.first_name} ${r.clinician.last_name}` : null,
    }));
  }
}
