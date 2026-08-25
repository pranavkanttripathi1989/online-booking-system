import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePackageInput, UpdatePackageInput, PurchasePackageInput } from './dto/package.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScopeVia } from '../common/scoping/tenant-scope';

const RUPEES_TO_PAISE = (rupees: number) => Math.round(rupees * 100);
const PAISE_TO_RUPEES = (paise: number) => paise / 100;

@Injectable()
export class PackagesService {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(row: any) {
    return {
      id: row.id,
      clinic_id: row.clinic_id,
      name: row.name,
      description: row.description ?? undefined,
      total_sittings: row.total_sittings,
      price: PAISE_TO_RUPEES(row.price_paise),
      validity_days: row.validity_days,
      is_active: row.is_active,
      items: (row.items ?? []).map((i: any) => ({ id: i.id, product_id: i.product_id })),
    };
  }

  private toPatientPackageGraphQL(row: any) {
    return {
      id: row.id,
      package_id: row.package_id,
      patient_id: row.patient_id,
      sittings_total: row.sittings_total,
      sittings_remaining: row.sittings_remaining,
      purchase_amount: PAISE_TO_RUPEES(row.purchase_amount_paise),
      purchase_tender_type: row.purchase_tender_type,
      purchase_reference: row.purchase_reference ?? undefined,
      purchased_at: row.purchased_at,
      expires_at: row.expires_at,
      is_expired: row.expires_at < new Date(),
      package: row.package ? this.toGraphQL(row.package) : undefined,
    };
  }

