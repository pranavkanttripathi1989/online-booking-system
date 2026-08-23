import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResourceInput } from './dto/resource.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, orgIdForWrite, assertSameOrg, isSameOrg } from '../common/scoping/tenant-scope';

// Resources owns client_org_id directly (REQ014's own spec), unlike Rooms
// which scopes only via its clinic relation — an org-level asset assigned
// to one clinic, not a clinic-owned concept the way a room is. Scoping
// therefore uses orgScope()/orgIdForWrite() directly against this table's
// own column, not orgScopeVia() through a relation.
@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(resource: any) {
    if (!resource) return null;
    const { client_org_id, is_deleted, ...rest } = resource;
    return rest;
  }

  async findAll(clinicId: string | undefined, user: JwtPayload) {
    const resources = await this.prisma.resources.findMany({
      where: {
        is_deleted: false,
        ...(clinicId ? { clinic_id: clinicId } : {}),
        ...orgScope(user),
      },
      include: { clinic: true },
      orderBy: { created_at: 'asc' },
    });
    return resources.map((r) => this.toGraphQL(r));
  }

  async findOne(id: string, user: JwtPayload) {
    const resource = await this.prisma.resources.findUnique({ where: { id }, include: { clinic: true } });
    if (!resource || resource.is_deleted) {
      throw new NotFoundException('Resource not found');
    }
    assertSameOrg(user, resource.client_org_id, 'Resource');
    return this.toGraphQL(resource);
  }

  // Hard Rule 6: a create* mutation taking a caller-supplied clinic_id must
  // validate that clinic belongs to the caller's org — the exact bug class
  // already found and fixed across five other domains (createAvailability,
  // createSpacerBlock/createRoomBlock, createClinician, createAppointment).
  private async assertClinicInScope(clinicId: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.is_deleted) {
      throw new BadRequestException('Clinic not found');
    }
    if (!isSameOrg(user, clinic.client_org_id)) {
      throw new BadRequestException('Clinic not found');
    }
    return clinic;
  }

  async create(input: ResourceInput, user: JwtPayload) {
    if (!input.clinic_id) {
      throw new BadRequestException('clinic_id is required');
    }
    await this.assertClinicInScope(input.clinic_id, user);
    const resource = await this.prisma.resources.create({
      data: {
        name: input.name,
        clinic_id: input.clinic_id,
        type: input.type ?? 'equipment',
        is_bookable: input.is_bookable ?? true,
        client_org_id: orgIdForWrite(user, 'Resource') as string,
      },
      include: { clinic: true },
    });
    return this.toGraphQL(resource);
  }

  async update(id: string, input: ResourceInput, user: JwtPayload) {
    const existing = await this.prisma.resources.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) {
      throw new NotFoundException('Resource not found');
    }
    assertSameOrg(user, existing.client_org_id, 'Resource');
    if (input.clinic_id && input.clinic_id !== existing.clinic_id) {
      await this.assertClinicInScope(input.clinic_id, user);
    }
    const resource = await this.prisma.resources.update({
      where: { id },
      data: {
        name: input.name ?? existing.name,
        clinic_id: input.clinic_id ?? existing.clinic_id,
        type: input.type ?? existing.type,
        is_bookable: input.is_bookable ?? existing.is_bookable,
      },
      include: { clinic: true },
    });
    return this.toGraphQL(resource);
  }

  async remove(id: string, user: JwtPayload) {
    const existing = await this.prisma.resources.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) {
      return { success: false, userErrors: [{ message: 'Resource not found' }] };
    }
    if (!isSameOrg(user, existing.client_org_id)) {
      return { success: false, userErrors: [{ message: 'Resource not found' }] };
    }
    await this.prisma.resources.update({ where: { id }, data: { is_deleted: true } });
    return { success: true, userErrors: [] };
  }
}
