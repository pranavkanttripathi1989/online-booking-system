import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// REQ022 (pharmacy P0) — the behaviour under test that matters most:
// StockMovements is append-only (every mutation writes one), and a
// dispense can never take a batch below zero or dispense the wrong drug.
describe('PharmacyService', () => {
  let service: PharmacyService;
  let prisma: {
    drugBatches: { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock; groupBy: jest.Mock };
    stockMovements: { findMany: jest.Mock };
    clinics: { findUnique: jest.Mock };
    drugs: { findUnique: jest.Mock; findMany: jest.Mock };
    prescriptionItems: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['staff'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const clinicA = { id: 'clinic-a', client_org_id: 'org-a', is_deleted: false };
  const drugA = { id: 'drug-a', client_org_id: 'org-a', is_deleted: false };
  const batchA = { id: 'batch-a', drug_id: 'drug-a', clinic_id: 'clinic-a', client_org_id: 'org-a', quantity_received: 100, quantity_remaining: 40 };
  const batchB = { ...batchA, id: 'batch-b', client_org_id: 'org-b' };

  beforeEach(async () => {
    prisma = {
      drugBatches: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), groupBy: jest.fn().mockResolvedValue([]) },
      stockMovements: { findMany: jest.fn() },
      clinics: { findUnique: jest.fn() },
      drugs: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      prescriptionItems: { findUnique: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
    };
    (prisma as any).drugBatches.create = jest.fn();
    (prisma as any).stockMovements.create = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [PharmacyService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(PharmacyService);
  });

  it('scopes findBatches to the caller org', async () => {
    prisma.drugBatches.findMany.mockResolvedValue([]);
    await service.findBatches(undefined, undefined, orgAUser);
    expect(prisma.drugBatches.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ client_org_id: 'org-a' }) }),
    );
  });

  describe('receiveStock', () => {
    it('rejects a clinic_id belonging to a different org', async () => {
      prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-b', client_org_id: 'org-b', is_deleted: false });
      await expect(
        service.receiveStock({ drug_id: 'drug-a', clinic_id: 'clinic-b', batch_number: 'B1', expiry_date: '2027-01-01', quantity: 10 } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a batch and a matching receipt movement, quantity_remaining starts equal to quantity_received', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.drugs.findUnique.mockResolvedValue(drugA);
      (prisma as any).drugBatches.create.mockResolvedValue({ ...batchA, quantity_remaining: 50, id: 'batch-new' });
      await service.receiveStock({ drug_id: 'drug-a', clinic_id: 'clinic-a', batch_number: 'B1', expiry_date: '2027-01-01', quantity: 50 } as any, orgAUser);
      expect((prisma as any).drugBatches.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ quantity_received: 50, quantity_remaining: 50, client_org_id: 'org-a' }) }),
      );
      expect((prisma as any).stockMovements.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ movement_type: 'receipt', quantity_delta: 50 }) }),
      );
    });
  });

  describe('adjustStock', () => {
    it('rejects a cross-org batch', async () => {
      prisma.drugBatches.findUnique.mockResolvedValue(batchB);
      await expect(service.adjustStock({ batch_id: 'batch-b', quantity_delta: -5 } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects an adjustment that would take remaining stock below zero', async () => {
      prisma.drugBatches.findUnique.mockResolvedValue(batchA); // remaining: 40
      await expect(service.adjustStock({ batch_id: 'batch-a', quantity_delta: -50 } as any, orgAUser)).rejects.toThrow(BadRequestException);
      expect(prisma.drugBatches.update).not.toHaveBeenCalled();
    });

    it('applies a valid negative adjustment and logs it', async () => {
      prisma.drugBatches.findUnique.mockResolvedValue(batchA);
      prisma.drugBatches.update.mockResolvedValue({ ...batchA, quantity_remaining: 35 });
      await service.adjustStock({ batch_id: 'batch-a', quantity_delta: -5, notes: 'breakage' } as any, orgAUser);
      expect(prisma.drugBatches.update).toHaveBeenCalledWith({ where: { id: 'batch-a' }, data: { quantity_remaining: 35 } });
      expect((prisma as any).stockMovements.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ movement_type: 'adjustment', quantity_delta: -5, notes: 'breakage' }) }),
      );
    });
  });

  describe('dispensePrescriptionItem', () => {
    it('rejects when the batch drug does not match the prescription item drug', async () => {
      prisma.drugBatches.findUnique.mockResolvedValue(batchA); // drug-a
      prisma.prescriptionItems.findUnique.mockResolvedValue({ id: 'item-1', drug_id: 'drug-other' });
      await expect(
        service.dispensePrescriptionItem({ prescription_item_id: 'item-1', batch_id: 'batch-a', quantity: 5 } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects dispensing more than remains in the batch', async () => {
      prisma.drugBatches.findUnique.mockResolvedValue(batchA); // remaining 40
      prisma.prescriptionItems.findUnique.mockResolvedValue({ id: 'item-1', drug_id: 'drug-a' });
      await expect(
        service.dispensePrescriptionItem({ prescription_item_id: 'item-1', batch_id: 'batch-a', quantity: 41 } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('decrements remaining stock and writes a dispense movement linked to the prescription item', async () => {
      prisma.drugBatches.findUnique.mockResolvedValue(batchA); // remaining 40
      prisma.prescriptionItems.findUnique.mockResolvedValue({ id: 'item-1', drug_id: 'drug-a' });
      prisma.drugBatches.update.mockResolvedValue({ ...batchA, quantity_remaining: 30 });
      await service.dispensePrescriptionItem({ prescription_item_id: 'item-1', batch_id: 'batch-a', quantity: 10 } as any, orgAUser);
      expect(prisma.drugBatches.update).toHaveBeenCalledWith({ where: { id: 'batch-a' }, data: { quantity_remaining: 30 } });
      expect((prisma as any).stockMovements.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ movement_type: 'dispense', quantity_delta: -10, reference_type: 'prescription_item', reference_id: 'item-1' }),
        }),
      );
    });
  });

  // REQ022 (US-PHR-09, scoped).
  describe('nearExpiryBatches', () => {
    it('filters to batches with stock remaining, expiring within the horizon', async () => {
      prisma.drugBatches.findMany.mockResolvedValue([]);
      await service.nearExpiryBatches(undefined, 90, orgAUser);
      const where = prisma.drugBatches.findMany.mock.calls[0][0].where;
      expect(where.quantity_remaining).toEqual({ gt: 0 });
      expect(where.expiry_date.lte).toBeInstanceOf(Date);
      expect(where.client_org_id).toBe('org-a');
    });

    it('includes the drug name on each returned batch', async () => {
      prisma.drugBatches.findMany.mockResolvedValue([{ ...batchA, drug: { name: 'Amoxicillin' } }]);
      const [result] = await service.nearExpiryBatches(undefined, 90, orgAUser);
      expect(result.drug_name).toBe('Amoxicillin');
    });
  });

  describe('lowStockDrugs', () => {
    it('returns nothing when no drug has a reorder_level configured', async () => {
      prisma.drugs.findMany.mockResolvedValue([]);
      const result = await service.lowStockDrugs(undefined, orgAUser);
      expect(result).toEqual([]);
      expect(prisma.drugBatches.groupBy).not.toHaveBeenCalled();
    });

    it('excludes a drug whose stock is still above its reorder level', async () => {
      prisma.drugs.findMany.mockResolvedValue([{ id: 'drug-a', name: 'Amoxicillin', reorder_level: 10 }]);
      prisma.drugBatches.groupBy.mockResolvedValue([{ drug_id: 'drug-a', _sum: { quantity_remaining: 50 } }]);
      const result = await service.lowStockDrugs(undefined, orgAUser);
      expect(result).toEqual([]);
    });

    it('includes a drug whose stock is at or below its reorder level', async () => {
      prisma.drugs.findMany.mockResolvedValue([{ id: 'drug-a', name: 'Amoxicillin', reorder_level: 10 }]);
      prisma.drugBatches.groupBy.mockResolvedValue([{ drug_id: 'drug-a', _sum: { quantity_remaining: 5 } }]);
      const result = await service.lowStockDrugs(undefined, orgAUser);
      expect(result).toEqual([{ drug_id: 'drug-a', drug_name: 'Amoxicillin', reorder_level: 10, quantity_on_hand: 5 }]);
    });

    it('treats a drug with zero matching batches as zero stock on hand, not excluded', async () => {
      prisma.drugs.findMany.mockResolvedValue([{ id: 'drug-a', name: 'Amoxicillin', reorder_level: 10 }]);
      prisma.drugBatches.groupBy.mockResolvedValue([]); // no batches at all
      const result = await service.lowStockDrugs(undefined, orgAUser);
      expect(result).toEqual([{ drug_id: 'drug-a', drug_name: 'Amoxicillin', reorder_level: 10, quantity_on_hand: 0 }]);
    });
  });
});
