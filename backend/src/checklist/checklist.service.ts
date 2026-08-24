import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChecklistItemInput, UpdateChecklistItemInput } from './dto/checklist.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScopeVia } from '../common/scoping/tenant-scope';

@Injectable()
export class ChecklistService {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(row: any) {
    return {
      id: row.id,
      clinic_id: row.clinic_id,
      product_id: row.product_id ?? undefined,
      label: row.label,
      is_required: row.is_required,
      sort_order: row.sort_order,
    };
  }

  // Same shape as cancellation-rules.service.ts's findScopedClinic — the
  // clinic row (not just a boolean) is needed so a create path can derive
  // the item's tenant anchor from the CLINIC's own org, not the caller's.
  private async findScopedClinic(clinicId: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.is_deleted) return null;
    if (user.client_org_id && clinic.client_org_id !== user.client_org_id) return null;
    return clinic;
  }

  private async findOwned(id: string, user: JwtPayload) {
    const existing = await this.prisma.checklistItems.findUnique({ where: { id }, include: { clinic: true } });
    if (!existing || existing.is_deleted) return null;
    if (user.client_org_id && existing.clinic.client_org_id !== user.client_org_id) return null;
    return existing;
  }

  // clinic_id omitted -> every item across every clinic in the caller's own
  // org (orgScopeVia the clinic relation, same no-args "my org's own rows"
  // shape queueEntries/rooms already use) -- an admin overview, and also
  // what the tenancy matrix exercises, since a single caller-supplied
  // clinic_id can't serve both an org-A and an org-B actor from one shared
  // query/variables pair. clinic_id given -> scoped to that one clinic, as
  // before.
  async list(clinicId: string | undefined, productId: string | undefined, user: JwtPayload) {
    if (!clinicId) {
      const rows = await this.prisma.checklistItems.findMany({
        where: { is_deleted: false, ...orgScopeVia(user, 'clinic') },
        orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
      });
      return rows.map((r) => this.toGraphQL(r));
    }
    const clinic = await this.findScopedClinic(clinicId, user);
    if (!clinic) return [];
    const rows = await this.prisma.checklistItems.findMany({
      where: {
        clinic_id: clinicId,
        is_deleted: false,
        // clinic-wide items (product_id: null) always apply; a
        // product-scoped filter additionally includes that product's own items.
        ...(productId ? { OR: [{ product_id: null }, { product_id: productId }] } : { product_id: null }),
      },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
    });
    return rows.map((r) => this.toGraphQL(r));
  }

  async create(input: CreateChecklistItemInput, user: JwtPayload) {
    const clinic = await this.findScopedClinic(input.clinic_id, user);
    if (!clinic) return { success: false, userErrors: [{ message: 'Clinic not found' }] };
    if (input.product_id) {
      const product = await this.prisma.products.findUnique({ where: { id: input.product_id } });
      if (!product || product.clinic_id !== input.clinic_id) {
        return { success: false, userErrors: [{ message: 'Product not found for this clinic' }] };
      }
    }
    try {
      const row = await this.prisma.checklistItems.create({
        data: {
          clinic_id: input.clinic_id,
          product_id: input.product_id || null,
          label: input.label,
          is_required: input.is_required ?? true,
          sort_order: input.sort_order ?? 0,
        },
      });
      return { success: true, userErrors: [], checklistItem: this.toGraphQL(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to create checklist item' }] };
    }
  }

  async update(id: string, input: UpdateChecklistItemInput, user: JwtPayload) {
    const existing = await this.findOwned(id, user);
    if (!existing) return { success: false, userErrors: [{ message: 'Checklist item not found' }] };
    try {
      const row = await this.prisma.checklistItems.update({
        where: { id },
        data: {
          label: input.label,
          is_required: input.is_required,
          sort_order: input.sort_order,
        },
      });
      return { success: true, userErrors: [], checklistItem: this.toGraphQL(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to update checklist item' }] };
    }
  }

  async remove(id: string, user: JwtPayload) {
    const existing = await this.findOwned(id, user);
    if (!existing) return { success: false, userErrors: [{ message: 'Checklist item not found' }] };
    try {
      await this.prisma.checklistItems.update({ where: { id }, data: { is_deleted: true } });
      return { success: true, userErrors: [] };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to delete checklist item' }] };
    }
  }

  // Self-scoped via the appointment, not a bare checklist_item_id lookup --
  // a caller marking an item complete must be in the same org as the
  // appointment itself (Hard Rule 6's class of check, applied to a write
  // that references a cross-domain foreign key).
  async completeItem(checklistItemId: string, appointmentId: string, user: JwtPayload) {
    const appointment = await this.prisma.appointments.findUnique({
      where: { id: appointmentId },
      include: { clinic: true },
    });
    if (!appointment || appointment.is_deleted) return { success: false, userErrors: [{ message: 'Appointment not found' }] };
    if (user.client_org_id && appointment.clinic.client_org_id !== user.client_org_id) {
      return { success: false, userErrors: [{ message: 'Appointment not found' }] };
    }
    const item = await this.prisma.checklistItems.findUnique({ where: { id: checklistItemId } });
    if (!item || item.is_deleted || item.clinic_id !== appointment.clinic_id) {
      return { success: false, userErrors: [{ message: 'Checklist item not found for this appointment\'s clinic' }] };
    }
    try {
      await this.prisma.checklistCompletions.upsert({
        where: { checklist_item_id_appointment_id: { checklist_item_id: checklistItemId, appointment_id: appointmentId } },
        create: {
          checklist_item_id: checklistItemId,
          appointment_id: appointmentId,
          completed_by_user_id: user.sub,
        },
        update: {},
      });
      return { success: true, userErrors: [] };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to record checklist completion' }] };
    }
  }

  async completionsForAppointment(appointmentId: string, user: JwtPayload) {
    const appointment = await this.prisma.appointments.findUnique({ where: { id: appointmentId }, include: { clinic: true } });
    if (!appointment) return [];
    if (user.client_org_id && appointment.clinic.client_org_id !== user.client_org_id) return [];
    const rows = await this.prisma.checklistCompletions.findMany({ where: { appointment_id: appointmentId } });
    return rows.map((r) => ({
      id: r.id,
      checklist_item_id: r.checklist_item_id,
      appointment_id: r.appointment_id,
      completed_by_user_id: r.completed_by_user_id,
      completed_at: r.completed_at,
    }));
  }

  // Called from QueueService.callNext() -- not exposed as its own GraphQL
  // operation. Returns the labels of every required-but-incomplete item for
  // this appointment, or [] if callNext should proceed. Deliberately keyed
  // by appointment_id, not encounter_id -- see schema.prisma's own comment
  // on ChecklistCompletions for why (no Encounters row reliably exists yet
  // at call-next time).
  async getIncompleteRequiredItems(appointmentId: string): Promise<string[]> {
    const appointment = await this.prisma.appointments.findUnique({ where: { id: appointmentId } });
    if (!appointment) return [];
    const items = await this.prisma.checklistItems.findMany({
      where: {
        clinic_id: appointment.clinic_id,
        is_deleted: false,
        is_required: true,
        ...(appointment.product_id
          ? { OR: [{ product_id: null }, { product_id: appointment.product_id }] }
          : { product_id: null }),
      },
    });
    if (items.length === 0) return [];
    const completions = await this.prisma.checklistCompletions.findMany({
      where: { appointment_id: appointmentId, checklist_item_id: { in: items.map((i) => i.id) } },
    });
    const completedIds = new Set(completions.map((c) => c.checklist_item_id));
    return items.filter((i) => !completedIds.has(i.id)).map((i) => i.label);
  }
}
