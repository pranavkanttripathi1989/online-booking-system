import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClinicInput } from './dto/clinic.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class ClinicsService {
  constructor(private readonly prisma: PrismaService) {}

  // context/backend-hard-rules.md Rule 1: client_org_id always comes from the
  // JWT (`user.client_org_id`), never a client-supplied argument. super_admin
  // (client_org_id: null on their own token) sees every org's clinics —
  // everyone else is scoped to their own org only.
  findAll(user: JwtPayload) {
    return this.prisma.clinics.findMany({
      where: {
        is_deleted: false,
        ...(user.client_org_id ? { client_org_id: user.client_org_id } : {}),
      },
      orderBy: { created_at: 'asc' },
    });
  }

  async findOne(id: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id } });
    if (!clinic || clinic.is_deleted) {
      throw new NotFoundException('Clinic not found');
    }
    if (user.client_org_id && clinic.client_org_id !== user.client_org_id) {
      // TC-CLI-API equivalent of TC-PAT-API-006: never confirm cross-tenant existence.
      throw new NotFoundException('Clinic not found');
    }
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
