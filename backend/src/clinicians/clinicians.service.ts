import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClinicianInput } from './dto/clinician.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScopeVia, assertSameOrg, isSameOrg } from '../common/scoping/tenant-scope';
import { DepartmentsService } from '../departments/departments.service';

const RUPEES_TO_PAISE = (rupees?: number) => (rupees == null ? undefined : Math.round(rupees * 100));
const PAISE_TO_RUPEES = (paise?: number | null) => (paise == null ? undefined : paise / 100);

@Injectable()
export class CliniciansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly departmentsService: DepartmentsService,
  ) {}

  private include() {
    return {
      clinic: true,
      department: true,
      clinicianLanguages: { where: { is_deleted: false }, include: { language: true } },
      clinicianServices: { where: { is_deleted: false }, include: { product: true } },
    };
  }

  private async toGraphQL(clinician: any) {
    const { clinic, clinicianLanguages, clinicianServices, clinician_type, consultation_fee, ...rest } = clinician;

    let clinicianTypeInfo: { id: string; name: string; description?: string } | undefined;
    if (clinician_type) {
      const typeRow = await this.prisma.clinicianTypeModel.findFirst({ where: { name: clinician_type } });
      clinicianTypeInfo = typeRow
        ? { id: typeRow.id, name: typeRow.name, description: typeRow.description ?? undefined }
        : { id: clinician_type, name: clinician_type };
    }

    return {
      ...rest,
      full_name: `${clinician.first_name} ${clinician.last_name}`,
      consultation_fee: PAISE_TO_RUPEES(consultation_fee),
      clinician_type: clinicianTypeInfo,
      languages: (clinicianLanguages ?? []).map((cl: any) => cl.language.name),
      clinics: clinic ? [clinic] : [],
      services: (clinicianServices ?? []).map((cs: any) => ({
        id: cs.product.id,
        name: cs.product.name,
        duration_minutes: cs.product.duration_minutes ?? undefined,
        price: PAISE_TO_RUPEES(cs.product.price),
      })),
    };
  }

  async findAll(
    clinicId: string | undefined,
    isActive: boolean | undefined,
    first: number,
    page: number,
    user: JwtPayload,
  ) {
    const where = {
      is_deleted: false,
      ...(clinicId ? { clinic_id: clinicId } : {}),
      ...(isActive !== undefined ? { is_active: isActive } : {}),
      ...orgScopeVia(user, 'clinic'),
    };
    const currentPage = page && page > 0 ? page : 1;
    const perPage = first && first > 0 ? first : 20;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.clinicians.findMany({
        where,
        include: this.include(),
        take: perPage,
        skip: (currentPage - 1) * perPage,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.clinicians.count({ where }),
    ]);

    const lastPage = Math.max(1, Math.ceil(total / perPage));
    return {
      data: await Promise.all(rows.map((r) => this.toGraphQL(r))),
      paginatorInfo: {
        count: rows.length,
        currentPage,
        hasMorePages: currentPage < lastPage,
        lastPage,
        perPage,
        total,
      },
    };
  }

  async findOne(id: string, user: JwtPayload) {
    const clinician = await this.prisma.clinicians.findUnique({ where: { id }, include: this.include() });
    if (!clinician || clinician.is_deleted) {
      throw new NotFoundException('Clinician not found');
    }
    assertSameOrg(user, clinician.clinic?.client_org_id ?? null, 'Clinician');
    return this.toGraphQL(clinician);
  }

  // languages arrives as a list of display names (CreateClinicianPage.jsx's
  // LANGUAGE_OPTIONS is a hardcoded local list, not backed by a Languages
  // query) — matched case-insensitively against the real Languages table;
  // a name with no match is silently skipped rather than auto-creating a new
  // Languages row, since that's the admin Languages page's job, not this form's.
  private async resolveLanguageIds(names: string[]): Promise<string[]> {
    if (!names?.length) return [];
    const rows = await this.prisma.languages.findMany({
      where: { OR: names.map((n) => ({ name: { equals: n, mode: 'insensitive' as const } })) },
    });
    return rows.map((r) => r.id);
  }

  // SECURITY: create() previously never validated the target clinic against
  // the caller's org at all -- only update() did (via findOne()'s existing-
  // record lookup). A manager/admin could create a clinician record
  // attributed to a DIFFERENT organization's clinic just by passing its
  // clinic_id. Same gap class fixed in availability.service.ts's create()
  // and blocks.service.ts's createSpacerBlock/createRoomBlock.
  async create(input: ClinicianInput, user: JwtPayload) {
    let clinicianTypeName: string | undefined;
    if (input.clinician_type_id) {
      const typeRow = await this.prisma.clinicianTypeModel.findUnique({ where: { id: input.clinician_type_id } });
      if (!typeRow) throw new BadRequestException('Unknown clinician_type_id');
      clinicianTypeName = typeRow.name;
    }
    const clinicId = input.clinic_ids?.[0];
    if (!clinicId) throw new BadRequestException('At least one clinic_id is required');
    const targetClinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!targetClinic || !isSameOrg(user, targetClinic.client_org_id)) {
      throw new BadRequestException('Clinic not found');
    }
    // REQ014 (US-ORG-03) — Hard Rule 6 applies to this cross-domain FK the
    // same way it applies to clinic_id above.
    if (input.department_id) {
      await this.departmentsService.assertDepartmentInScope(input.department_id, user);
    }
    const languageIds = await this.resolveLanguageIds(input.languages ?? []);

    const clinicianId = await this.prisma.$transaction(async (tx) => {
      const clinician = await tx.clinicians.create({
        data: {
          first_name: input.first_name,
          last_name: input.last_name,
          email: input.email,
          phone: input.phone ?? '',
          gender: input.gender,
          bio: input.bio,
          consultation_fee: RUPEES_TO_PAISE(input.consultation_fee),
          clinician_type: clinicianTypeName ?? '',
          clinic_id: clinicId,
          department_id: input.department_id,
          is_active: input.is_active ?? true,
        },
      });
      if (languageIds.length) {
        await tx.clinicianLanguages.createMany({
          data: languageIds.map((language_id) => ({ clinician_id: clinician.id, language_id })),
        });
      }
      if (input.service_ids?.length) {
        await tx.clinicianServices.createMany({
          data: input.service_ids.map((product_id) => ({ clinician_id: clinician.id, product_id })),
        });
      }
      return clinician.id;
    });

    // F-01 fix: this used to read back the just-created record with a
    // synthetic `{ client_org_id: null }` payload — which relied on the OLD
    // buggy `user.client_org_id ? ... : {}` check in findOne() short-
    // circuiting to "no scope check" for a null org. findOne() is fail-closed
    // now, so that synthetic bypass would incorrectly reject this read. The
    // real caller's own JWT is always sufficient here: the clinic above was
    // already verified to be in their org (or they're a platform operator).
    return this.findOne(clinicianId, user);
  }

  async update(id: string, input: ClinicianInput, user: JwtPayload) {
    await this.findOne(id, user); // enforces tenant scoping before any write

    let clinicianTypeName: string | undefined;
    if (input.clinician_type_id) {
      const typeRow = await this.prisma.clinicianTypeModel.findUnique({ where: { id: input.clinician_type_id } });
      if (!typeRow) throw new BadRequestException('Unknown clinician_type_id');
      clinicianTypeName = typeRow.name;
    }
    if (input.department_id) {
      await this.departmentsService.assertDepartmentInScope(input.department_id, user);
    }
    const languageIds = input.languages ? await this.resolveLanguageIds(input.languages) : undefined;

    await this.prisma.$transaction(async (tx) => {
      await tx.clinicians.update({
        where: { id },
        data: {
          first_name: input.first_name,
          last_name: input.last_name,
          email: input.email,
          phone: input.phone,
          gender: input.gender,
          bio: input.bio,
          consultation_fee: RUPEES_TO_PAISE(input.consultation_fee),
          clinician_type: clinicianTypeName,
          clinic_id: input.clinic_ids?.[0],
          department_id: input.department_id,
          is_active: input.is_active,
        },
      });
      if (languageIds) {
        await tx.clinicianLanguages.deleteMany({ where: { clinician_id: id } });
        if (languageIds.length) {
          await tx.clinicianLanguages.createMany({ data: languageIds.map((language_id) => ({ clinician_id: id, language_id })) });
        }
      }
      if (input.service_ids) {
        await tx.clinicianServices.deleteMany({ where: { clinician_id: id } });
        if (input.service_ids.length) {
          await tx.clinicianServices.createMany({ data: input.service_ids.map((product_id) => ({ clinician_id: id, product_id })) });
        }
      }
    });

    return this.findOne(id, user);
  }

  // components/Clinicians/ClinicianCard.jsx's real contract
  // (context/frontend-integration-audit.md) -- a lightweight single-field
  // flip, distinct from update() since ClinicianInput requires first_name/
  // last_name/email and the card only ever has the current is_active value
  // to toggle, not a full edit form's worth of state.
  async toggleActive(id: string, user: JwtPayload) {
    const existing = await this.prisma.clinicians.findUnique({ where: { id }, include: { clinic: true } });
    if (!existing || existing.is_deleted) {
      throw new NotFoundException('Clinician not found');
    }
    assertSameOrg(user, existing.clinic?.client_org_id ?? null, 'Clinician');
    const clinician = await this.prisma.clinicians.update({
      where: { id },
      data: { is_active: !existing.is_active },
      include: this.include(),
    });
    return this.toGraphQL(clinician);
  }

  // Backs ClinicianType.availability_templates (clinicians.resolver.ts
  // @ResolveField) -- see entities/clinician.entity.ts for why this reads
  // the same ClinicianAvailability table as the Availability domain but
  // exposes its own differently-shaped GraphQL type.
  async availabilityTemplates(clinicianId: string) {
    const rows = await this.prisma.clinicianAvailability.findMany({
      where: { clinician_id: clinicianId, is_deleted: false },
      include: { clinic: true, room: true },
      orderBy: { day_of_week: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      day_of_week: r.day_of_week ?? undefined,
      start_time: r.start_time,
      end_time: r.end_time,
      is_active: r.is_active,
      effective_from: r.valid_from,
      effective_to: r.valid_until ?? undefined,
      clinic: r.clinic,
      room: r.room ? { ...r.room, name: r.room.room_number } : undefined,
    }));
  }
}
