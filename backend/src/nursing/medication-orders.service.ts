import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { assertSameOrg, isSameOrg } from '../common/scoping/tenant-scope';
import { CreateIpdMedicationOrderInput, HoldIpdMedicationOrderInput, StopIpdMedicationOrderInput } from './dto/nursing.input';

// REQ179 (IPD slice 2) — standing IPD medication orders. Deliberately NOT
// Prescriptions: a Prescription models a take-home script issued at the end
// of a consultation; an IpdMedicationOrder is a standing order with its own
// stop date and PRN semantics that the MAR (mar.service.ts) administers
// against every shift, days at a time, while the patient is in a bed.
@Injectable()
export class MedicationOrdersService {
  constructor(private readonly prisma: PrismaService) {}

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

  private toGraphQL(o: any) {
    return {
      id: o.id,
      drug_id: o.drug_id,
      drug_name: o.drug?.name ?? undefined,
      dose: o.dose,
      dose_unit: o.dose_unit ?? undefined,
      route: o.route,
      frequency: o.frequency,
      schedule_times: (o.schedule_times_json as string[] | null) ?? undefined,
      is_prn: o.is_prn,
      prn_indication: o.prn_indication ?? undefined,
      start_at: o.start_at,
      stop_at: o.stop_at ?? undefined,
      status: o.status,
      hold_reason: o.hold_reason ?? undefined,
      is_high_alert: o.is_high_alert,
      instructions: o.instructions ?? undefined,
      ordered_by_clinician_id: o.ordered_by_clinician_id,
      ordered_by_name: o.ordered_by ? this.fullName(o.ordered_by) : undefined,
      created_at: o.created_at,
    };
  }

  private readonly ORDER_INCLUDE = { drug: true, ordered_by: true };

  async create(input: CreateIpdMedicationOrderInput, user: JwtPayload) {
    const admission = await this.assertAdmissionInScope(input.admission_id, user);
    if (!['pending', 'admitted', 'discharge_initiated'].includes(admission.status)) {
      throw new BadRequestException(`Cannot order medication for a ${admission.status} admission`);
    }

    const drug = await this.prisma.drugs.findUnique({ where: { id: input.drug_id } });
    if (!drug || drug.is_deleted) throw new BadRequestException('Drug not found');

    // ordered_by_clinician_id is the caller's own clinician identity, not a
    // client-supplied argument (Hard Rule 6 applied to "who is the author",
    // matching prescriptions.service.ts's own createPrescription precedent).
    if (!user.clinician_id) {
      throw new BadRequestException('Only a clinician can place a medication order');
    }

    if (!input.is_prn && (!input.schedule_times || input.schedule_times.length === 0)) {
      throw new BadRequestException('A non-PRN order needs at least one scheduled administration time');
    }

    const order = await this.prisma.ipdMedicationOrders.create({
      data: {
        client_org_id: admission.client_org_id,
        admission_id: input.admission_id,
        drug_id: input.drug_id,
        dose: input.dose,
        dose_unit: input.dose_unit,
        route: input.route,
        frequency: input.frequency,
        schedule_times_json: input.is_prn ? undefined : (input.schedule_times as any),
        is_prn: input.is_prn ?? false,
        prn_indication: input.prn_indication,
        start_at: input.start_at ?? new Date(),
        stop_at: input.stop_at,
        is_high_alert: input.is_high_alert ?? false,
        instructions: input.instructions,
        ordered_by_clinician_id: user.clinician_id,
      },
      include: this.ORDER_INCLUDE,
    });
    return this.toGraphQL(order);
  }

  async hold(input: HoldIpdMedicationOrderInput, user: JwtPayload) {
    const order = await this.prisma.ipdMedicationOrders.findUnique({ where: { id: input.order_id } });
    if (!order) throw new NotFoundException('Medication order not found');
    assertSameOrg(user, order.client_org_id, 'Medication order');
    if (order.status !== 'active') throw new BadRequestException(`Cannot hold a ${order.status} order`);

    const updated = await this.prisma.ipdMedicationOrders.update({
      where: { id: input.order_id },
      data: { status: 'held', hold_reason: input.reason },
      include: this.ORDER_INCLUDE,
    });
    return this.toGraphQL(updated);
  }

  async resume(orderId: string, user: JwtPayload) {
    const order = await this.prisma.ipdMedicationOrders.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Medication order not found');
    assertSameOrg(user, order.client_org_id, 'Medication order');
    if (order.status !== 'held') throw new BadRequestException(`Cannot resume a ${order.status} order`);

    const updated = await this.prisma.ipdMedicationOrders.update({
      where: { id: orderId },
      data: { status: 'active', hold_reason: null },
      include: this.ORDER_INCLUDE,
    });
    return this.toGraphQL(updated);
  }

  async stop(input: StopIpdMedicationOrderInput, user: JwtPayload) {
    const order = await this.prisma.ipdMedicationOrders.findUnique({ where: { id: input.order_id } });
    if (!order) throw new NotFoundException('Medication order not found');
    assertSameOrg(user, order.client_org_id, 'Medication order');
    if (['stopped', 'completed'].includes(order.status)) {
      throw new BadRequestException(`This order is already ${order.status}`);
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const stopped = await tx.ipdMedicationOrders.update({
        where: { id: input.order_id },
        data: { status: 'stopped', stop_at: now, stopped_at: now, stopped_by_user_id: user.sub },
        include: this.ORDER_INCLUDE,
      });
      // Any not-yet-due scheduled doses beyond the stop time are cancelled
      // by removal from the caller's active worklist — 'not_available' is
      // this MAR's own vocabulary for "will never be given", distinct from
      // 'missed' (was due, wasn't given) so a nurse's dashboard doesn't show
      // a stopped order's future doses as overdue.
      await tx.medicationAdministrations.updateMany({
        where: { order_id: input.order_id, status: 'scheduled', scheduled_at: { gt: now } },
        data: { status: 'not_available', hold_reason: 'Order stopped' },
      });
      return stopped;
    });
    return this.toGraphQL(updated);
  }

  async findAllForAdmission(admissionId: string, activeOnly: boolean, user: JwtPayload) {
    await this.assertAdmissionInScope(admissionId, user);
    const orders = await this.prisma.ipdMedicationOrders.findMany({
      where: { admission_id: admissionId, ...(activeOnly ? { status: { in: ['active', 'held'] } } : {}) },
      include: this.ORDER_INCLUDE,
      orderBy: { start_at: 'desc' },
    });
    return orders.map((o) => this.toGraphQL(o));
  }

  async findOne(id: string, user: JwtPayload) {
    const order = await this.prisma.ipdMedicationOrders.findUnique({ where: { id }, include: this.ORDER_INCLUDE });
    if (!order) throw new NotFoundException('Medication order not found');
    if (!isSameOrg(user, order.client_org_id)) throw new NotFoundException('Medication order not found');
    return this.toGraphQL(order);
  }
}