  private async findScopedClinic(clinicId: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.is_deleted) return null;
    if (user.client_org_id && clinic.client_org_id !== user.client_org_id) return null;
    return clinic;
  }

  private async findOwned(id: string, user: JwtPayload) {
    const existing = await this.prisma.packages.findUnique({ where: { id }, include: { clinic: true, items: true } });
    if (!existing || existing.is_deleted) return null;
    if (user.client_org_id && existing.clinic.client_org_id !== user.client_org_id) return null;
    return existing;
  }

  // clinic_id omitted -> every active package across every clinic in the
  // caller's own org (same no-args "my org's own rows" shape ChecklistService
  // /IntakeFieldsService already use — REQ051/REQ052 — needed so the
  // tenancy matrix can serve an org-A and org-B actor from one shared
  // query/variables pair). clinic_id given -> scoped to that one clinic.
  async list(clinicId: string | undefined, user: JwtPayload) {
    if (!clinicId) {
      const rows = await this.prisma.packages.findMany({
        where: { is_deleted: false, ...orgScopeVia(user, 'clinic') },
        include: { items: true },
        orderBy: { created_at: 'desc' },
      });
      return rows.map((r) => this.toGraphQL(r));
    }
    const clinic = await this.findScopedClinic(clinicId, user);
    if (!clinic) return [];
    const rows = await this.prisma.packages.findMany({
      where: { clinic_id: clinicId, is_deleted: false },
      include: { items: true },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => this.toGraphQL(r));
  }

  async create(input: CreatePackageInput, user: JwtPayload) {
    const clinic = await this.findScopedClinic(input.clinic_id, user);
    if (!clinic) return { success: false, userErrors: [{ message: 'Clinic not found' }] };
    // A legacy clinic predating org linkage (CLAUDE.md's own documented
    // "clinics created before the Organizations module existed have no
    // client_org_id yet") has no tenant to anchor a new Package to.
    if (!clinic.client_org_id) {
      return { success: false, userErrors: [{ message: 'This clinic has no organization to anchor the package to' }] };
    }

    // createProduct never accepts a clinic_id (products.resolver.ts) — every
    // real product is an org-level master (clinic_id: null), the same
    // convention REQ055's branch-overrides feature already established
    // (available at every branch unless overridden). A strict clinic_id
    // equality check rejected every real product a package could ever be
    // built from; a null clinic_id is valid too, gated on the SAME org
    // instead (clinic_id alone doesn't imply org — a master product has no
    // clinic to derive one from).
    const products = await this.prisma.products.findMany({ where: { id: { in: input.product_ids } } });
    const invalidProduct =
      products.length !== input.product_ids.length ||
      products.some((p) => (p.clinic_id === null ? p.client_org_id !== clinic.client_org_id : p.clinic_id !== input.clinic_id));
    if (invalidProduct) {
      return { success: false, userErrors: [{ message: 'One or more products do not belong to this clinic' }] };
    }

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const pkg = await tx.packages.create({
          data: {
            client_org_id: clinic.client_org_id as string,
            clinic_id: input.clinic_id,
            name: input.name,
            description: input.description,
            total_sittings: input.total_sittings,
            price_paise: RUPEES_TO_PAISE(input.price),
            validity_days: input.validity_days ?? 90,
          },
        });
        await tx.packageItems.createMany({
          data: input.product_ids.map((productId) => ({ package_id: pkg.id, product_id: productId })),
        });
        return tx.packages.findUnique({ where: { id: pkg.id }, include: { items: true } });
      });
      return { success: true, userErrors: [], pkg: this.toGraphQL(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to create package' }] };
    }
  }

  async update(id: string, input: UpdatePackageInput, user: JwtPayload) {
    const existing = await this.findOwned(id, user);
    if (!existing) return { success: false, userErrors: [{ message: 'Package not found' }] };
    try {
      const row = await this.prisma.packages.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          total_sittings: input.total_sittings,
          price_paise: input.price != null ? RUPEES_TO_PAISE(input.price) : undefined,
          validity_days: input.validity_days,
          is_active: input.is_active,
        },
        include: { items: true },
      });
      return { success: true, userErrors: [], pkg: this.toGraphQL(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to update package' }] };
    }
  }

  async remove(id: string, user: JwtPayload) {
    const existing = await this.findOwned(id, user);
    if (!existing) return { success: false, userErrors: [{ message: 'Package not found' }] };
    try {
      await this.prisma.packages.update({ where: { id }, data: { is_deleted: true } });
      return { success: true, userErrors: [] };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to delete package' }] };
    }
  }

  // US-CAT-01 — a single upfront tender, not REQ023's multi-tender split
  // (that machinery is for appointment billing specifically; a package
  // purchase is not appointment-scoped). sittings_total/purchase_amount_paise
  // denormalize from the package at purchase time (see the schema comment).
  async purchase(input: PurchasePackageInput, user: JwtPayload) {
    const pkg = await this.findOwned(input.package_id, user);
    if (!pkg) return { success: false, userErrors: [{ message: 'Package not found' }] };
    if (!pkg.is_active) return { success: false, userErrors: [{ message: 'This package is no longer active' }] };
    const patient = await this.prisma.patients.findUnique({ where: { id: input.patient_id } });
    if (!patient || patient.is_deleted) return { success: false, userErrors: [{ message: 'Patient not found' }] };

    const expiresAt = new Date(Date.now() + pkg.validity_days * 24 * 60 * 60 * 1000);
    try {
      const row = await this.prisma.patientPackages.create({
        data: {
          package_id: pkg.id,
          patient_id: input.patient_id,
          client_org_id: pkg.client_org_id,
          clinic_id: pkg.clinic_id,
          sittings_total: pkg.total_sittings,
          sittings_remaining: pkg.total_sittings,
          purchase_amount_paise: pkg.price_paise,
          purchase_tender_type: input.purchase_tender_type,
          purchase_reference: input.purchase_reference,
          expires_at: expiresAt,
        },
        include: { package: { include: { items: true } } },
      });
      return { success: true, userErrors: [], patientPackage: this.toPatientPackageGraphQL(row) };
    } catch (e: any) {
      return { success: false, userErrors: [{ message: e.message ?? 'Failed to record package purchase' }] };
    }
  }

  async patientPackages(patientId: string, user: JwtPayload) {
    const rows = await this.prisma.patientPackages.findMany({
      where: {
        patient_id: patientId,
        is_deleted: false,
        ...(user.client_org_id ? { client_org_id: user.client_org_id } : {}),
      },
      include: { package: { include: { items: true } } },
      orderBy: { purchased_at: 'desc' },
    });
    return rows.map((r) => this.toPatientPackageGraphQL(r));
  }
}
