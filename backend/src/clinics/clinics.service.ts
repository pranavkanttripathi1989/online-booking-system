import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClinicInput } from './dto/clinic.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, assertSameOrg } from '../common/scoping/tenant-scope';

@Injectable()
export class ClinicsService {
  constructor(private readonly prisma: PrismaService) {}

  // context/backend-hard-rules.md Rule 1: client_org_id always comes from the
  // JWT (`user.client_org_id`), never a client-supplied argument. admin/
  // super_admin see every org's clinics — everyone else is scoped to their
  // own org only, or to nothing at all if they have none of their own (F-01 —
  // orgScope() fails closed for a non-operator with no org, rather than the
  // old `user.client_org_id ? {...} : {}` ternary, which returned every
  // tenant's clinics to a self-registered patient account).
  // `limit` added additively for manager/Availability.jsx's/manager/Blocks.jsx's
  // clinics(search:{limit}) sub-query (context/frontend-integration-audit.md
  // #13/#15) -- every other caller passes no search arg at all, unaffected.
  findAll(user: JwtPayload, limit?: number) {
    return this.prisma.clinics.findMany({
      where: {
        is_deleted: false,
        ...orgScope(user),
      },
      orderBy: { created_at: 'asc' },
      take: limit,
    });
  }

  async findOne(id: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id } });
    if (!clinic || clinic.is_deleted) {
      throw new NotFoundException('Clinic not found');
    }
    // TC-CLI-API equivalent of TC-PAT-API-006: never confirm cross-tenant
    // existence — assertSameOrg always throws NotFound, never Forbidden.
    assertSameOrg(user, clinic.client_org_id, 'Clinic');
    return clinic;
  }

  create(input: ClinicInput, user: JwtPayload) {
    return this.prisma.clinics.create({
      data: {
        ...input,
        client_org_id: user.client_org_id,
      },
    });
  }

  async update(id: string, input: ClinicInput, user: JwtPayload) {
    const existing = await this.findOne(id, user); // enforces tenant scoping before any write
    return this.prisma.clinics.update({ where: { id: existing.id }, data: input });
  }
}
