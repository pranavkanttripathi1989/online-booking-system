import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReceiveStockInput, AdjustStockInput, DispensePrescriptionItemInput } from './dto/pharmacy.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, isSameOrg } from '../common/scoping/tenant-scope';

const RUPEES_TO_PAISE = (rupees?: number) => (rupees == null ? undefined : Math.round(rupees * 100));
const PAISE_TO_RUPEES = (paise?: number | null) => (paise == null ? undefined : paise / 100);

// REQ022 (pharmacy P0) — per-clinic batch/stock ledger. StockMovements is
// append-only (the requirement doc's own explicit non-functional note) —
// DrugBatches.quantity_remaining is a maintained running total, never the
// only record of what happened. No PurchaseOrder/GoodsReceiptNote/
// StockTransfer/FEFO-suggestion — all correctly deferred (the requirement
// doc's own P1 scope), this slice is receive → dispense → adjust only.
@Injectable()
export class PharmacyService {
  constructor(private readonly prisma: PrismaService) {}

  private batchToGraphQL(batch: any) {
    const { mrp_paise, client_org_id, ...rest } = batch;
    return { ...rest, mrp: PAISE_TO_RUPEES(mrp_paise) };
  }

  async findBatches(clinicId: string | undefined, drugId: string | undefined, user: JwtPayload) {
    const batches = await this.prisma.drugBatches.findMany({
      where: {
        ...(clinicId ? { clinic_id: clinicId } : {}),
        ...(drugId ? { drug_id: drugId } : {}),
        ...orgScope(user),
      },
      orderBy: { expiry_date: 'asc' },
    });
    return batches.map((b) => this.batchToGraphQL(b));
  }

  async findMovements(batchId: string, user: JwtPayload) {
    const batch = await this.prisma.drugBatches.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundException('Batch not found');
    if (!isSameOrg(user, batch.client_org_id)) throw new NotFoundException('Batch not found');
    return this.prisma.stockMovements.findMany({ where: { batch_id: batchId }, orderBy: { created_at: 'desc' } });
  }

