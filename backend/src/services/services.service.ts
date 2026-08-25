import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceInput } from './dto/service.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, orgIdForWrite, assertSameOrg } from '../common/scoping/tenant-scope';
import { DepartmentsService } from '../departments/departments.service';
import { recordPriceChangeIfNeeded } from '../common/pricing/record-price-change';

const RUPEES_TO_PAISE = (rupees?: number) => (rupees == null ? undefined : Math.round(rupees * 100));
const PAISE_TO_RUPEES = (paise?: number | null) => (paise == null ? undefined : paise / 100);

// REQ016 (US-CAT-04) — the JSON columns store paise-keyed maps (matching
// price's own unit); CategoryPricingInput/ChannelPricingInput expose rupees
// like every other money field's GraphQL surface.
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
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly departmentsService: DepartmentsService,
  ) {}

  private toGraphQL(product: any) {
    const { price, clinicianServices, category, category_pricing_json, channel_pricing_json, ...rest } = product;
    return {
      ...rest,
      price: PAISE_TO_RUPEES(price),
      category: category ?? undefined,
      // ServiceClinicianType.full_name is a computed GraphQL field, not a
      // Clinicians column (that model only has first_name/last_name) — passing
      // the raw Prisma row through left full_name unresolved (null on a
      // non-nullable field), crashing the whole query for any service with a
      // linked clinician. Found live (a unit-tested mock fixture masked this —
      // it asserted on the buggy passthrough shape rather than the real
      // GraphQL entity's field), not caught by the mocked service spec.
      clinicians: (clinicianServices ?? []).map((cs: any) => ({
        id: cs.clinician.id,
        full_name: `${cs.clinician.first_name} ${cs.clinician.last_name}`,
      })),
      // REQ016 (US-CAT-04).
      category_pricing: pricingJsonToGraphQL(category_pricing_json),
      channel_pricing: pricingJsonToGraphQL(channel_pricing_json),
    };
  }

  private include() {
    return {
      category: true,
      department: true,
      clinicianServices: { where: { is_deleted: false }, include: { clinician: true } },
    };
  }

  async findAll(clinicId: string | undefined, isActive: boolean | undefined, user: JwtPayload) {
    const products = await this.prisma.products.findMany({
      where: {
        is_deleted: false,
        ...(clinicId ? { clinic_id: clinicId } : {}),
        ...(isActive !== undefined ? { is_active: isActive } : {}),
        ...orgScope(user),
      },
      include: this.include(),
      orderBy: { order_by: 'asc' },
    });
    return products.map((p) => this.toGraphQL(p));
  }

  async findOne(id: string, user: JwtPayload) {
    const product = await this.prisma.products.findUnique({ where: { id }, include: this.include() });
    if (!product || product.is_deleted) {
      throw new NotFoundException('Service not found');
    }
    assertSameOrg(user, product.client_org_id, 'Service');
    return this.toGraphQL(product);
  }

  // Products.sku is @unique and non-nullable, but ServiceInput (the canonical,
  // simpler contract this increment builds) never collects one — auto-generate
  // a readable, collision-safe one rather than blocking the simpler form.
  private generateSku(name: string) {
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
    return `${slug || 'svc'}-${Date.now().toString(36)}`;
  }

  async create(input: ServiceInput, user: JwtPayload) {
    // REQ014 (US-ORG-03) — Hard Rule 6 applies to this cross-domain FK the
    // same way it applies to clinic_id elsewhere.
    if (input.department_id) {
      await this.departmentsService.assertDepartmentInScope(input.department_id, user);
    }
    const product = await this.prisma.products.create({
      data: {
        name: input.name,
        description: input.description ?? '',
        duration_minutes: input.duration_minutes,
        price: RUPEES_TO_PAISE(input.price),
        is_active: input.is_active ?? true,
        hsn: input.hsn,
        // REQ046 — a healthcare consultation service is GST-exempt by
        // default under current Indian tax treatment; explicit input wins.
        is_tax_exempt: input.is_tax_exempt ?? true,
        gst_rate: input.gst_rate,
        product_type: 'simple',
        sku: this.generateSku(input.name),
        department_id: input.department_id,
        category_pricing_json: pricingInputToJson(input.category_pricing as any),
        channel_pricing_json: pricingInputToJson(input.channel_pricing as any),
        // REQ018 (US-BOOK-03) — omitted on create leaves the schema default ("none").
        prepayment_policy: input.prepayment_policy,
        // BUG006 — `?? undefined` silently created an ORG-LESS service.
        client_org_id: orgIdForWrite(user, 'service'),
      },
      include: this.include(),
    });
    return this.toGraphQL(product);
  }

  async update(id: string, input: ServiceInput, user: JwtPayload) {
    // Raw row (not toGraphQL()'s rupees-converted shape) -- recordPriceChangeIfNeeded
    // needs the current price in paise, the same unit as input.price once converted.
    const existing = await this.prisma.products.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) throw new NotFoundException('Service not found');
    assertSameOrg(user, existing.client_org_id, 'Service'); // enforces tenant scoping before any write
    if (input.department_id) {
      await this.departmentsService.assertDepartmentInScope(input.department_id, user);
    }
    // REQ016 (US-CAT-05) — logs the change and returns what Products.price
    // should actually become: the new price now, or the unchanged current
    // price when effective_from defers it to the future.
    const resolvedPrice = await recordPriceChangeIfNeeded(this.prisma, {
      product_id: id,
      client_org_id: existing.client_org_id,
      old_price: existing.price,
      new_price: RUPEES_TO_PAISE(input.price),
      effective_from: input.effective_from,
      changed_by_user_id: user.sub,
    });
    const product = await this.prisma.products.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        duration_minutes: input.duration_minutes,
        price: resolvedPrice,
        is_active: input.is_active,
        hsn: input.hsn,
        is_tax_exempt: input.is_tax_exempt,
        gst_rate: input.gst_rate,
        department_id: input.department_id,
        category_pricing_json: pricingInputToJson(input.category_pricing as any),
        channel_pricing_json: pricingInputToJson(input.channel_pricing as any),
        prepayment_policy: input.prepayment_policy,
      },
      include: this.include(),
    });
    return this.toGraphQL(product);
  }
}
