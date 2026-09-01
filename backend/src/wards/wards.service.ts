import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, assertSameOrg, isSameOrg } from '../common/scoping/tenant-scope';
import { WardInput, BedInput, BlockBedInput } from './dto/ward.input';
import { isBedOverlapViolation } from './bed-overlap';

const PAISE_TO_RUPEES = (paise: number) => paise / 100;


// REQ179 (IPD slice 1) — wards and beds.
//
// Scoping: Wards and Beds own client_org_id directly (the Departments/
// Resources precedent, not the Rooms via-clinic one), because the bed board
// is an org+clinic-wide query and orgScope() must not have to join to answer
// it. Writes derive client_org_id from the already-validated target clinic,
// never orgIdForWrite(user, ...) — the live-reproduced departments.service.ts
// bug, where a platform operator's own org has nothing to do with the target
// clinic's.
@Injectable()
export class WardsService {
  private readonly logger = new Logger(WardsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Hard Rule 6: a create* mutation taking a caller-supplied clinic_id must
  // validate that clinic belongs to the caller's org.
  private async assertClinicInScope(clinicId: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.is_deleted) throw new BadRequestException('Clinic not found');
    if (!isSameOrg(user, clinic.client_org_id)) throw new BadRequestException('Clinic not found');
    return clinic;
  }

  // Same rule, applied to the cross-domain Products FK a ward's room-day
  // tariff points at. A bed rate belonging to another org would leak that
  // org's pricing into this org's bills.
  private async assertProductInScope(productId: string, user: JwtPayload) {
    const product = await this.prisma.products.findUnique({ where: { id: productId }, include: { clinic: true } });
    if (!product || product.is_deleted) throw new BadRequestException('Charge item not found');
    // A product is either clinic-owned or an org-level master (clinic_id
    // null) — the REQ055 branch-overrides convention. Check whichever exists.
    const productOrgId = product.client_org_id ?? product.clinic?.client_org_id ?? null;
    if (!isSameOrg(user, productOrgId)) throw new BadRequestException('Charge item not found');
    return product;
  }

  private wardToGraphQL(ward: any) {
    if (!ward) return null;
    const beds: any[] = ward.beds ?? [];
    return {
      id: ward.id,
      name: ward.name,
      ward_type: ward.ward_type,
      floor: ward.floor ?? undefined,
      gender_policy: ward.gender_policy,
      clinic: ward.clinic ?? undefined,
      bed_charge_product_id: ward.bed_charge_product_id ?? undefined,
      bed_charge_product_name: ward.bed_charge_product?.name ?? undefined,
      bed_charge_price:
        ward.bed_charge_product?.price != null ? PAISE_TO_RUPEES(ward.bed_charge_product.price) : undefined,
      nursing_charge_product_id: ward.nursing_charge_product_id ?? undefined,
      is_active: ward.is_active,
      total_beds: beds.length,
      occupied_beds: beds.filter((b) => b.status === 'occupied').length,
      available_beds: beds.filter((b) => b.status === 'available').length,
      created_at: ward.created_at,
    };
  }

  private bedToGraphQL(bed: any) {
    if (!bed) return null;
    return {
      id: bed.id,
      bed_number: bed.bed_number,
      bed_type: bed.bed_type ?? undefined,
      status: bed.status,
      is_active: bed.is_active,
      ward_id: bed.ward_id,
      ward_name: bed.ward?.name ?? undefined,
      ward_type: bed.ward?.ward_type ?? undefined,
      bed_charge_product_id: bed.bed_charge_product_id ?? undefined,
      created_at: bed.created_at,
    };
  }

  private readonly WARD_INCLUDE = {
    clinic: true,
    bed_charge_product: true,
    beds: { where: { is_deleted: false } },
  };

  async findAllWards(clinicId: string | undefined, user: JwtPayload) {
    const wards = await this.prisma.wards.findMany({
      where: { is_deleted: false, ...(clinicId ? { clinic_id: clinicId } : {}), ...orgScope(user) },
      include: this.WARD_INCLUDE,
      orderBy: [{ ward_type: 'asc' }, { name: 'asc' }],
    });
    return wards.map((w) => this.wardToGraphQL(w));
  }

  async findOneWard(id: string, user: JwtPayload) {
    const ward = await this.prisma.wards.findUnique({ where: { id }, include: this.WARD_INCLUDE });
    if (!ward || ward.is_deleted) throw new NotFoundException('Ward not found');
    assertSameOrg(user, ward.client_org_id, 'Ward');
    return this.wardToGraphQL(ward);
  }

