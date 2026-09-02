import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { assertSameOrg } from '../common/scoping/tenant-scope';
import { AdministerMedicationInput, RecordPrnAdministrationInput } from './dto/nursing.input';
import { IpdBillingService } from '../ipd-billing/ipd-billing.service';

// REQ179 (IPD slice 2) — the medication administration record. A scheduled
// row is materialised ahead of time by MarScheduleSweepService from an
// active, non-PRN IpdMedicationOrders row; this service only ever
// transitions an existing row (administer) or creates a PRN one directly
// (recordPrn — PRN has no pre-materialised row to update).
//
// Stock consumption replicates pharmacy.service.ts#dispensePrescriptionItem's
// exact transaction shape (decrement DrugBatches.quantity_remaining, write an
// append-only StockMovements row) rather than calling it directly — that
// method hardcodes reference_type: 'prescription_item' and requires a real
// PrescriptionItems row, neither of which exists here.
//
// REQ179 (IPD slice 4) — a dose marked 'given' against a real stock batch
// also posts a pharmacy IpdCharges row, priced off that batch's own
// mrp_paise (the existing dispense-flow pricing precedent — Drugs has no
// Products-catalog link, so there is no resolveServicePrice() path for a
// drug the way there is for a room/nursing/OT charge). A dose with no
// batch is genuinely unpriced and is deliberately NOT charged — a stated
// gap (an admin must link real stock before a dose bills), not a silent
// guess.
@Injectable()
export class MarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: IpdBillingService,
  ) {}

  private async assertAdmissionInScope(admissionId: string, user: JwtPayload) {
    const admission = await this.prisma.admissions.findUnique({ where: { id: admissionId } });
    if (!admission || admission.is_deleted) throw new NotFoundException('Admission not found');
    assertSameOrg(user, admission.client_org_id, 'Admission');
    return admission;
  }

  private fullName(row: any): string {
    if (!row) return '';
    return [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || row.full_name || '';
  }

  private toGraphQL(m: any) {
    return {
      id: m.id,
      order_id: m.order_id,
      drug_id: m.drug_id,
      drug_name: m.drug?.name ?? undefined,
      dose: m.order?.dose ?? undefined,
      route: m.route ?? m.order?.route ?? undefined,
      is_high_alert: m.order?.is_high_alert ?? false,
      scheduled_at: m.scheduled_at,
      administered_at: m.administered_at ?? undefined,
      status: m.status,
      dose_given: m.dose_given ?? undefined,
      site: m.site ?? undefined,
      hold_reason: m.hold_reason ?? undefined,
      administered_by_name: m.administered_by ? this.fullName(m.administered_by) : undefined,
      witness_name: m.witness ? this.fullName(m.witness) : undefined,
      notes: m.notes ?? undefined,
    };
  }

  private readonly MAR_INCLUDE = { drug: true, order: true, administered_by: true, witness: true };

  // Decrements real stock and writes the audit trail row exactly like
  // pharmacy.service.ts's own dispense method, scoped to this MAR row
  // instead of a PrescriptionItems row.
  private async consumeStock(tx: any, batchId: string, drugId: string, orgId: string, marId: string, userId: string) {
    const batch = await tx.drugBatches.findUnique({ where: { id: batchId } });
    if (!batch) throw new BadRequestException('Batch not found');
    if (batch.client_org_id !== orgId) throw new BadRequestException('Batch not found');
    if (batch.drug_id !== drugId) throw new BadRequestException('This batch does not match the ordered drug');
    if (batch.quantity_remaining < 1) throw new BadRequestException('No stock remaining in this batch');

    await tx.drugBatches.update({ where: { id: batchId }, data: { quantity_remaining: batch.quantity_remaining - 1 } });
    const movement = await tx.stockMovements.create({
      data: {
        batch_id: batchId,
        movement_type: 'dispense',
        quantity_delta: -1,
        reference_type: 'medication_administration',
        reference_id: marId,
        created_by_user_id: userId,
      },
    });
    return { stockMovementId: movement.id as string, mrpPaise: batch.mrp_paise as number | null };
  }

  // REQ179 (IPD slice 4) — posts the pharmacy charge inside the caller's
  // own transaction, so a dose marked 'given' and its bill line are
  // atomic together. No-ops when the batch has no MRP set — an unpriced
  // batch cannot bill, matching the stated gap in this file's own header.
  private async postPharmacyCharge(tx: any, admissionId: string, drugName: string, mrpPaise: number | null, marId: string, userId: string) {
    if (mrpPaise == null) return;
    await this.billingService.postCharge(
      {
        admissionId,
        chargeType: 'pharmacy',
        description: `${drugName} — MAR`,
        serviceDate: new Date(),
        quantity: 1,
        unitPricePaise: mrpPaise,
        sourceReferenceType: 'medication_administration',
        sourceReferenceId: marId,
        postedByUserId: userId,
      },
      tx,
    );
  }

  async administer(input: AdministerMedicationInput, user: JwtPayload) {
    const mar = await this.prisma.medicationAdministrations.findUnique({
      where: { id: input.mar_id },
      include: { order: true },
    });
    if (!mar) throw new NotFoundException('Scheduled dose not found');
    assertSameOrg(user, mar.client_org_id, 'Scheduled dose');
    if (mar.status !== 'scheduled') {
      throw new BadRequestException(`This dose has already been recorded as ${mar.status}`);
    }
    if (input.status === 'given' && mar.order.is_high_alert && !input.witness_user_id) {
      throw new BadRequestException('A high-alert medication requires a witness before it can be marked given');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      let stockMovementId: string | undefined;
      let mrpPaise: number | null = null;
      if (input.status === 'given' && input.batch_id) {
        const result = await this.consumeStock(tx, input.batch_id, mar.drug_id, mar.client_org_id, mar.id, user.sub);
        stockMovementId = result.stockMovementId;
        mrpPaise = result.mrpPaise;
      }
      const row = await tx.medicationAdministrations.update({
        where: { id: input.mar_id },
        data: {
          status: input.status,
          administered_at: new Date(),
          dose_given: input.dose_given,
          route: input.route,
          site: input.site,
          hold_reason: input.hold_reason,
          administered_by_user_id: user.sub,
          witness_user_id: input.witness_user_id,
          batch_id: input.batch_id,
          stock_movement_id: stockMovementId,
          notes: input.notes,
        },
        include: this.MAR_INCLUDE,
      });
      if (input.status === 'given' && input.batch_id) {
        await this.postPharmacyCharge(tx, row.admission_id, row.drug?.name ?? 'Medication', mrpPaise, row.id, user.sub);
      }
      return row;
    });
    return this.toGraphQL(updated);
  }

  // A PRN dose has no pre-materialised row — recorded directly, scheduled_at
  // = administered_at, so it sits correctly on the MAR grid's own timeline.
  async recordPrn(input: RecordPrnAdministrationInput, user: JwtPayload) {
    const order = await this.prisma.ipdMedicationOrders.findUnique({ where: { id: input.order_id } });
    if (!order) throw new NotFoundException('Medication order not found');
    assertSameOrg(user, order.client_org_id, 'Medication order');
    if (!order.is_prn) throw new BadRequestException('This order is not PRN — administer its scheduled dose instead');
    if (order.status !== 'active') throw new BadRequestException(`Cannot administer a ${order.status} order`);
    if (input.status === 'given' && order.is_high_alert && !input.witness_user_id) {
      throw new BadRequestException('A high-alert medication requires a witness before it can be marked given');
    }

    const now = new Date();
    const created = await this.prisma.$transaction(async (tx) => {
      const mar = await tx.medicationAdministrations.create({
        data: {
          client_org_id: order.client_org_id,
          admission_id: order.admission_id,
          order_id: order.id,
          drug_id: order.drug_id,
          scheduled_at: now,
          status: input.status,
          administered_at: now,
          dose_given: input.dose_given,
          route: input.route,
          site: input.site,
          administered_by_user_id: user.sub,
          witness_user_id: input.witness_user_id,
          notes: input.notes,
        },
      });
      let stockMovementId: string | undefined;
      let mrpPaise: number | null = null;
      if (input.status === 'given' && input.batch_id) {
        const result = await this.consumeStock(tx, input.batch_id, order.drug_id, order.client_org_id, mar.id, user.sub);
        stockMovementId = result.stockMovementId;
        mrpPaise = result.mrpPaise;
      }
      const row = stockMovementId
        ? await tx.medicationAdministrations.update({
            where: { id: mar.id },
            data: { batch_id: input.batch_id, stock_movement_id: stockMovementId },
            include: this.MAR_INCLUDE,
          })
        : await tx.medicationAdministrations.findUnique({ where: { id: mar.id }, include: this.MAR_INCLUDE });
      if (input.status === 'given' && input.batch_id) {
        // row is always the update() branch's non-null result here --
        // stockMovementId (and therefore this same condition) gated it.
        await this.postPharmacyCharge(tx, order.admission_id, row!.drug?.name ?? 'Medication', mrpPaise, mar.id, user.sub);
      }
      return row;
    });
    return this.toGraphQL(created);
  }

  async admissionMar(admissionId: string, from: string | undefined, to: string | undefined, user: JwtPayload) {
    await this.assertAdmissionInScope(admissionId, user);
    const records = await this.prisma.medicationAdministrations.findMany({
      where: {
        admission_id: admissionId,
        ...(from || to
          ? { scheduled_at: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
          : {}),
      },
      include: this.MAR_INCLUDE,
      orderBy: { scheduled_at: 'asc' },
    });
    return records.map((m) => this.toGraphQL(m));
  }
}
