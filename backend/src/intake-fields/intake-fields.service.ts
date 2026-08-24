import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIntakeFieldInput, UpdateIntakeFieldInput } from './dto/intake-field.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScopeVia } from '../common/scoping/tenant-scope';

@Injectable()
export class IntakeFieldsService {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(row: any) {
    return {
      id: row.id,
      clinic_id: row.clinic_id,
      product_id: row.product_id ?? undefined,
      key: row.key,
      label: row.label,
      field_type: row.field_type,
      is_required: row.is_required,
      sort_order: row.sort_order,
    };
  }

  private async findScopedClinic(clinicId: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.is_deleted) return null;
    if (user.client_org_id && clinic.client_org_id !== user.client_org_id) return null;
    return clinic;
  }

  private async findOwned(id: string, user: JwtPayload) {
    const existing = await this.prisma.clinicIntakeFieldConfig.findUnique({ where: { id }, include: { clinic: true } });
    if (!existing || existing.is_deleted) return null;
    if (user.client_org_id && existing.clinic.client_org_id !== user.client_org_id) return null;
    return existing;
  }

  // clinic_id omitted -> every field across every clinic in the caller's
  // own org (same no-args shape as ChecklistService.list -- REQ051).
  async list(clinicId: string | undefined, productId: string | undefined, user: JwtPayload) {
    if (!clinicId) {
      const rows = await this.prisma.clinicIntakeFieldConfig.findMany({
        where: { is_deleted: false, ...orgScopeVia(user, 'clinic') },
        orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
      });
      return rows.map((r) => this.toGraphQL(r));
    }
    const clinic = await this.findScopedClinic(clinicId, user);
    if (!clinic) return [];
    const rows = await this.prisma.clinicIntakeFieldConfig.findMany({
      where: {
        clinic_id: clinicId,
        is_deleted: false,
        ...(productId ? { OR: [{ product_id: null }, { product_id: productId }] } : { product_id: null }),
      },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
    });
    return rows.map((r) => this.toGraphQL(r));
  }

  // Called from appointments.service.ts's create() -- every applicable
  // field (clinic-wide + this product's own) for a booking, used to
  // validate required fields were answered.
  async forBooking(clinicId: string, productId: string | undefined) {
    return this.prisma.clinicIntakeFieldConfig.findMany({
      where: {
        clinic_id: clinicId,
        is_deleted: false,
        ...(productId ? { OR: [{ product_id: null }, { product_id: productId }] } : { product_id: null }),
      },
    });
  }

  async create(input: CreateIntakeFieldInput, user: JwtPayload) {
    const clinic = await this.findScopedClinic(input.clinic_id, user);
    if (!clinic) return { success: false, userErrors: [{ message: 'Clinic not found' }] };
    if (input.product_id) {
      const product = await this.prisma.products.findUnique({ where: { id: input.product_id } });
      if (!product || product.clinic_id !== input.clinic_id) {
        return { success: false, userErrors: [{ message: 'Product not found for this clinic' }] };
      }
    }
    try {
      const row = await this.prisma.clinicIntakeFieldConfig.create({
        data: {
          clinic_id: input.clinic_id,
          product_id: input.product_id || null,
          key: input.key,
          label: input.label,
          field_type: input.field_type ?? 'text',
          is_required: input.is_required ?? false,
          sort_order: input.sort_order ?? 0,
        },
      });
      return { success: true, userErrors: [], intakeField: this.toGraphQL(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to create intake field' }] };
    }
  }

  async update(id: string, input: UpdateIntakeFieldInput, user: JwtPayload) {
    const existing = await this.findOwned(id, user);
    if (!existing) return { success: false, userErrors: [{ message: 'Intake field not found' }] };
    try {
      const row = await this.prisma.clinicIntakeFieldConfig.update({
        where: { id },
        data: {
          label: input.label,
          field_type: input.field_type,
          is_required: input.is_required,
          sort_order: input.sort_order,
        },
      });
      return { success: true, userErrors: [], intakeField: this.toGraphQL(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to update intake field' }] };
    }
  }

  async remove(id: string, user: JwtPayload) {
    const existing = await this.findOwned(id, user);
    if (!existing) return { success: false, userErrors: [{ message: 'Intake field not found' }] };
    try {
      await this.prisma.clinicIntakeFieldConfig.update({ where: { id }, data: { is_deleted: true } });
      return { success: true, userErrors: [] };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to delete intake field' }] };
    }
  }
}