  async createWard(input: WardInput, user: JwtPayload) {
    const clinic = await this.assertClinicInScope(input.clinic_id, user);
    if (input.bed_charge_product_id) await this.assertProductInScope(input.bed_charge_product_id, user);
    if (input.nursing_charge_product_id) await this.assertProductInScope(input.nursing_charge_product_id, user);

    const ward = await this.prisma.wards.create({
      data: {
        client_org_id: clinic.client_org_id as string,
        clinic_id: clinic.id,
        name: input.name,
        ward_type: input.ward_type ?? 'general',
        floor: input.floor ?? null,
        gender_policy: input.gender_policy ?? 'mixed',
        bed_charge_product_id: input.bed_charge_product_id ?? null,
        nursing_charge_product_id: input.nursing_charge_product_id ?? null,
        is_active: input.is_active ?? true,
      },
      include: this.WARD_INCLUDE,
    });
    return this.wardToGraphQL(ward);
  }

  async updateWard(id: string, input: WardInput, user: JwtPayload) {
    const existing = await this.prisma.wards.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) throw new NotFoundException('Ward not found');
    assertSameOrg(user, existing.client_org_id, 'Ward');
    if (input.clinic_id && input.clinic_id !== existing.clinic_id) {
      throw new BadRequestException('A ward cannot be moved to a different clinic');
    }
    if (input.bed_charge_product_id) await this.assertProductInScope(input.bed_charge_product_id, user);
    if (input.nursing_charge_product_id) await this.assertProductInScope(input.nursing_charge_product_id, user);

