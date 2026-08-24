import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SetProductBranchOverrideInput } from './dto/branch-override.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope } from '../common/scoping/tenant-scope';
import type { BranchPriceOverride } from '../common/pricing/resolve-price';

const RUPEES_TO_PAISE = (rupees?: number) => (rupees == null ? undefined : Math.round(rupees * 100));
const PAISE_TO_RUPEES = (paise?: number | null) => (paise == null ? undefined : paise / 100);

function pricingJsonToGraphQL(json: unknown): Record<string, number> | undefined {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return undefined;
  const entries = Object.entries(json as Record<string, number>).map(([k, v]) => [k, PAISE_TO_RUPEES(v)]);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function pricingInputToJson(input?: Record<string, number | undefined>): Record<string, number> | undefined {
  if (!input) return undefined;
  const entries = Object.entries(input)
    .filter(([, v]) => v != null)
    .map(([k, v]) => [k, RUPEES_TO_PAISE(v as number)]);
  return Object.fromEntries(entries);
}

@Injectable()
export class BranchOverridesService {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(row: any) {
    return {
      id: row.id,
      product_id: row.product_id,
      clinic_id: row.clinic_id,
      mode: row.mode,
      override_price: PAISE_TO_RUPEES(row.override_price),
      override_category_pricing: pricingJsonToGraphQL(row.override_category_pricing_json),
      override_channel_pricing: pricingJsonToGraphQL(row.override_channel_pricing_json),
      product: row.product ? { id: row.product.id, name: row.product.name, price: PAISE_TO_RUPEES(row.product.price) } : undefined,
    };
  }

  // Same "return the clinic row itself, or null" shape as
  // cancellation-rules.service.ts's own findScopedClinic — needed here to
  // derive the row's client_org_id from the CLINIC's org, not the caller's.
  private async findScopedClinic(clinicId: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.is_deleted) return null;
    if (user.client_org_id && clinic.client_org_id !== user.client_org_id) return null;
    return clinic;
  }

  // clinic_id is optional so the org-wide tenancy matrix (which cannot
  // supply a per-actor clinic argument, see cancellation-rules/packages'
  // own precedent) can still exercise this domain -- omitted, returns
  // every branch override across the caller's own org.
  async list(clinicId: string | undefined, user: JwtPayload) {
    if (!clinicId) {
      const rows = await this.prisma.productBranchOverrides.findMany({
        where: { ...orgScope(user) },
        include: { product: true },
        orderBy: { created_at: 'desc' },
      });
      return rows.map((r) => this.toGraphQL(r));
    }
    const clinic = await this.findScopedClinic(clinicId, user);
    if (!clinic) return [];
    const rows = await this.prisma.productBranchOverrides.findMany({
      where: { clinic_id: clinicId },
      include: { product: true },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => this.toGraphQL(r));
  }

  async set(input: SetProductBranchOverrideInput, user: JwtPayload) {
    const clinic = await this.findScopedClinic(input.clinic_id, user);
    if (!clinic) return { success: false, userErrors: [{ message: 'Clinic not found' }] };

    const product = await this.prisma.products.findUnique({ where: { id: input.product_id } });
    if (!product || product.is_deleted) return { success: false, userErrors: [{ message: 'Service not found' }] };
    if (product.client_org_id !== clinic.client_org_id) {
      return { success: false, userErrors: [{ message: 'Service not found' }] };
    }
    // Only an org-level master (clinic_id: null) can have a branch stance —
    // a service already created directly at one clinic has nothing to
    // cascade from.
    if (product.clinic_id != null) {
      return { success: false, userErrors: [{ message: 'This service is not an org-level master and cannot be overridden per branch' }] };
    }

    if (input.mode === 'override' && input.override_price == null && !input.override_category_pricing && !input.override_channel_pricing) {
      return { success: false, userErrors: [{ message: 'An override requires at least a price, category, or channel value' }] };
    }

    try {
      const row = await this.prisma.productBranchOverrides.upsert({
        where: { product_id_clinic_id: { product_id: input.product_id, clinic_id: input.clinic_id } },
        create: {
          product_id: input.product_id,
          clinic_id: input.clinic_id,
          client_org_id: clinic.client_org_id,
          mode: input.mode,
          override_price: RUPEES_TO_PAISE(input.override_price),
          override_category_pricing_json: pricingInputToJson(input.override_category_pricing as any),
          override_channel_pricing_json: pricingInputToJson(input.override_channel_pricing as any),
        },
        update: {
          mode: input.mode,
          override_price: RUPEES_TO_PAISE(input.override_price),
          override_category_pricing_json: pricingInputToJson(input.override_category_pricing as any),
          override_channel_pricing_json: pricingInputToJson(input.override_channel_pricing as any),
        },
        include: { product: true },
      });
      return { success: true, userErrors: [], branchOverride: this.toGraphQL(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to set branch override' }] };
    }
  }

  // Used by appointment-payments.service.ts / appointments.service.ts at the
  // real pricing call sites -- returns the raw paise-unit row shape
  // resolveServicePrice() expects, or null when the branch has no stance
  // (today's existing "inherit" behaviour, unchanged).
  async getForPricing(productId: string | null | undefined, clinicId: string | null | undefined): Promise<BranchPriceOverride | null> {
    if (!productId || !clinicId) return null;
    const row = await this.prisma.productBranchOverrides.findUnique({
      where: { product_id_clinic_id: { product_id: productId, clinic_id: clinicId } },
    });
    if (!row) return null;
    return {
      mode: row.mode,
      override_price: row.override_price,
      override_category_pricing_json: row.override_category_pricing_json,
      override_channel_pricing_json: row.override_channel_pricing_json,
    };
  }
}
