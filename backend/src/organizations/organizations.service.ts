import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationInput, OrganizationSearchInput } from './dto/organization.input';

// TC-ADMIN-UNIT-008: lowercase, non-alphanumeric runs collapsed to a single
// hyphen, leading/trailing whitespace and hyphens trimmed.
export function normalizeOrgCode(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(org: any) {
    if (!org) return null;
    const { address_structured, contact_email, contact_phone, ...rest } = org;
    return {
      ...rest,
      contactEmail: contact_email,
      contactPhone: contact_phone ?? undefined,
      address: address_structured ?? undefined,
    };
  }

  async findAllPaginated(search: OrganizationSearchInput = {}) {
    const limit = search.limit ?? 25;
    const offset = search.offset ?? 0;
    const where = {
      is_deleted: false,
      ...(search.search
        ? {
            OR: [
              { name: { contains: search.search, mode: 'insensitive' as const } },
              { code: { contains: search.search, mode: 'insensitive' as const } },
              { contact_email: { contains: search.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.clientOrganizations.findMany({ where, take: limit, skip: offset, orderBy: { created_at: 'desc' } }),
      this.prisma.clientOrganizations.count({ where }),
    ]);

    return {
      data: rows.map((r) => this.toGraphQL(r)),
      pageInfo: {
        total,
        limit,
        offset,
        hasNextPage: offset + rows.length < total,
        hasPreviousPage: offset > 0,
      },
    };
  }

  private async assertCodeAvailable(code: string, excludeId?: string) {
    // TC-ADMIN-API-010: ClientOrganizations.code @unique — checked explicitly
    // (rather than relying on the DB constraint alone) so the error is a clean
    // field-level ConflictException, not a raw Prisma P2002 leaking through.
    const existing = await this.prisma.clientOrganizations.findUnique({ where: { code } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Organization code "${code}" is already in use`);
    }
  }

  async create(input: OrganizationInput) {
    const code = normalizeOrgCode(input.code);
    await this.assertCodeAvailable(code);
    const org = await this.prisma.clientOrganizations.create({
      data: {
        name: input.name,
        code,
        contact_email: input.contactEmail,
        contact_phone: input.contactPhone,
        address_structured: input.address as any,
        is_active: input.is_active ?? true,
        // Phase 4 admin-CRUD path — distinct from the Phase 3.5 self-serve
        // onboarding wizard, which creates owner_user_id/onboarding_status
        // transactionally. An admin-created org has no owner and is
        // considered already "onboarded" (test-suggestion/organization-onboarding-test-suggestion.md).
        onboarding_status: 'completed',
      },
    });
    return this.toGraphQL(org);
  }

  async update(id: string, input: OrganizationInput) {
    const existing = await this.prisma.clientOrganizations.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) {
      throw new NotFoundException('Organization not found');
    }
    const code = input.code ? normalizeOrgCode(input.code) : existing.code;
    if (code !== existing.code) {
      await this.assertCodeAvailable(code, id);
    }
    const org = await this.prisma.clientOrganizations.update({
      where: { id },
      data: {
        name: input.name,
        code,
        contact_email: input.contactEmail,
        contact_phone: input.contactPhone,
        address_structured: input.address as any,
        is_active: input.is_active,
      },
    });
    return this.toGraphQL(org);
  }

  async softDelete(id: string) {
    const existing = await this.prisma.clientOrganizations.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) {
      throw new NotFoundException('Organization not found');
    }
    await this.prisma.clientOrganizations.update({ where: { id }, data: { is_deleted: true, is_active: false } });
    return true;
  }
}