    const ward = await this.prisma.wards.update({
      where: { id },
      data: {
        name: input.name ?? existing.name,
        ward_type: input.ward_type ?? existing.ward_type,
        floor: input.floor !== undefined ? input.floor : existing.floor,
        gender_policy: input.gender_policy ?? existing.gender_policy,
        bed_charge_product_id:
          input.bed_charge_product_id !== undefined ? input.bed_charge_product_id : existing.bed_charge_product_id,
        nursing_charge_product_id:
          input.nursing_charge_product_id !== undefined
            ? input.nursing_charge_product_id
            : existing.nursing_charge_product_id,
        is_active: input.is_active ?? existing.is_active,
      },
      include: this.WARD_INCLUDE,
    });
    return this.wardToGraphQL(ward);
  }

  async removeWard(id: string, user: JwtPayload) {
    const existing = await this.prisma.wards.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) return { success: false, userErrors: [{ message: 'Ward not found' }] };
    if (!isSameOrg(user, existing.client_org_id)) return { success: false, userErrors: [{ message: 'Ward not found' }] };

    // A ward with anyone in it is not deletable — soft-deleting it would
    // orphan a live admission from its bed board.
    const occupied = await this.prisma.beds.count({
      where: { ward_id: id, is_deleted: false, status: { in: ['occupied', 'reserved'] } },
    });
    if (occupied > 0) {
      return {
        success: false,
        userErrors: [{ message: `This ward still has ${occupied} occupied or reserved bed(s). Discharge or transfer them first.` }],
      };
    }
    await this.prisma.$transaction([
      this.prisma.beds.updateMany({ where: { ward_id: id }, data: { is_deleted: true } }),
      this.prisma.wards.update({ where: { id }, data: { is_deleted: true } }),
    ]);
    return { success: true, userErrors: [] };
  }

  // ── Beds ──────────────────────────────────────────────────────────────

  async assertWardInScope(wardId: string, user: JwtPayload) {
    const ward = await this.prisma.wards.findUnique({ where: { id: wardId } });
    if (!ward || ward.is_deleted) throw new BadRequestException('Ward not found');
    if (!isSameOrg(user, ward.client_org_id)) throw new BadRequestException('Ward not found');
    return ward;
  }

  async findAllBeds(wardId: string | undefined, clinicId: string | undefined, user: JwtPayload) {
    const beds = await this.prisma.beds.findMany({
      where: {
        is_deleted: false,
        ...(wardId ? { ward_id: wardId } : {}),
        ...(clinicId ? { clinic_id: clinicId } : {}),
        ...orgScope(user),
      },
      include: { ward: true },
      orderBy: [{ ward_id: 'asc' }, { bed_number: 'asc' }],
    });
    return beds.map((b) => this.bedToGraphQL(b));
  }

  async createBed(input: BedInput, user: JwtPayload) {
    const ward = await this.assertWardInScope(input.ward_id, user);
    if (input.bed_charge_product_id) await this.assertProductInScope(input.bed_charge_product_id, user);

    const duplicate = await this.prisma.beds.findFirst({
      where: { ward_id: ward.id, bed_number: input.bed_number },
    });
    if (duplicate) {
      // The DB's @@unique([ward_id, bed_number]) is the real guarantee; this
      // is the friendly-error path in front of it, including for the
      // soft-deleted case the unique index still occupies.
      throw new ConflictException(`Bed ${input.bed_number} already exists in this ward`);
    }

    const bed = await this.prisma.beds.create({
      data: {
        client_org_id: ward.client_org_id,
        clinic_id: ward.clinic_id,
        ward_id: ward.id,
        bed_number: input.bed_number,
        bed_type: input.bed_type ?? null,
        bed_charge_product_id: input.bed_charge_product_id ?? null,
        is_active: input.is_active ?? true,
      },
      include: { ward: true },
    });
    return this.bedToGraphQL(bed);
  }

  async updateBed(id: string, input: BedInput, user: JwtPayload) {
    const existing = await this.prisma.beds.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) throw new NotFoundException('Bed not found');
    assertSameOrg(user, existing.client_org_id, 'Bed');
    if (input.ward_id && input.ward_id !== existing.ward_id) {
      throw new BadRequestException('A bed cannot be moved to a different ward');
    }
    if (input.bed_charge_product_id) await this.assertProductInScope(input.bed_charge_product_id, user);

    const bed = await this.prisma.beds.update({
      where: { id },
      data: {
        bed_number: input.bed_number ?? existing.bed_number,
        bed_type: input.bed_type !== undefined ? input.bed_type : existing.bed_type,
        bed_charge_product_id:
          input.bed_charge_product_id !== undefined ? input.bed_charge_product_id : existing.bed_charge_product_id,
        is_active: input.is_active ?? existing.is_active,
      },
      include: { ward: true },
    });
    return this.bedToGraphQL(bed);
  }

  async removeBed(id: string, user: JwtPayload) {
    const existing = await this.prisma.beds.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) return { success: false, userErrors: [{ message: 'Bed not found' }] };
    if (!isSameOrg(user, existing.client_org_id)) return { success: false, userErrors: [{ message: 'Bed not found' }] };
    if (existing.status === 'occupied' || existing.status === 'reserved') {
      return { success: false, userErrors: [{ message: 'This bed is occupied or reserved. Discharge or transfer the patient first.' }] };
    }
    await this.prisma.beds.update({ where: { id }, data: { is_deleted: true } });
    return { success: true, userErrors: [] };
  }

  // ── Blocking / releasing ──────────────────────────────────────────────
  //
  // A block is a real BedOccupancies row, not a status edit. That is what
  // makes the exclusion constraint treat "under maintenance" exactly like
  // "has a patient in it" — one guarantee covering every reason a bed is
  // unavailable, which is the whole argument for the single-timeline table.

  async blockBed(input: BlockBedInput, user: JwtPayload) {
    const bed = await this.prisma.beds.findUnique({ where: { id: input.bed_id }, include: { ward: true } });
    if (!bed || bed.is_deleted) throw new NotFoundException('Bed not found');
    assertSameOrg(user, bed.client_org_id, 'Bed');
    if (bed.status === 'occupied') {
      throw new ConflictException('This bed has a patient in it and cannot be blocked. Transfer or discharge them first.');
    }
    const kind = input.occupancy_kind ?? 'blocked';

    try {
      const bedRow = await this.prisma.$transaction(async (tx) => {
        await tx.bedOccupancies.create({
          data: {
            client_org_id: bed.client_org_id,
            clinic_id: bed.clinic_id,
            bed_id: bed.id,
            ward_id: bed.ward_id,
            admission_id: null,
            occupancy_kind: kind,
            start_at: new Date(),
            end_at: input.until ?? null,
            reason: input.reason,
            created_by_user_id: user.sub,
          },
        });
        return tx.beds.update({ where: { id: bed.id }, data: { status: kind }, include: { ward: true } });
      });
      return this.bedToGraphQL(bedRow);
    } catch (err: any) {
      if (isBedOverlapViolation(err)) {
        throw new ConflictException(`Bed ${bed.bed_number} is already occupied or held for that period`);
      }
      throw err;
    }
  }

  async releaseBed(bedId: string, user: JwtPayload) {
    const bed = await this.prisma.beds.findUnique({ where: { id: bedId }, include: { ward: true } });
    if (!bed || bed.is_deleted) throw new NotFoundException('Bed not found');
    assertSameOrg(user, bed.client_org_id, 'Bed');
    if (bed.status === 'occupied') {
      throw new ConflictException('This bed has a patient in it. Discharge or transfer them instead of releasing it.');
    }

    const bedRow = await this.prisma.$transaction(async (tx) => {
      await tx.bedOccupancies.updateMany({
        where: { bed_id: bedId, end_at: null, is_cancelled: false, admission_id: null },
        data: { end_at: new Date(), end_reason: 'cancelled', ended_by_user_id: user.sub },
      });
      return tx.beds.update({ where: { id: bedId }, data: { status: 'available' }, include: { ward: true } });
    });
    return this.bedToGraphQL(bedRow);
  }
}