  // Hard Rule 6 — clinic_id is caller-supplied, must be validated against
  // the caller's own org before any write, same pattern as
  // departments.service.ts's assertClinicInScope.
  private async assertClinicInScope(clinicId: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.is_deleted) throw new BadRequestException('Clinic not found');
    if (!isSameOrg(user, clinic.client_org_id)) throw new BadRequestException('Clinic not found');
    return clinic;
  }

  async receiveStock(input: ReceiveStockInput, user: JwtPayload) {
    const clinic = await this.assertClinicInScope(input.clinic_id, user);
    const drug = await this.prisma.drugs.findUnique({ where: { id: input.drug_id } });
    if (!drug || drug.is_deleted) throw new BadRequestException('Drug not found');

    const batch = await this.prisma.$transaction(async (tx) => {
      const created = await tx.drugBatches.create({
        data: {
          drug_id: input.drug_id,
          clinic_id: input.clinic_id,
          client_org_id: clinic.client_org_id as string,
          batch_number: input.batch_number,
          expiry_date: new Date(input.expiry_date),
          quantity_received: input.quantity,
          quantity_remaining: input.quantity,
          mrp_paise: RUPEES_TO_PAISE(input.mrp),
        },
      });
      await tx.stockMovements.create({
        data: {
          batch_id: created.id,
          movement_type: 'receipt',
          quantity_delta: input.quantity,
          created_by_user_id: user.sub,
        },
      });
      return created;
    });
    return this.batchToGraphQL(batch);
  }

  private async assertBatchInScope(batchId: string, user: JwtPayload) {
    const batch = await this.prisma.drugBatches.findUnique({ where: { id: batchId } });
    if (!batch) throw new BadRequestException('Batch not found');
    if (!isSameOrg(user, batch.client_org_id)) throw new BadRequestException('Batch not found');
    return batch;
  }

  async adjustStock(input: AdjustStockInput, user: JwtPayload) {
    const batch = await this.assertBatchInScope(input.batch_id, user);
    const newRemaining = batch.quantity_remaining + input.quantity_delta;
    if (newRemaining < 0) throw new BadRequestException('Adjustment would take remaining stock below zero');

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.drugBatches.update({
        where: { id: input.batch_id },
        data: { quantity_remaining: newRemaining },
      });
      await tx.stockMovements.create({
        data: {
          batch_id: input.batch_id,
          movement_type: 'adjustment',
          quantity_delta: input.quantity_delta,
          notes: input.notes,
          created_by_user_id: user.sub,
        },
      });
      return result;
    });
    return this.batchToGraphQL(updated);
  }

  // Decrements a batch's remaining stock and writes an audit trail row
  // linked to the prescription item being fulfilled — pure internal
  // tracking, no external pharmacy-system integration.
  async dispensePrescriptionItem(input: DispensePrescriptionItemInput, user: JwtPayload) {
    const batch = await this.assertBatchInScope(input.batch_id, user);
    const item = await this.prisma.prescriptionItems.findUnique({ where: { id: input.prescription_item_id } });
    if (!item) throw new BadRequestException('Prescription item not found');
    if (item.drug_id !== batch.drug_id) {
      throw new BadRequestException('This batch does not match the prescribed drug');
    }
    if (batch.quantity_remaining < input.quantity) {
      throw new BadRequestException('Not enough stock remaining in this batch');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.drugBatches.update({
        where: { id: input.batch_id },
        data: { quantity_remaining: batch.quantity_remaining - input.quantity },
      });
      await tx.stockMovements.create({
        data: {
          batch_id: input.batch_id,
          movement_type: 'dispense',
          quantity_delta: -input.quantity,
          reference_type: 'prescription_item',
          reference_id: input.prescription_item_id,
          created_by_user_id: user.sub,
        },
      });
      return result;
    });
    return this.batchToGraphQL(updated);
  }

  // REQ022 (US-PHR-09, scoped) — batches with stock remaining, crossing a
  // configurable expiry horizon. quantity_remaining: {gt: 0} excludes
  // fully-consumed batches, which have no real expiry risk left to report.
  async nearExpiryBatches(clinicId: string | undefined, horizonDays: number, user: JwtPayload) {
    const cutoff = new Date(Date.now() + horizonDays * 24 * 60 * 60 * 1000);
    const batches = await this.prisma.drugBatches.findMany({
      where: {
        ...(clinicId ? { clinic_id: clinicId } : {}),
        ...orgScope(user),
        quantity_remaining: { gt: 0 },
        expiry_date: { lte: cutoff },
      },
      include: { drug: true },
      orderBy: { expiry_date: 'asc' },
    });
    return batches.map((b: any) => ({ ...this.batchToGraphQL(b), drug_name: b.drug.name }));
  }

  // REQ022 (US-PHR-09, scoped) — a drug's total remaining stock (summed
  // across every batch in scope) at or below its own configured
  // reorder_level. A drug with no reorder_level set is never included —
  // fail-safe default, matching every other optional-alert-threshold field
  // in this schema.
  async lowStockDrugs(clinicId: string | undefined, user: JwtPayload) {
    const drugs = await this.prisma.drugs.findMany({
      where: { is_deleted: false, reorder_level: { not: null }, ...orgScope(user) },
    });
    if (drugs.length === 0) return [];
    const totals = await this.prisma.drugBatches.groupBy({
      by: ['drug_id'],
      where: {
        drug_id: { in: drugs.map((d) => d.id) },
        ...(clinicId ? { clinic_id: clinicId } : {}),
      },
      _sum: { quantity_remaining: true },
    });
    const totalByDrug = new Map(totals.map((t) => [t.drug_id, t._sum.quantity_remaining ?? 0]));
    return drugs
      .map((d) => ({ drug_id: d.id, drug_name: d.name, reorder_level: d.reorder_level as number, quantity_on_hand: totalByDrug.get(d.id) ?? 0 }))
      .filter((d) => d.quantity_on_hand <= d.reorder_level);
  }
}
