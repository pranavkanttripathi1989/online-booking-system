import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { assertSameOrg, isSameOrg } from '../common/scoping/tenant-scope';
import { RecordOtConsumableInput } from './dto/operation-theatre.input';
import { IpdBillingService } from '../ipd-billing/ipd-billing.service';

// REQ179 (IPD slice 3) — real stock consumption for OT consumables/
// implants, mirroring mar.service.ts#consumeStock's exact transaction
// shape (itself replicating pharmacy.service.ts#dispensePrescriptionItem):
// decrement DrugBatches.quantity_remaining, write an append-only
// StockMovements row.
//
// REQ179 (IPD slice 4) — when a real batch is used, also posts an
// ot_consumable IpdCharges row priced off that batch's own mrp_paise, the
// exact mar.service.ts#postPharmacyCharge precedent. A consumable recorded
// with no batch is genuinely unpriced and deliberately NOT charged — a
// stated gap, not a silent guess.
@Injectable()
export class OtConsumablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: IpdBillingService,
  ) {}

  private async assertBookingInScope(bookingId: string, user: JwtPayload) {
    const booking = await this.prisma.otBookings.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('OT booking not found');
    assertSameOrg(user, booking.client_org_id, 'OT booking');
    return booking;
  }

  async record(input: RecordOtConsumableInput, user: JwtPayload) {
    const booking = await this.assertBookingInScope(input.booking_id, user);
    const drug = await this.prisma.drugs.findUnique({ where: { id: input.drug_id } });
    if (!drug || drug.is_deleted) throw new BadRequestException('Item not found');

    const consumable = await this.prisma.$transaction(async (tx) => {
      const created = await tx.otConsumables.create({
        data: {
          client_org_id: booking.client_org_id,
          booking_id: input.booking_id,
          drug_id: input.drug_id,
          quantity: input.quantity,
          implant_serial_no: input.implant_serial_no,
          recorded_by_user_id: user.sub,
        },
      });

      if (!input.batch_id) return created;

      const batch = await tx.drugBatches.findUnique({ where: { id: input.batch_id } });
      if (!batch) throw new BadRequestException('Batch not found');
      if (batch.client_org_id !== booking.client_org_id) throw new BadRequestException('Batch not found');
      if (batch.drug_id !== input.drug_id) throw new BadRequestException('This batch does not match the selected item');
      if (batch.quantity_remaining < input.quantity) throw new BadRequestException('Not enough stock remaining in this batch');

      await tx.drugBatches.update({ where: { id: input.batch_id }, data: { quantity_remaining: batch.quantity_remaining - input.quantity } });
      const movement = await tx.stockMovements.create({
        data: {
          batch_id: input.batch_id,
          movement_type: 'dispense',
          quantity_delta: -input.quantity,
          reference_type: 'ot_consumable',
          reference_id: created.id,
          created_by_user_id: user.sub,
        },
      });
      const updated = await tx.otConsumables.update({
        where: { id: created.id },
        data: { batch_id: input.batch_id, stock_movement_id: movement.id },
      });
      if (batch.mrp_paise != null) {
        await this.billingService.postCharge(
          {
            admissionId: booking.admission_id,
            chargeType: 'ot_consumable',
            description: `${drug.name} — OT consumable`,
            serviceDate: new Date(),
            quantity: input.quantity,
            unitPricePaise: batch.mrp_paise,
            sourceReferenceType: 'ot_consumable',
            sourceReferenceId: created.id,
            postedByUserId: user.sub,
          },
          tx,
        );
      }
      return updated;
    });
    return consumable.id;
  }

  async remove(id: string, user: JwtPayload) {
    const existing = await this.prisma.otConsumables.findUnique({ where: { id } });
    if (!existing) return { success: false, userErrors: [{ message: 'Consumable record not found' }] };
    if (!isSameOrg(user, existing.client_org_id)) {
      return { success: false, userErrors: [{ message: 'Consumable record not found' }] };
    }
    if (existing.stock_movement_id) {
      return { success: false, userErrors: [{ message: 'This record already consumed real stock and cannot be deleted -- it is part of the audit trail.' }] };
    }
    await this.prisma.otConsumables.delete({ where: { id } });
    return { success: true, userErrors: [] };
  }
}
