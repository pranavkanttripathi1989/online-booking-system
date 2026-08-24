import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DepartmentInput } from './dto/department.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, assertSameOrg, isSameOrg } from '../common/scoping/tenant-scope';

// Departments owns client_org_id directly (REQ014's own spec), the same
// pattern as Resources (REQ017) — an org-level asset assigned to one
// clinic, not a clinic-owned concept the way a Room is. Reads use
// orgScope() directly against this table's own column, not orgScopeVia()
// through a relation. Writes derive client_org_id from the validated
// target clinic (see create()'s own comment), not orgIdForWrite(user, ...)
// — a deliberate deviation from Resources' precedent, found to be a real
// bug there too (not fixed in this slice, out of scope for Resources).
@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(department: any) {
    if (!department) return null;
    const { client_org_id, is_deleted, ...rest } = department;
    return rest;
  }

  async findAll(clinicId: string | undefined, user: JwtPayload) {
    const departments = await this.prisma.departments.findMany({
      where: {
        is_deleted: false,
        ...(clinicId ? { clinic_id: clinicId } : {}),
        ...orgScope(user),
      },
      include: { clinic: true },
      orderBy: { created_at: 'asc' },
    });
    return departments.map((d) => this.toGraphQL(d));
  }

  async findOne(id: string, user: JwtPayload) {
    const department = await this.prisma.departments.findUnique({ where: { id }, include: { clinic: true } });
    if (!department || department.is_deleted) {
      throw new NotFoundException('Department not found');
    }
    assertSameOrg(user, department.client_org_id, 'Department');
    return this.toGraphQL(department);
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

  async create(input: DepartmentInput, user: JwtPayload) {
    if (!input.clinic_id) {
      throw new BadRequestException('clinic_id is required');
    }
    // Derive client_org_id from the already-validated target clinic, not
    // orgIdForWrite(user, ...) — live-reproduced bug found while testing
    // this slice: for a platform operator (admin/super_admin), orgIdForWrite
    // returns their OWN org (or undefined if they have none, which crashes
    // on this column's NOT NULL constraint with a raw Prisma error instead
    // of a clean one). A platform operator's own org has nothing to do with
    // which org the TARGET clinic belongs to, so stamping it would silently
    // create a Department whose client_org_id disagrees with its own
    // clinic.client_org_id. assertClinicInScope() already fetched and
    // verified the clinic — reuse that row's real org instead.
    const clinic = await this.assertClinicInScope(input.clinic_id, user);
    const department = await this.prisma.departments.create({
      data: {
        name: input.name,
        clinic_id: input.clinic_id,
        client_org_id: clinic.client_org_id as string,
      },
      include: { clinic: true },
    });
    return this.toGraphQL(department);
  }

  async update(id: string, input: DepartmentInput, user: JwtPayload) {
    const existing = await this.prisma.departments.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) {
      throw new NotFoundException('Department not found');
    }
    assertSameOrg(user, existing.client_org_id, 'Department');
    if (input.clinic_id && input.clinic_id !== existing.clinic_id) {
      await this.assertClinicInScope(input.clinic_id, user);
    }
    const department = await this.prisma.departments.update({
      where: { id },
      data: {
        name: input.name ?? existing.name,
        clinic_id: input.clinic_id ?? existing.clinic_id,
      },
      include: { clinic: true },
    });
    return this.toGraphQL(department);
  }

  async remove(id: string, user: JwtPayload) {
    const existing = await this.prisma.departments.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) {
      return { success: false, userErrors: [{ message: 'Department not found' }] };
    }
    if (!isSameOrg(user, existing.client_org_id)) {
      return { success: false, userErrors: [{ message: 'Department not found' }] };
    }
    await this.prisma.departments.update({ where: { id }, data: { is_deleted: true } });
    return { success: true, userErrors: [] };
  }

  // Reused by clinicians.service.ts/services.service.ts's create/update
  // when a caller-supplied department_id is present — Hard Rule 6 applies
  // to this cross-domain FK the same way it applies to clinic_id.
  async assertDepartmentInScope(departmentId: string, user: JwtPayload) {
    const department = await this.prisma.departments.findUnique({ where: { id: departmentId } });
    if (!department || department.is_deleted) {
      throw new BadRequestException('Department not found');
    }
    if (!isSameOrg(user, department.client_org_id)) {
      throw new BadRequestException('Department not found');
    }
    return department;
  }
}
