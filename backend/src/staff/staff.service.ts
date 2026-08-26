import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffInput, UpdateStaffInput } from './dto/staff.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgIdForWrite, orgScope } from '../common/scoping/tenant-scope';
import { BCRYPT_COST } from '../common/crypto/bcrypt-cost';
import { DepartmentsService } from '../departments/departments.service';


@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly departmentsService: DepartmentsService,
  ) {}

  private toGraphQL(p: any) {
    return {
      id: p.id,
      name: `${p.first_name} ${p.last_name}`.trim(),
      email: p.email,
      phone: p.phone ?? undefined,
      role: p.job_title || p.role?.name || 'Staff',
      department: p.department ?? undefined,
      status: p.staff_status,
      // staff_since is null for rows created before this column existed (or
      // where no explicit start date was ever set) -- created_at is always a
      // real value, so `since` is never null in the API either way.
      since: p.staff_since ?? p.created_at,
      address: p.address_line1 ?? undefined,
      notes: p.notes ?? undefined,
      // REQ102.
      departmentId: p.department_id_ref ?? undefined,
    };
  }

  async findAll(search: string | undefined, department: string | undefined, status: string | undefined, user: JwtPayload) {
    const rows = await this.prisma.userProfiles.findMany({
      where: {
        is_deleted: false,
        // BUG006 — `?? undefined` is no filter; an org-less caller read every
        // tenant's staff directory.
        ...orgScope(user),
        role: { name: { notIn: ['clinician', 'patient'] } },
        department: department ?? undefined,
        staff_status: status ?? undefined,
        ...(search
          ? {
              OR: [
                { first_name: { contains: search, mode: 'insensitive' as const } },
                { last_name: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: { role: true },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => this.toGraphQL(r));
  }

  // SECURITY: findOne/update/deactivate previously had NO org-scoping check
  // at all -- only findAll() did. A manager from ANY organization could view,
  // edit, or DEACTIVATE any other organization's staff account just by
  // knowing/guessing its id -- a real cross-tenant write/deactivate
  // vulnerability, same severity class as the availability self-service
  // fix earlier this pass.
  private assertStaffAccess(row: { client_org_id: string | null }, user: JwtPayload) {
    if (user.client_org_id && row.client_org_id !== user.client_org_id) {
      throw new NotFoundException('Staff member not found');
    }
  }

  async findOne(id: string, user: JwtPayload) {
    const row = await this.prisma.userProfiles.findUnique({ where: { id }, include: { role: true } });
    if (!row || row.is_deleted) throw new NotFoundException('Staff member not found');
    this.assertStaffAccess(row, user);
    return this.toGraphQL(row);
  }

  async create(input: CreateStaffInput, currentUser: JwtPayload) {
    const existing = await this.prisma.userProfiles.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) throw new ConflictException('A user with this email already exists');

    // phone is globally @unique (OTP login needs an unambiguous phone→account
    // lookup) — without this check the raw Prisma unique-constraint error
    // (including an internal file path and query text) reaches the client.
    if (input.phone) {
      const existingPhone = await this.prisma.userProfiles.findUnique({ where: { phone: input.phone } });
      if (existingPhone) throw new ConflictException('A user with this phone number already exists');
    }

    const staffRole = await this.prisma.userRoles.findFirst({ where: { name: 'staff', client_org_id: null } });
    if (!staffRole) throw new NotFoundException('Staff system role not seeded');

    // REQ102 — Hard Rule 6 cross-domain FK validation, matching services
    // .service.ts's own use of the identical helper.
    if (input.departmentId) {
      await this.departmentsService.assertDepartmentInScope(input.departmentId, currentUser);
    }

    const [firstName, ...rest] = input.name.trim().split(' ');
    const hashed = await bcrypt.hash(input.password, BCRYPT_COST);

    const profile = await this.prisma.$transaction(async (tx) => {
      const user = await tx.users.create({ data: {} });
      return tx.userProfiles.create({
        data: {
          id: user.id,
          email: input.email.toLowerCase(),
          password: hashed,
          first_name: firstName || input.name,
          last_name: rest.join(' '),
          phone: input.phone || undefined,
          role_id: staffRole.id,
          job_title: input.role,
          department: input.department,
          staff_status: input.status ?? 'active',
          staff_since: input.since ? new Date(input.since) : undefined,
          address_line1: input.address,
          notes: input.notes,
          department_id_ref: input.departmentId,
          // BUG006 — `?? undefined` silently created an ORG-LESS staff account.
          client_org_id: orgIdForWrite(currentUser, 'staff member'),
        },
        include: { role: true },
      });
    });
    return this.toGraphQL(profile);
  }

  async update(id: string, input: UpdateStaffInput, user: JwtPayload) {
    const existing = await this.prisma.userProfiles.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) throw new NotFoundException('Staff member not found');
    this.assertStaffAccess(existing, user);

    // Same email/phone uniqueness gap as create() — pre-check rather than let
    // a raw Prisma unique-constraint error reach the client.
    if (input.email && input.email.toLowerCase() !== existing.email) {
      const emailTaken = await this.prisma.userProfiles.findUnique({ where: { email: input.email.toLowerCase() } });
      if (emailTaken) throw new ConflictException('A user with this email already exists');
    }
    if (input.phone && input.phone !== existing.phone) {
      const phoneTaken = await this.prisma.userProfiles.findUnique({ where: { phone: input.phone } });
      if (phoneTaken) throw new ConflictException('A user with this phone number already exists');
    }
    if (input.departmentId) {
      await this.departmentsService.assertDepartmentInScope(input.departmentId, user);
    }

    let firstName = existing.first_name;
    let lastName = existing.last_name;
    if (input.name) {
      const [f, ...rest] = input.name.trim().split(' ');
      firstName = f || input.name;
      lastName = rest.join(' ');
    }

    // context/open-questions.md #3 — resolved: admin sets a specific password
    // directly. Only hashed and written when actually provided -- an absent
    // field must never clear the existing password.
    const hashedPassword = input.password ? await bcrypt.hash(input.password, BCRYPT_COST) : undefined;

    const profile = await this.prisma.userProfiles.update({
      where: { id },
      data: {
        first_name: firstName,
        last_name: lastName,
        email: input.email ? input.email.toLowerCase() : undefined,
        phone: input.phone,
        job_title: input.role,
        department: input.department,
        staff_status: input.status,
        staff_since: input.since ? new Date(input.since) : undefined,
        address_line1: input.address,
        notes: input.notes,
        department_id_ref: input.departmentId,
        password: hashedPassword,
      },
      include: { role: true },
    });
    return this.toGraphQL(profile);
  }

  // A dedicated mutation (not an overload of updateUser/updateStaff) — an
  // audit-worthy event distinct from a generic profile edit, matching
  // staff/index.jsx's explicit "Deactivate" action (next-10-features-
  // implementation-plan.md #7).
  async deactivate(id: string, user: JwtPayload) {
    const existing = await this.prisma.userProfiles.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) throw new NotFoundException('Staff member not found');
    this.assertStaffAccess(existing, user);
    const profile = await this.prisma.userProfiles.update({
      where: { id },
      data: { staff_status: 'inactive', is_active: false },
      include: { role: true },
    });
    return this.toGraphQL(profile);
  }
}
