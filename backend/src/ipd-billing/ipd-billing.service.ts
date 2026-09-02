import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { assertSameOrg, isSameOrg, orgScope } from '../common/scoping/tenant-scope';
import { nextDocumentNumber, DOCUMENT_SERIES } from '../common/billing/document-numbering';
import { resolveServicePrice } from '../common/pricing/resolve-price';
import { BranchOverridesService } from '../branch-overrides/branch-overrides.service';
import {
  CreateIpdPackageInput,
  UpdateIpdPackageInput,
  SelectIpdPackageInput,
  PostManualIpdChargeInput,
  ReverseIpdChargeInput,
  RecordIpdPaymentInput,
  UpdateIpdBillingSettingsInput,
} from './dto/ipd-billing.input';

const RUPEES_TO_PAISE = (rupees: number) => Math.round(rupees * 100);
const PAISE_TO_RUPEES = (paise: number) => paise / 100;

const DEFAULT_SETTINGS = {
  day_boundary_mode: 'calendar_day',
  discharge_cutoff_hour: 12,
  charge_admission_day: true,
  charge_discharge_day: false,
  minimum_billable_days: 1,
  transfer_day_rate_policy: 'higher_of',
  package_excess_policy: 'bill_extra',
  default_deposit_paise: 0,
  auto_post_room_charges: true,
  doctor_visit_charge_product_id: null as string | null,
};

