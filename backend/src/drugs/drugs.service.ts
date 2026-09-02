import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DrugInput } from './dto/drug.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { isPlatformOperator, orgIdForWrite } from '../common/scoping/tenant-scope';

@Injectable()
export class DrugsService {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(row: { client_org_id: string | null; [k: string]: unknown }) {
    const { client_org_id, ...rest } = row;
    return { ...rest, is_platform_seeded: client_org_id === null };
  }

  // REQ044/REQ016 — a hybrid visibility rule orgScope() alone can't express:
  // a tenant sees BOTH the shared platform-seeded rows (client_org_id null)
  // AND their own custom additions, but never another tenant's. A platform
  // operator sees everything, matching every other domain's convention.
  // REQ179 (IPD slice 3) — item_type defaults to 'drug' when the caller
  // omits it, which is every pre-existing call site (prescription builder,
  // MAR order search) — none of them pass this argument, so they keep
  // seeing exactly what they always saw. Only a caller that explicitly asks
  // for 'consumable'/'implant'/etc. (the OT consumables picker) sees those.
  async findAll(user: JwtPayload, search?: string, itemType?: string) {
    const where: any = {
      is_deleted: false,
      item_type: itemType ?? 'drug',
      ...(isPlatformOperator(user) ? {} : { OR: [{ client_org_id: null }, { client_org_id: user.client_org_id }] }),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };
    const rows = await this.prisma.drugs.findMany({ where, orderBy: { name: 'asc' } });
    return rows.map((r) => this.toGraphQL(r));
  }

  async findOne(id: string, user: JwtPayload) {
    const row = await this.prisma.drugs.findUnique({ where: { id } });
    if (!row || row.is_deleted) throw new NotFoundException('Drug not found');
    const visible = isPlatformOperator(user) || row.client_org_id === null || row.client_org_id === user.client_org_id;
    if (!visible) throw new NotFoundException('Drug not found'); // never confirm cross-tenant existence
    return row;
  }

  async create(input: DrugInput, user: JwtPayload) {
    const row = await this.prisma.drugs.create({
      data: { ...input, client_org_id: orgIdForWrite(user, 'drug') },
    });
    return this.toGraphQL(row);
  }

  // Write access is deliberately stricter than read access: seeing a
  // platform-seeded reference row is fine for every tenant, but editing or
  // deleting one is not — only the platform operators who seeded it can.
  // findOne()'s own visibility check is read-oriented and would otherwise
  // let any tenant "successfully" mutate shared reference data.
  private async assertWritable(id: string, user: JwtPayload) {
    const row = await this.findOne(id, user);
    const writable = isPlatformOperator(user) || row.client_org_id === user.client_org_id;
    if (!writable) throw new ForbiddenException('Cannot modify a platform-seeded drug');
    return row;
  }

  async update(id: string, input: DrugInput, user: JwtPayload) {
    const existing = await this.assertWritable(id, user);
    const row = await this.prisma.drugs.update({ where: { id: existing.id }, data: input });
    return this.toGraphQL(row);
  }

  async remove(id: string, user: JwtPayload) {
    const existing = await this.assertWritable(id, user);
    await this.prisma.drugs.update({ where: { id: existing.id }, data: { is_deleted: true } });
    return true;
  }

  // REQ173 — self-scoped via the sentinel-on-null pattern this codebase
  // uses everywhere a clinician-facing query reads from the JWT's own
  // clinician_id (appointments/encounters/patients/immunizations
  // services all use the identical idiom): an unlinked clinician account
  // gets an empty list, never every clinician's favourites.
  async findFavourites(user: JwtPayload) {
    const clinicianId = user.clinician_id ?? '__no_clinician_link__';
    const rows = await this.prisma.clinicianFavouriteDrugs.findMany({
      where: { clinician_id: clinicianId, drug: { is_deleted: false } },
      include: { drug: true },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => this.toGraphQL(r.drug));
  }

  // Re-validates visibility via findOne() (own org or platform-seeded)
  // before creating the join row — Hard Rule 6 — so a clinician can't use
  // id-guessing to infer the existence of another org's private drug.
  // upsert on the unique [clinician_id, drug_id] key makes a repeat
  // favourite a harmless no-op, not an error.
  async addFavourite(drugId: string, user: JwtPayload) {
    await this.findOne(drugId, user);
    const clinicianId = user.clinician_id ?? '__no_clinician_link__';
    await this.prisma.clinicianFavouriteDrugs.upsert({
      where: { clinician_id_drug_id: { clinician_id: clinicianId, drug_id: drugId } },
      create: { clinician_id: clinicianId, drug_id: drugId },
      update: {},
    });
    return true;
  }

  async removeFavourite(drugId: string, user: JwtPayload) {
    const clinicianId = user.clinician_id ?? '__no_clinician_link__';
    await this.prisma.clinicianFavouriteDrugs.deleteMany({
      where: { clinician_id: clinicianId, drug_id: drugId },
    });
    return true;
  }
}
