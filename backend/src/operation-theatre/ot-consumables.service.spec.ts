import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OtConsumablesService } from './ot-consumables.service';
import { PrismaService } from '../prisma/prisma.service';
import { IpdBillingService } from '../ipd-billing/ipd-billing.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('OtConsumablesService', () => {
  let service: OtConsumablesService;
  let prisma: any;
  let billingService: any;

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['staff'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const bookingA = { id: 'booking-a', client_org_id: 'org-a', admission_id: 'adm-a' };
  const drugA = { id: 'drug-a', is_deleted: false, name: 'Gauze roll' };
  const batchA = { id: 'batch-1', client_org_id: 'org-a', drug_id: 'drug-a', quantity_remaining: 10, mrp_paise: 2000 };

  beforeEach(async () => {
    prisma = {
      otBookings: { findUnique: jest.fn().mockResolvedValue(bookingA) },
      drugs: { findUnique: jest.fn().mockResolvedValue(drugA) },
      otConsumables: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
      drugBatches: { findUnique: jest.fn(), update: jest.fn() },
      stockMovements: { create: jest.fn().mockResolvedValue({ id: 'move-1' }) },
      $transaction: jest.fn((cb) => cb(prisma)),
    };
    billingService = { postCharge: jest.fn().mockResolvedValue({ id: 'charge-1' }) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [OtConsumablesService, { provide: PrismaService, useValue: prisma }, { provide: IpdBillingService, useValue: billingService }],
    }).compile();
    service = module.get(OtConsumablesService);
  });

  describe('record', () => {
    it('rejects a cross-org booking', async () => {
      prisma.otBookings.findUnique.mockResolvedValue({ ...bookingA, client_org_id: 'org-b' });
      await expect(service.record({ booking_id: 'booking-a', drug_id: 'drug-a', quantity: 1 } as any, orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects a deleted item', async () => {
      prisma.drugs.findUnique.mockResolvedValue({ ...drugA, is_deleted: true });
      await expect(service.record({ booking_id: 'booking-a', drug_id: 'drug-a', quantity: 1 } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('records without a batch when none is supplied — no stock movement written', async () => {
      prisma.otConsumables.create.mockResolvedValue({ id: 'consumable-1' });
      const id = await service.record({ booking_id: 'booking-a', drug_id: 'drug-a', quantity: 3 } as any, orgAUser);
      expect(id).toBe('consumable-1');
      expect(prisma.drugBatches.update).not.toHaveBeenCalled();
      expect(prisma.stockMovements.create).not.toHaveBeenCalled();
    });

    it('decrements real stock and writes an append-only movement when a batch is given', async () => {
      prisma.otConsumables.create.mockResolvedValue({ id: 'consumable-1' });
      prisma.drugBatches.findUnique.mockResolvedValue(batchA);
      prisma.otConsumables.update.mockResolvedValue({ id: 'consumable-1', batch_id: 'batch-1', stock_movement_id: 'move-1' });
      await service.record({ booking_id: 'booking-a', drug_id: 'drug-a', quantity: 3, batch_id: 'batch-1' } as any, orgAUser);

      expect(prisma.drugBatches.update).toHaveBeenCalledWith({ where: { id: 'batch-1' }, data: { quantity_remaining: 7 } });
      expect(prisma.stockMovements.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ batch_id: 'batch-1', movement_type: 'dispense', quantity_delta: -3, reference_type: 'ot_consumable', reference_id: 'consumable-1' }),
        }),
      );
      expect(prisma.otConsumables.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ batch_id: 'batch-1', stock_movement_id: 'move-1' }) }),
      );
    });

    it('posts an ot_consumable IPD charge priced off the batch MRP when a batch is given', async () => {
      prisma.otConsumables.create.mockResolvedValue({ id: 'consumable-1' });
      prisma.drugBatches.findUnique.mockResolvedValue(batchA);
      prisma.otConsumables.update.mockResolvedValue({ id: 'consumable-1', batch_id: 'batch-1', stock_movement_id: 'move-1' });
      await service.record({ booking_id: 'booking-a', drug_id: 'drug-a', quantity: 3, batch_id: 'batch-1' } as any, orgAUser);

      expect(billingService.postCharge).toHaveBeenCalledWith(
        expect.objectContaining({ admissionId: 'adm-a', chargeType: 'ot_consumable', quantity: 3, unitPricePaise: 2000, sourceReferenceType: 'ot_consumable', sourceReferenceId: 'consumable-1' }),
        prisma,
      );
    });

    it('does not post a charge when no batch is supplied (an unpriced consumable cannot bill)', async () => {
      prisma.otConsumables.create.mockResolvedValue({ id: 'consumable-1' });
      await service.record({ booking_id: 'booking-a', drug_id: 'drug-a', quantity: 3 } as any, orgAUser);
      expect(billingService.postCharge).not.toHaveBeenCalled();
    });

    it('rejects a batch belonging to a different drug', async () => {
      prisma.otConsumables.create.mockResolvedValue({ id: 'consumable-1' });
      prisma.drugBatches.findUnique.mockResolvedValue({ ...batchA, drug_id: 'other-drug' });
      await expect(
        service.record({ booking_id: 'booking-a', drug_id: 'drug-a', quantity: 1, batch_id: 'batch-1' } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a batch with insufficient stock', async () => {
      prisma.otConsumables.create.mockResolvedValue({ id: 'consumable-1' });
      prisma.drugBatches.findUnique.mockResolvedValue({ ...batchA, quantity_remaining: 1 });
      await expect(
        service.record({ booking_id: 'booking-a', drug_id: 'drug-a', quantity: 5, batch_id: 'batch-1' } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('rejects deleting a record that already consumed real stock', async () => {
      prisma.otConsumables.findUnique.mockResolvedValue({ id: 'c1', client_org_id: 'org-a', stock_movement_id: 'move-1' });
      const result = await service.remove('c1', orgAUser);
      expect(result.success).toBe(false);
      expect(prisma.otConsumables.delete).not.toHaveBeenCalled();
    });

    it('deletes a record with no stock movement attached', async () => {
      prisma.otConsumables.findUnique.mockResolvedValue({ id: 'c1', client_org_id: 'org-a', stock_movement_id: null });
      const result = await service.remove('c1', orgAUser);
      expect(result.success).toBe(true);
      expect(prisma.otConsumables.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });

    it('returns a not-found error for a cross-org record', async () => {
      prisma.otConsumables.findUnique.mockResolvedValue({ id: 'c1', client_org_id: 'org-b', stock_movement_id: null });
      const result = await service.remove('c1', orgAUser);
      expect(result.success).toBe(false);
    });
  });
});
