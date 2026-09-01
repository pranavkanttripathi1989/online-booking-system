import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCancellationRuleInput, UpdateCancellationRuleInput } from './dto/cancellation-rule.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope } from '../common/scoping/tenant-scope';

@Injectable()
export class CancellationRulesService {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(row: any) {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      hours_before: row.hours_before_appointment,
      fee_type: row.fee_type,
      fee_amount: row.fee_amount,
      clinic_id: row.clinic_id ?? undefined,
      product_id: row.product_id ?? undefined,
      is_active: row.is_active,
      priority: row.priority,
      rule_type: row.rule_type,
      clinic: row.clinic ? { id: row.clinic.id, name: row.clinic.name } : undefined,
      product: row.product ? { id: row.product.id, name: row.product.name } : undefined,
    };
  }

  // Returns the clinic if it's in the caller's scope, or 'not_found'/'out_of_scope'.
  // Callers need the clinic row itself (not just a boolean) to derive the
  // rule's client_org_id from the CLINIC's org, not the caller's -- an
  // admin (client_org_id: null) creating a rule for a specific tenant's
  // clinic must not stamp that rule client_org_id: null, or it becomes
  // invisible to that tenant's own manager (see create()/update()).
  private async findScopedClinic(clinicId: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.is_deleted) return null;
    if (user.client_org_id && clinic.client_org_id !== user.client_org_id) return null;
    return clinic;
  }

  // REQ177 (Hard Rule 6) -- a rule scoped to a specific service must be
  // validated against the caller's own org, same shape as findScopedClinic.
  // A Products row can be an org-level master (client_org_id set,
  // clinic_id null) or clinic-specific -- either way, client_org_id is
  // what determines whether this caller may reference it.
  private async findScopedProduct(productId: string, user: JwtPayload) {
    const product = await this.prisma.products.findUnique({ where: { id: productId } });
    if (!product || product.is_deleted) return null;
    if (user.client_org_id && product.client_org_id !== user.client_org_id) return null;
    return product;
  }

  // Every row carries its own client_org_id directly (set at create time from
  // the caller's JWT, null for a platform-wide admin/super_admin caller) so a
  // "global" rule (no clinic_id, no product_id) still has a tenant anchor --
  // without this, a manager's "applies to all clinics" rule would otherwise
  // leak to every other org's admin panel too (Hard Rule 6).
  async list(user: JwtPayload) {
    const rows = await this.prisma.productCancellationRules.findMany({
      where: {
        is_deleted: false,
        // BUG006 — was the F-01 ternary; `{}` for an org-less caller exposed
        // every tenant's cancellation policy.
        ...orgScope(user),
      },
      include: { clinic: true, product: true },
      orderBy: [{ priority: 'asc' }, { created_at: 'desc' }],
    });
    return rows.map((r) => this.toGraphQL(r));
  }

  // Every mutation here returns {success, userErrors[, cancellationRule]}
  // rather than throwing -- matches the shape admin/Policies.jsx's own
  // already-written gql expects (and the convention blocks.service.ts /
  // other {success,userErrors}-family domains already established), not
  // a raw GraphQL error response the frontend isn't set up to read.
  async create(input: CreateCancellationRuleInput, user: JwtPayload) {
    let clientOrgId = user.client_org_id;
    if (input.clinic_id) {
      const clinic = await this.findScopedClinic(input.clinic_id, user);
      if (!clinic) return { success: false, userErrors: [{ message: 'Clinic not found' }] };
      clientOrgId = clinic.client_org_id;
    }
    if (input.product_id) {
      const product = await this.findScopedProduct(input.product_id, user);
      if (!product) return { success: false, userErrors: [{ message: 'Service not found' }] };
      // Only overrides the clinic-derived org anchor when no clinic was
      // given -- a rule scoped to both a clinic AND a service is anchored
      // by the clinic (the more common real case: "this specific branch's
      // rule for this specific service").
      if (!input.clinic_id) clientOrgId = product.client_org_id;
    }
    try {
      const row = await this.prisma.productCancellationRules.create({
        data: {
          name: input.name,
          description: input.description,
          hours_before_appointment: input.hours_before,
          fee_type: input.fee_type as any,
          fee_amount: input.fee_amount,
          clinic_id: input.clinic_id || null,
          product_id: input.product_id || null,
          client_org_id: clientOrgId,
          priority: input.priority ?? 1,
          is_active: input.is_active ?? true,
          rule_type: (input.rule_type ?? 'cancellation') as any,
        },
        include: { clinic: true, product: true },
      });
      return { success: true, userErrors: [], cancellationRule: this.toGraphQL(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to create cancellation rule' }] };
    }
  }

  private async findOwned(id: string, user: JwtPayload) {
    const existing = await this.prisma.productCancellationRules.findUnique({
      where: { id },
      include: { clinic: true },
    });
    if (!existing || existing.is_deleted) return null;
    if (user.client_org_id && existing.client_org_id !== user.client_org_id) return null;
    return existing;
  }

  async update(id: string, input: UpdateCancellationRuleInput, user: JwtPayload) {
    const existing = await this.findOwned(id, user);
    if (!existing) return { success: false, userErrors: [{ message: 'Cancellation rule not found' }] };

    // client_org_id is only ever recomputed when clinic_id is actually part
    // of this update -- switching TO a clinic anchors the rule to that
    // clinic's org; switching to global ('') or leaving clinic_id untouched
    // (undefined) keeps the rule's existing org anchor as-is, so an
    // admin editing a manager's rule can't accidentally null out its
    // tenant ownership.
    let clientOrgId: string | null | undefined = undefined;
    if (input.clinic_id !== undefined) {
      if (input.clinic_id) {
        const clinic = await this.findScopedClinic(input.clinic_id, user);
        if (!clinic) return { success: false, userErrors: [{ message: 'Clinic not found' }] };
        clientOrgId = clinic.client_org_id;
      }
      // input.clinic_id === '' (going global): leave clientOrgId undefined
      // -> Prisma leaves the column untouched, preserving the rule's
      // existing tenant anchor from before it went global.
    }
    if (input.product_id !== undefined && input.product_id) {
      const product = await this.findScopedProduct(input.product_id, user);
      if (!product) return { success: false, userErrors: [{ message: 'Service not found' }] };
      if (clientOrgId === undefined && input.clinic_id === undefined) clientOrgId = product.client_org_id;
    }

    try {
      const row = await this.prisma.productCancellationRules.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          hours_before_appointment: input.hours_before,
          fee_type: input.fee_type as any,
          fee_amount: input.fee_amount,
          // an explicit '' from the "Global" option must clear clinic_id;
          // undefined (field omitted) must leave it untouched -- Prisma
          // treats `undefined` as "don't update" and `null` as "clear it".
          clinic_id: input.clinic_id === undefined ? undefined : input.clinic_id || null,
          product_id: input.product_id === undefined ? undefined : input.product_id || null,
          client_org_id: clientOrgId,
          priority: input.priority,
          is_active: input.is_active,
          rule_type: input.rule_type as any,
        },
        include: { clinic: true, product: true },
      });
      return { success: true, userErrors: [], cancellationRule: this.toGraphQL(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to update cancellation rule' }] };
    }
  }

  // REQ176/REQ177 -- internal, used by AppointmentPaymentsService's refund
  // engine and AppointmentsService's reschedule-fee hook. Not exposed on
  // the resolver (it takes a raw client_org_id, not a caller's JwtPayload
  // -- the fee computation runs with the PAYMENT's own org, not necessarily
  // the current caller's, e.g. a platform operator processing a refund for
  // a specific tenant). Org-less (client_org_id: null) rules only ever
  // exist for a platform-operator-created global rule; scoped the same way
  // orgScope() would for a non-operator caller.
  async findActiveRulesForOrg(clientOrgId: string | null, ruleType: 'cancellation' | 'reschedule') {
    const rows = await this.prisma.productCancellationRules.findMany({
      where: { is_deleted: false, is_active: true, rule_type: ruleType, client_org_id: clientOrgId },
    });
    return rows.map((r) => ({
      hours_before_appointment: r.hours_before_appointment,
      fee_type: r.fee_type as 'fixed' | 'percentage',
      fee_amount: r.fee_amount,
      product_id: r.product_id,
      clinic_id: r.clinic_id,
      priority: r.priority,
    }));
  }

  async remove(id: string, user: JwtPayload) {
    const existing = await this.findOwned(id, user);
    if (!existing) return { success: false, userErrors: [{ message: 'Cancellation rule not found' }] };
    try {
      await this.prisma.productCancellationRules.update({ where: { id }, data: { is_deleted: true } });
      return { success: true, userErrors: [] };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to delete cancellation rule' }] };
    }
  }
}
