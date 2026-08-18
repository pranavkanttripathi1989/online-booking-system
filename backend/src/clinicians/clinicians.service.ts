import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClinicianInput } from './dto/clinician.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

const RUPEES_TO_PAISE = (rupees?: number) => (rupees == null ? undefined : Math.round(rupees * 100));
const PAISE_TO_RUPEES = (paise?: number | null) => (paise == null ? undefined : paise / 100);

@Injectable()
export class CliniciansService {
  constructor(private readonly prisma: PrismaService) {}

  private include() {
    return {
      clinic: true,
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
      clinic: user.client_org_id ? { client_org_id: user.client_org_id } : undefined,
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
    if (user.client_org_id && clinician.clinic && clinician.clinic.client_org_id !== user.client_org_id) {
      throw new NotFoundException('Clinician not found');
    }
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
    if (user.client_org_id) {
      const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
      if (!clinic || clinic.client_org_id !== user.client_org_id) {
        throw new BadRequestException('Clinic not found');
      }
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

    return this.findOne(clinicianId, { client_org_id: null } as JwtPayload);
  }

  async update(id: string, input: ClinicianInput, user: JwtPayload) {
    await this.findOne(id, user); // enforces tenant scoping before any write

    let clinicianTypeName: string | undefined;
    if (input.clinician_type_id) {
      const typeRow = await this.prisma.clinicianTypeModel.findUnique({ where: { id: input.clinician_type_id } });
      if (!typeRow) throw new BadRequestException('Unknown clinician_type_id');
      clinicianTypeName = typeRow.name;
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
    if (user.client_org_id && existing.clinic && existing.clinic.client_org_id !== user.client_org_id) {
      throw new NotFoundException('Clinician not found');
    }
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
