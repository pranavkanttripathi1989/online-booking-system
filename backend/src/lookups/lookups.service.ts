import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ClinicianTypeModel/RoomTypeModel are global taxonomies (no client_org_id —
// per schema.prisma, shared across all tenants), unlike Clinics/Rooms above.
// TC-ADMIN-API-013/UNIT-009: name uniqueness is enforced case-insensitively,
// which Postgres's default citext-less `@unique` does NOT do on its own.
type LookupModel = 'clinicianTypeModel' | 'roomTypeModel';

// Structural shape shared by all 4 GraphQL input types (dto/lookup.input.ts) —
// decoupled here since those are 4 distinct GraphQL type names, not one class.
interface LookupCreateData { name: string; description?: string; is_active?: boolean }
interface LookupUpdateData { name?: string; description?: string; is_active?: boolean }

@Injectable()
export class LookupsService {
  constructor(private readonly prisma: PrismaService) {}

  private delegate(model: LookupModel) {
    return this.prisma[model] as any;
  }

  findAll(model: LookupModel) {
    return this.delegate(model).findMany({ orderBy: { name: 'asc' } });
  }

  private async assertNameNotTaken(model: LookupModel, name: string, excludeId?: string) {
    const rows = await this.delegate(model).findMany({ where: { name: { equals: name, mode: 'insensitive' } } });
    if (rows.some((r: { id: string }) => r.id !== excludeId)) {
      throw new ConflictException(`"${name}" already exists (case-insensitive match)`);
    }
  }

  async create(model: LookupModel, input: LookupCreateData) {
    await this.assertNameNotTaken(model, input.name);
    return this.delegate(model).create({ data: input });
  }

  async update(model: LookupModel, id: string, input: LookupUpdateData) {
    const existing = await this.delegate(model).findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Not found');
    }
    if (input.name) {
      await this.assertNameNotTaken(model, input.name, id);
    }
    return this.delegate(model).update({ where: { id }, data: input });
  }

  // ClinicianTypeModel/RoomTypeModel carry no `is_deleted` column (unlike most
  // other domains in this schema) — a genuine hard delete, not a soft one.
  // Safe because Rooms.room_type/Clinicians.clinician_type are plain strings,
  // not foreign keys (schema.prisma), so there's no FK constraint to violate.
  async remove(model: LookupModel, id: string) {
    const existing = await this.delegate(model).findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Not found');
    }
    await this.delegate(model).delete({ where: { id } });
    return true;
  }
}