// REQ179 (IPD slice 4) — the billing ledger. Every posting path funnels
// through postCharge(), which maintains bill.gross_paise inside the same
// transaction as the IpdCharges row — the one invariant
// (`gross_paise = SUM(charges.total_paise WHERE NOT is_reversed)`) that
// catches every ledger bug, asserted directly in this service's own unit
// tests after every mutation including reversal and package settlement.
@Injectable()
export class IpdBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchOverrides: BranchOverridesService,
  ) {}

  // ── Scope guards ─────────────────────────────────────────────────────
  private async assertAdmissionInScope(admissionId: string, user: JwtPayload) {
    const admission = await this.prisma.admissions.findUnique({ where: { id: admissionId }, include: { patient: true, clinic: true } });
    if (!admission || admission.is_deleted) throw new NotFoundException('Admission not found');
    assertSameOrg(user, admission.client_org_id, 'Admission');
    return admission;
  }

  private fullName(row: any): string {
    if (!row) return '';
    return [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || row.full_name || '';
  }

  // ── Settings ──────────────────────────────────────────────────────────
  async getSettings(clinicId: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.is_deleted) throw new BadRequestException('Clinic not found');
    if (!isSameOrg(user, clinic.client_org_id)) throw new BadRequestException('Clinic not found');
    const row = await this.prisma.ipdBillingSettings.findUnique({ where: { clinic_id: clinicId } });
    return this.settingsToGraphQL(row ?? DEFAULT_SETTINGS);
  }

  // Real settings row, or the documented defaults — never null. Used both
  // by the resolver's own read and by RoomDayAccrualService's own internal
  // lookup, so the two never drift on what "not configured yet" means.
  async getSettingsRowOrDefault(clinicId: string) {
    return (await this.prisma.ipdBillingSettings.findUnique({ where: { clinic_id: clinicId } })) ?? DEFAULT_SETTINGS;
  }

  private settingsToGraphQL(s: any) {
    return {
      day_boundary_mode: s.day_boundary_mode,
      discharge_cutoff_hour: s.discharge_cutoff_hour,
      charge_admission_day: s.charge_admission_day,
      charge_discharge_day: s.charge_discharge_day,
      transfer_day_rate_policy: s.transfer_day_rate_policy,
      package_excess_policy: s.package_excess_policy,
      default_deposit: PAISE_TO_RUPEES(s.default_deposit_paise),
      auto_post_room_charges: s.auto_post_room_charges,
      doctor_visit_charge_product_id: s.doctor_visit_charge_product_id ?? undefined,
    };
  }

  async updateSettings(clinicId: string, input: UpdateIpdBillingSettingsInput, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.is_deleted) throw new BadRequestException('Clinic not found');
    if (!isSameOrg(user, clinic.client_org_id)) throw new BadRequestException('Clinic not found');
    if (input.doctor_visit_charge_product_id) {
      const product = await this.prisma.products.findUnique({ where: { id: input.doctor_visit_charge_product_id } });
      if (!product || product.is_deleted) throw new BadRequestException('Charge item not found');
    }
    const row = await this.prisma.ipdBillingSettings.upsert({
      where: { clinic_id: clinicId },
      create: {
        client_org_id: clinic.client_org_id as string,
        clinic_id: clinicId,
        ...(input.day_boundary_mode ? { day_boundary_mode: input.day_boundary_mode } : {}),
        ...(input.discharge_cutoff_hour !== undefined ? { discharge_cutoff_hour: input.discharge_cutoff_hour } : {}),
        ...(input.charge_admission_day !== undefined ? { charge_admission_day: input.charge_admission_day } : {}),
        ...(input.charge_discharge_day !== undefined ? { charge_discharge_day: input.charge_discharge_day } : {}),
        ...(input.transfer_day_rate_policy ? { transfer_day_rate_policy: input.transfer_day_rate_policy } : {}),
        ...(input.package_excess_policy ? { package_excess_policy: input.package_excess_policy } : {}),
        ...(input.default_deposit !== undefined ? { default_deposit_paise: RUPEES_TO_PAISE(input.default_deposit) } : {}),
        ...(input.auto_post_room_charges !== undefined ? { auto_post_room_charges: input.auto_post_room_charges } : {}),
        doctor_visit_charge_product_id: input.doctor_visit_charge_product_id ?? null,
      },
      update: {
        ...(input.day_boundary_mode ? { day_boundary_mode: input.day_boundary_mode } : {}),
        ...(input.discharge_cutoff_hour !== undefined ? { discharge_cutoff_hour: input.discharge_cutoff_hour } : {}),
        ...(input.charge_admission_day !== undefined ? { charge_admission_day: input.charge_admission_day } : {}),
        ...(input.charge_discharge_day !== undefined ? { charge_discharge_day: input.charge_discharge_day } : {}),
        ...(input.transfer_day_rate_policy ? { transfer_day_rate_policy: input.transfer_day_rate_policy } : {}),
        ...(input.package_excess_policy ? { package_excess_policy: input.package_excess_policy } : {}),
        ...(input.default_deposit !== undefined ? { default_deposit_paise: RUPEES_TO_PAISE(input.default_deposit) } : {}),
        ...(input.auto_post_room_charges !== undefined ? { auto_post_room_charges: input.auto_post_room_charges } : {}),
        ...(input.doctor_visit_charge_product_id !== undefined ? { doctor_visit_charge_product_id: input.doctor_visit_charge_product_id } : {}),
      },
    });
    return this.settingsToGraphQL(row);
  }

  // ── Pricing ───────────────────────────────────────────────────────────
  //
  // REQ179's own stated payoff for making bed/nursing/OT/doctor-visit
  // tariffs real Products rows: a PayerTariffs row against the product
  // changes the resulting charge with zero new pricing code here — this is
  // the first real call site in the codebase that wires resolveServicePrice
  // to a payer tariff for anything other than REQ100's own read-only
  // estimate (insurance.service.ts's own comment: "billing itself is not
  // wired to this yet").
  async priceProductForAdmission(productId: string, admission: any): Promise<number | null> {
    const product = await this.prisma.products.findUnique({ where: { id: productId } });
    if (!product || product.is_deleted) return null;
    const branchOverride = await this.branchOverrides.getForPricing(productId, admission.clinic_id);
    let tariffPaise: number | undefined;
    if (admission.payer_id) {
      const tariff = await this.prisma.payerTariffs.findUnique({
        where: { payer_id_product_id: { payer_id: admission.payer_id, product_id: productId } },
      });
      tariffPaise = tariff?.tariff_price ?? undefined;
    }
    return resolveServicePrice(product, admission.patient, undefined, branchOverride, tariffPaise);
  }

  // ── Bill lifecycle ────────────────────────────────────────────────────
  async findOrCreateBillForAdmission(admission: { id: string; client_org_id: string; clinic_id: string }, tx: any) {
    const existing = await tx.ipdBills.findUnique({ where: { admission_id: admission.id } });
    if (existing) return existing;
    return tx.ipdBills.create({
      data: { client_org_id: admission.client_org_id, clinic_id: admission.clinic_id, admission_id: admission.id },
    });
  }

  // ── The one funnel every charge-posting path goes through ──────────────
  async postCharge(
    params: {
      admissionId: string;
      chargeType: string;
      description: string;
      serviceDate: Date;
      productId?: string | null;
      quantity?: number;
      unitPricePaise: number;
      gstRate?: number | null;
      bedOccupancyId?: string | null;
      sourceReferenceType?: string | null;
      sourceReferenceId?: string | null;
      postedByUserId?: string | null;
    },
    tx?: any,
  ) {
    const run = async (client: any) => {
      const admission = await client.admissions.findUnique({ where: { id: params.admissionId } });
      if (!admission) throw new NotFoundException('Admission not found');
      const bill = await this.findOrCreateBillForAdmission(admission, client);
      const quantity = params.quantity ?? 1;
      const totalPaise = quantity * params.unitPricePaise;
      const gstAmountPaise = params.gstRate ? Math.round((totalPaise * params.gstRate) / 100) : null;

      const charge = await client.ipdCharges.create({
        data: {
          client_org_id: admission.client_org_id,
          clinic_id: admission.clinic_id,
          admission_id: admission.id,
          bill_id: bill.id,
          charge_type: params.chargeType,
          description: params.description,
          service_date: params.serviceDate,
          product_id: params.productId ?? null,
          quantity,
          unit_price_paise: params.unitPricePaise,
          total_paise: totalPaise,
          gst_rate: params.gstRate ?? null,
          gst_amount_paise: gstAmountPaise,
          bed_occupancy_id: params.bedOccupancyId ?? null,
          source_reference_type: params.sourceReferenceType ?? null,
          source_reference_id: params.sourceReferenceId ?? null,
          posted_by_user_id: params.postedByUserId ?? null,
        },
      });
      await client.ipdBills.update({ where: { id: bill.id }, data: { gross_paise: { increment: totalPaise } } });
      return charge;
    };
    return tx ? run(tx) : this.prisma.$transaction((innerTx) => run(innerTx));
  }

  // ── Manual charge (front-desk, ad-hoc) ──────────────────────────────────
  async postManualCharge(input: PostManualIpdChargeInput, user: JwtPayload) {
    const admission = await this.assertAdmissionInScope(input.admission_id, user);
    let unitPricePaise: number;
    let productId: string | null = null;
    if (input.product_id) {
      const product = await this.prisma.products.findUnique({ where: { id: input.product_id } });
      if (!product || product.is_deleted) throw new BadRequestException('Charge item not found');
      if (!isSameOrg(user, product.client_org_id ?? admission.client_org_id)) throw new BadRequestException('Charge item not found');
      const priced = await this.priceProductForAdmission(input.product_id, admission);
      if (priced == null) throw new BadRequestException('This item has no price configured for this patient');
      unitPricePaise = priced;
      productId = input.product_id;
    } else {
      if (input.unit_price == null) throw new BadRequestException('Provide either a charge item or a unit price');
      unitPricePaise = RUPEES_TO_PAISE(input.unit_price);
    }
    const charge = await this.postCharge({
      admissionId: admission.id,
      chargeType: 'manual',
      description: input.description,
      serviceDate: input.service_date ?? new Date(),
      productId,
      quantity: input.quantity ?? 1,
      unitPricePaise,
      postedByUserId: user.sub,
    });
    return this.chargeToGraphQL(charge);
  }

  async reverseCharge(input: ReverseIpdChargeInput, user: JwtPayload) {
    const original = await this.prisma.ipdCharges.findUnique({ where: { id: input.charge_id } });
    if (!original) throw new NotFoundException('Charge not found');
    assertSameOrg(user, original.client_org_id, 'Charge');
    if (original.is_reversed) throw new BadRequestException('This charge has already been reversed');

    return this.prisma.$transaction(async (tx) => {
      await tx.ipdCharges.update({ where: { id: original.id }, data: { is_reversed: true } });
      const reversal = await tx.ipdCharges.create({
        data: {
          client_org_id: original.client_org_id,
          clinic_id: original.clinic_id,
          admission_id: original.admission_id,
          bill_id: original.bill_id,
          charge_type: original.charge_type,
          description: `Reversal: ${input.reason}`,
          service_date: new Date(),
          product_id: original.product_id,
          quantity: original.quantity,
          unit_price_paise: original.unit_price_paise,
          total_paise: -original.total_paise,
          source_reference_type: 'charge_reversal',
          source_reference_id: original.id,
          posted_by_user_id: user.sub,
        },
      });
      await tx.ipdBills.update({ where: { id: original.bill_id }, data: { gross_paise: { increment: reversal.total_paise } } });
      return this.chargeToGraphQL(reversal);
    });
  }

  // ── Payments ──────────────────────────────────────────────────────────
  async recordPayment(input: RecordIpdPaymentInput, user: JwtPayload) {
    const admission = await this.assertAdmissionInScope(input.admission_id, user);
    const tendersPaise = input.tenders.map((t) => ({ tender_type: t.tender_type, amountPaise: RUPEES_TO_PAISE(t.amount), reference: t.reference ?? null }));
    const sumPaise = tendersPaise.reduce((sum, t) => sum + t.amountPaise, 0);
    const amountPaise = input.payment_type === 'refund' ? -sumPaise : sumPaise;

    return this.prisma.$transaction(async (tx) => {
      const bill = await this.findOrCreateBillForAdmission(admission, tx);
      const receiptNumber = await nextDocumentNumber(tx as any, admission.clinic_id, DOCUMENT_SERIES.IPD_RECEIPT, 'IPDR');
      const payment = await tx.ipdPayments.create({
        data: {
          client_org_id: admission.client_org_id,
          clinic_id: admission.clinic_id,
          admission_id: admission.id,
          bill_id: bill.id,
          payment_type: input.payment_type,
          amount_paise: amountPaise,
          tenders_json: tendersPaise as any,
          receipt_number: receiptNumber,
          notes: input.notes ?? null,
          recorded_by_user_id: user.sub,
        },
      });
      await tx.ipdBills.update({ where: { id: bill.id }, data: { paid_paise: { increment: amountPaise } } });
      return this.paymentToGraphQL(payment);
    });
  }

  // ── Package selection & finalization ────────────────────────────────
  async selectPackage(input: SelectIpdPackageInput, user: JwtPayload) {
    const admission = await this.assertAdmissionInScope(input.admission_id, user);
    const pkg = await this.prisma.ipdPackages.findUnique({ where: { id: input.package_id } });
    if (!pkg || pkg.is_deleted || !pkg.is_active) throw new BadRequestException('Package not found');
    if (!isSameOrg(user, pkg.client_org_id)) throw new BadRequestException('Package not found');
    if (pkg.clinic_id !== admission.clinic_id) throw new BadRequestException('This package is not offered at this clinic');

    return this.prisma.$transaction(async (tx) => {
      const bill = await this.findOrCreateBillForAdmission(admission, tx);
      if (bill.status === 'finalized') throw new BadRequestException('Cannot change the package on a finalized bill');
      const updated = await tx.ipdBills.update({ where: { id: bill.id }, data: { package_id: pkg.id } });
      return this.billToGraphQL(await this.fullBillRow(updated.id, tx));
    });
  }

  async finalizeBill(billId: string, user: JwtPayload) {
    const bill = await this.prisma.ipdBills.findUnique({ where: { id: billId } });
    if (!bill) throw new NotFoundException('Bill not found');
    assertSameOrg(user, bill.client_org_id, 'Bill');
    if (bill.status === 'finalized') throw new BadRequestException('This bill has already been finalized');

    return this.prisma.$transaction(async (tx) => {
      if (bill.package_id) {
        await this.settlePackage(tx, bill.id, bill.package_id, user.sub);
      }
      const gross = await this.recomputeGross(tx, bill.id);
      const billNumber = await nextDocumentNumber(tx as any, bill.clinic_id, DOCUMENT_SERIES.IPD_BILL, 'IPD');
      const updated = await tx.ipdBills.update({
        where: { id: bill.id },
        data: { status: 'finalized', bill_number: billNumber, gross_paise: gross, finalized_at: new Date(), finalized_by_user_id: user.sub },
      });
      return this.billToGraphQL(await this.fullBillRow(updated.id, tx));
    });
  }

  async unfinalizeBill(billId: string, user: JwtPayload) {
    const bill = await this.prisma.ipdBills.findUnique({ where: { id: billId } });
    if (!bill) throw new NotFoundException('Bill not found');
    assertSameOrg(user, bill.client_org_id, 'Bill');
    if (bill.status !== 'finalized') throw new BadRequestException('This bill is not finalized');

    return this.prisma.$transaction(async (tx) => {
      const adjustment = await tx.ipdCharges.findFirst({
        where: { bill_id: bill.id, charge_type: 'package_adjustment', is_reversed: false },
        orderBy: { created_at: 'desc' },
      });
      if (adjustment) {
        await tx.ipdCharges.update({ where: { id: adjustment.id }, data: { is_reversed: true } });
        await tx.ipdCharges.updateMany({ where: { bill_id: bill.id, is_package_inclusive: true }, data: { is_package_inclusive: false } });
      }
      const gross = await this.recomputeGross(tx, bill.id);
      const updated = await tx.ipdBills.update({
        where: { id: bill.id },
        data: { status: 'open', gross_paise: gross, finalized_at: null, finalized_by_user_id: null },
      });
      return this.billToGraphQL(await this.fullBillRow(updated.id, tx));
    });
  }

  // Marks package-inclusive charges and posts the one signed adjustment
  // line that makes the net total equal the package price for covered
  // items — never a mode switch on the bill itself (REQ179's own stated
  // design). package_excess_policy='absorb' folds every remaining charge
  // in too, matching the settings field's own documented meaning.
  private async settlePackage(tx: any, billId: string, packageId: string, userId: string) {
    const pkg = await tx.ipdPackages.findUnique({ where: { id: packageId }, include: { inclusions: true } });
    const bill = await tx.ipdBills.findUnique({ where: { id: billId } });
    const settings = await tx.ipdBillingSettings.findUnique({ where: { clinic_id: bill.clinic_id } });
    const excessPolicy = settings?.package_excess_policy ?? DEFAULT_SETTINGS.package_excess_policy;

    const charges = await tx.ipdCharges.findMany({
      where: { bill_id: billId, is_reversed: false, is_package_inclusive: false, charge_type: { not: 'package_adjustment' } },
    });

    const inclusionByProduct = new Map<string, { max_quantity: number | null }>();
    for (const inc of pkg.inclusions) inclusionByProduct.set(inc.product_id, { max_quantity: inc.max_quantity });

    const usedQtyByProduct = new Map<string, number>();
    const inclusiveIds: string[] = [];
    let covered = 0;
    for (const charge of charges) {
      const rule = charge.product_id ? inclusionByProduct.get(charge.product_id) : undefined;
      const matches = excessPolicy === 'absorb' || !!rule;
      if (!matches) continue;
      if (rule?.max_quantity != null) {
        const used = usedQtyByProduct.get(charge.product_id!) ?? 0;
        if (used >= rule.max_quantity) continue;
        usedQtyByProduct.set(charge.product_id!, used + charge.quantity);
      }
      inclusiveIds.push(charge.id);
      covered += charge.total_paise;
    }

    if (inclusiveIds.length > 0) {
      await tx.ipdCharges.updateMany({ where: { id: { in: inclusiveIds } }, data: { is_package_inclusive: true } });
    }

    const adjustmentPaise = pkg.price_paise - covered;
    if (adjustmentPaise !== 0) {
      const adjustment = await tx.ipdCharges.create({
        data: {
          client_org_id: bill.client_org_id,
          clinic_id: bill.clinic_id,
          admission_id: bill.admission_id,
          bill_id: bill.id,
          charge_type: 'package_adjustment',
          description: `Package settlement — ${pkg.name}`,
          service_date: new Date(),
          total_paise: adjustmentPaise,
          unit_price_paise: adjustmentPaise,
          quantity: 1,
          source_reference_type: 'ipd_package',
          source_reference_id: pkg.id,
          posted_by_user_id: userId,
        },
      });
      await tx.ipdBills.update({ where: { id: bill.id }, data: { gross_paise: { increment: adjustment.total_paise } } });
    }
  }

  // Defensive re-derivation from the real ledger rather than trusting the
  // maintained running total at the one moment (finalize/unfinalize) it
  // matters most — cheap, and it is the assertion this whole domain exists
  // to protect.
  //
  // Deliberately sums EVERY charge, reversed ones included: is_reversed is
  // a display/status flag only, never a sum filter. A reversed charge's own
  // signed amount (e.g. +25000) stays in the sum, and its reversal row's
  // negative amount (-25000) nets it to zero — that cancellation, not an
  // exclusion, is what "reversal rows, never deletions" (this domain's own
  // stated design) means arithmetically. Filtering reversed rows out here
  // was a real bug caught live by ipd-billing.int-spec.ts's own invariant
  // assertion: it made this recomputation double-count every reversal
  // (once by dropping the original, again by keeping the reversal row),
  // diverging from postCharge()/reverseCharge()'s own maintained-total math,
  // which never excluded anything.
  private async recomputeGross(tx: any, billId: string): Promise<number> {
    const agg = await tx.ipdCharges.aggregate({ where: { bill_id: billId }, _sum: { total_paise: true } });
    return agg._sum.total_paise ?? 0;
  }

  // ── Reads ─────────────────────────────────────────────────────────────
  private readonly BILL_INCLUDE = {
    admission: { include: { patient: true } },
    package: true,
    finalized_by: true,
    charges: { include: { posted_by: true }, orderBy: { service_date: 'desc' as const } },
    payments: { include: { recorded_by: true }, orderBy: { created_at: 'desc' as const } },
  };

  private async fullBillRow(billId: string, client: any = this.prisma) {
    return client.ipdBills.findUnique({ where: { id: billId }, include: this.BILL_INCLUDE });
  }

  private chargeToGraphQL(c: any) {
    return {
      id: c.id,
      charge_type: c.charge_type,
      description: c.description,
      service_date: c.service_date,
      product_id: c.product_id ?? undefined,
      quantity: c.quantity,
      unit_price: PAISE_TO_RUPEES(c.unit_price_paise),
      total: PAISE_TO_RUPEES(c.total_paise),
      gst_rate: c.gst_rate ?? undefined,
      gst_amount: c.gst_amount_paise != null ? PAISE_TO_RUPEES(c.gst_amount_paise) : undefined,
      is_reversed: c.is_reversed,
      is_package_inclusive: c.is_package_inclusive,
      posted_by_name: c.posted_by ? this.fullName(c.posted_by) : undefined,
      created_at: c.created_at,
    };
  }

  private paymentToGraphQL(p: any) {
    return {
      id: p.id,
      payment_type: p.payment_type,
      amount: PAISE_TO_RUPEES(p.amount_paise),
      tenders: ((p.tenders_json as any[]) ?? []).map((t) => ({ tender_type: t.tender_type, amount: PAISE_TO_RUPEES(t.amountPaise), reference: t.reference ?? undefined })),
      receipt_number: p.receipt_number,
      notes: p.notes ?? undefined,
      recorded_by_name: p.recorded_by ? this.fullName(p.recorded_by) : undefined,
      created_at: p.created_at,
    };
  }

  private billToGraphQL(b: any) {
    return {
      id: b.id,
      admission_id: b.admission_id,
      admission_number: b.admission?.admission_number ?? undefined,
      patient_name: b.admission?.patient ? this.fullName(b.admission.patient) : undefined,
      bill_number: b.bill_number ?? undefined,
      status: b.status,
      package_id: b.package_id ?? undefined,
      package_name: b.package?.name ?? undefined,
      gross: PAISE_TO_RUPEES(b.gross_paise),
      paid: PAISE_TO_RUPEES(b.paid_paise),
      balance: PAISE_TO_RUPEES(b.gross_paise - b.paid_paise),
      finalized_at: b.finalized_at ?? undefined,
      finalized_by_name: b.finalized_by ? this.fullName(b.finalized_by) : undefined,
      charges: (b.charges ?? []).map((c: any) => this.chargeToGraphQL(c)),
      payments: (b.payments ?? []).map((p: any) => this.paymentToGraphQL(p)),
      created_at: b.created_at,
    };
  }

  async findBillForAdmission(admissionId: string, user: JwtPayload) {
    const admission = await this.assertAdmissionInScope(admissionId, user);
    const existing = await this.prisma.ipdBills.findUnique({ where: { admission_id: admissionId } });
    const bill = existing ?? (await this.prisma.$transaction((tx) => this.findOrCreateBillForAdmission(admission, tx)));
    return this.billToGraphQL(await this.fullBillRow(bill.id));
  }

  async findOne(billId: string, user: JwtPayload) {
    const bill = await this.prisma.ipdBills.findUnique({ where: { id: billId } });
    if (!bill || !isSameOrg(user, bill.client_org_id)) throw new NotFoundException('Bill not found');
    return this.billToGraphQL(await this.fullBillRow(billId));
  }

  async findAll(clinicId: string | undefined, status: string | undefined, user: JwtPayload) {
    const bills = await this.prisma.ipdBills.findMany({
      where: { ...(clinicId ? { clinic_id: clinicId } : {}), ...(status ? { status } : {}), ...orgScope(user) },
      include: this.BILL_INCLUDE,
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    return bills.map((b) => this.billToGraphQL(b));
  }

  // ── Packages ──────────────────────────────────────────────────────────
  private async assertProductsInScope(productIds: string[], user: JwtPayload) {
    const products = await this.prisma.products.findMany({ where: { id: { in: productIds } } });
    if (products.length !== productIds.length) throw new BadRequestException('One or more charge items were not found');
    for (const p of products) {
      if (!isSameOrg(user, p.client_org_id)) throw new BadRequestException('One or more charge items were not found');
    }
  }

  private packageToGraphQL(p: any) {
    return {
      id: p.id,
      clinic_id: p.clinic_id,
      name: p.name,
      specialty: p.specialty ?? undefined,
      price: PAISE_TO_RUPEES(p.price_paise),
      is_active: p.is_active,
      inclusions: (p.inclusions ?? []).map((i: any) => ({ id: i.id, product_id: i.product_id, product_name: i.product?.name, max_quantity: i.max_quantity ?? undefined })),
    };
  }

  private readonly PACKAGE_INCLUDE = { inclusions: { include: { product: true } } };

  async findAllPackages(clinicId: string | undefined, user: JwtPayload) {
    const packages = await this.prisma.ipdPackages.findMany({
      where: { is_deleted: false, ...(clinicId ? { clinic_id: clinicId } : {}), ...orgScope(user) },
      include: this.PACKAGE_INCLUDE,
      orderBy: { name: 'asc' },
    });
    return packages.map((p) => this.packageToGraphQL(p));
  }

  async createPackage(input: CreateIpdPackageInput, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: input.clinic_id } });
    if (!clinic || clinic.is_deleted) throw new BadRequestException('Clinic not found');
    if (!isSameOrg(user, clinic.client_org_id)) throw new BadRequestException('Clinic not found');
    await this.assertProductsInScope(input.inclusions.map((i) => i.product_id), user);

    const pkg = await this.prisma.ipdPackages.create({
      data: {
        client_org_id: clinic.client_org_id as string,
        clinic_id: clinic.id,
        name: input.name,
        specialty: input.specialty,
        price_paise: RUPEES_TO_PAISE(input.price),
        inclusions: { create: input.inclusions.map((i) => ({ product_id: i.product_id, max_quantity: i.max_quantity ?? null })) },
      },
      include: this.PACKAGE_INCLUDE,
    });
    return this.packageToGraphQL(pkg);
  }

  async updatePackage(id: string, input: UpdateIpdPackageInput, user: JwtPayload) {
    const existing = await this.prisma.ipdPackages.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) throw new NotFoundException('Package not found');
    assertSameOrg(user, existing.client_org_id, 'Package');
    if (input.inclusions) await this.assertProductsInScope(input.inclusions.map((i) => i.product_id), user);

    const pkg = await this.prisma.$transaction(async (tx) => {
      if (input.inclusions) {
        await tx.ipdPackageInclusions.deleteMany({ where: { package_id: id } });
        await tx.ipdPackageInclusions.createMany({
          data: input.inclusions.map((i) => ({ package_id: id, product_id: i.product_id, max_quantity: i.max_quantity ?? null })),
        });
      }
      return tx.ipdPackages.update({
        where: { id },
        data: {
          name: input.name ?? existing.name,
          specialty: input.specialty !== undefined ? input.specialty : existing.specialty,
          price_paise: input.price !== undefined ? RUPEES_TO_PAISE(input.price) : existing.price_paise,
          is_active: input.is_active ?? existing.is_active,
        },
        include: this.PACKAGE_INCLUDE,
      });
    });
    return this.packageToGraphQL(pkg);
  }

  async removePackage(id: string, user: JwtPayload) {
    const existing = await this.prisma.ipdPackages.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) return { success: false, userErrors: [{ message: 'Package not found' }] };
    if (!isSameOrg(user, existing.client_org_id)) return { success: false, userErrors: [{ message: 'Package not found' }] };
    const inUse = await this.prisma.ipdBills.findFirst({ where: { package_id: id, status: 'open' } });
    if (inUse) {
      return { success: false, userErrors: [{ message: 'This package is selected on an open bill. Remove it there first.' }] };
    }
    await this.prisma.ipdPackages.update({ where: { id }, data: { is_deleted: true, is_active: false } });
    return { success: true, userErrors: [] };
  }
}
