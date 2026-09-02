import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MarService } from './mar.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('MarService', () => {
  let service: MarService;
  let prisma: any;

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['staff'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;

  const marRow = {
    id: 'mar-1',
    client_org_id: 'org-a',
    admission_id: 'adm-a',
    order_id: 'order-1',
    drug_id: 'drug-a',
    status: 'scheduled',
    order: { id: 'order-1', is_high_alert: false },
  };

  const highAlertMar = { ...marRow, order: { id: 'order-1', is_high_alert: true } };

  const batchA = { id: 'batch-1', client_org_id: 'org-a', drug_id: 'drug-a', quantity_remaining: 10 };

  beforeEach(async () => {
    prisma = {
      admissions: { findUnique: jest.fn().mockResolvedValue({ id: 'adm-a', client_org_id: 'org-a', is_deleted: false }) },
      medicationAdministrations: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      ipdMedicationOrders: { findUnique: jest.fn() },
      drugBatches: { findUnique: jest.fn(), update: jest.fn() },
      stockMovements: { create: jest.fn().mockResolvedValue({ id: 'move-1' }) },
      $transaction: jest.fn((cb) => cb(prisma)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(MarService);
  });

  describe('administer', () => {
    it('rejects a cross-org dose', async () => {
      prisma.medicationAdministrations.findUnique.mockResolvedValue({ ...marRow, client_org_id: 'org-b' });
      await expect(service.administer({ mar_id: 'mar-1', status: 'given' } as any, orgAUser)).rejects.toThrow();
      expect(prisma.medicationAdministrations.update).not.toHaveBeenCalled();
    });

    it('rejects re-recording an already-recorded dose', async () => {
      prisma.medicationAdministrations.findUnique.mockResolvedValue({ ...marRow, status: 'given' });
      await expect(service.administer({ mar_id: 'mar-1', status: 'given' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('requires a witness for a high-alert medication marked given', async () => {
      prisma.medicationAdministrations.findUnique.mockResolvedValue(highAlertMar);
      await expect(service.administer({ mar_id: 'mar-1', status: 'given' } as any, orgAUser)).rejects.toThrow(BadRequestException);
      expect(prisma.medicationAdministrations.update).not.toHaveBeenCalled();
    });

    it('allows a high-alert dose to be given with a witness', async () => {
      prisma.medicationAdministrations.findUnique.mockResolvedValue(highAlertMar);
      prisma.medicationAdministrations.update.mockResolvedValue({ ...highAlertMar, status: 'given' });
      await service.administer({ mar_id: 'mar-1', status: 'given', witness_user_id: 'u9' } as any, orgAUser);
      expect(prisma.medicationAdministrations.update).toHaveBeenCalled();
    });

    it('allows recording a held/refused/missed dose with no witness even for a high-alert order', async () => {
      prisma.medicationAdministrations.findUnique.mockResolvedValue(highAlertMar);
      prisma.medicationAdministrations.update.mockResolvedValue({ ...highAlertMar, status: 'refused' });
      await service.administer({ mar_id: 'mar-1', status: 'refused', hold_reason: 'Patient refused' } as any, orgAUser);
      expect(prisma.medicationAdministrations.update).toHaveBeenCalled();
    });

    it('decrements real stock and writes an append-only movement when given with a batch', async () => {
      prisma.medicationAdministrations.findUnique.mockResolvedValue(marRow);
      prisma.drugBatches.findUnique.mockResolvedValue(batchA);
      prisma.medicationAdministrations.update.mockResolvedValue({ ...marRow, status: 'given', batch_id: 'batch-1' });
      await service.administer({ mar_id: 'mar-1', status: 'given', batch_id: 'batch-1' } as any, orgAUser);

      expect(prisma.drugBatches.update).toHaveBeenCalledWith({ where: { id: 'batch-1' }, data: { quantity_remaining: 9 } });
      expect(prisma.stockMovements.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ batch_id: 'batch-1', movement_type: 'dispense', quantity_delta: -1, reference_type: 'medication_administration', reference_id: 'mar-1' }),
        }),
      );
      expect(prisma.medicationAdministrations.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ stock_movement_id: 'move-1' }) }),
      );
    });

    it('rejects consuming a batch belonging to a different drug', async () => {
      prisma.medicationAdministrations.findUnique.mockResolvedValue(marRow);
      prisma.drugBatches.findUnique.mockResolvedValue({ ...batchA, drug_id: 'other-drug' });
      await expect(service.administer({ mar_id: 'mar-1', status: 'given', batch_id: 'batch-1' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects consuming a batch with insufficient stock', async () => {
      prisma.medicationAdministrations.findUnique.mockResolvedValue(marRow);
      prisma.drugBatches.findUnique.mockResolvedValue({ ...batchA, quantity_remaining: 0 });
      await expect(service.administer({ mar_id: 'mar-1', status: 'given', batch_id: 'batch-1' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('recordPrn', () => {
    const prnOrder = { id: 'order-2', client_org_id: 'org-a', admission_id: 'adm-a', drug_id: 'drug-a', is_prn: true, is_high_alert: false, status: 'active' };

    it('rejects a non-PRN order', async () => {
      prisma.ipdMedicationOrders.findUnique.mockResolvedValue({ ...prnOrder, is_prn: false });
      await expect(service.recordPrn({ order_id: 'order-2', status: 'given' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects a cross-org order', async () => {
      prisma.ipdMedicationOrders.findUnique.mockResolvedValue({ ...prnOrder, client_org_id: 'org-b' });
      await expect(service.recordPrn({ order_id: 'order-2', status: 'given' } as any, orgAUser)).rejects.toThrow();
    });

    it('creates a MAR row with scheduled_at equal to administered_at', async () => {
      prisma.ipdMedicationOrders.findUnique.mockResolvedValue(prnOrder);
      prisma.medicationAdministrations.create.mockResolvedValue({ id: 'mar-2' });
      prisma.medicationAdministrations.findUnique.mockResolvedValue({ ...marRow, id: 'mar-2', order: prnOrder });
      await service.recordPrn({ order_id: 'order-2', status: 'given' } as any, orgAUser);

      const createArgs = prisma.medicationAdministrations.create.mock.calls[0][0].data;
      expect(createArgs.scheduled_at).toEqual(createArgs.administered_at);
      expect(createArgs.order_id).toBe('order-2');
    });
  });

  describe('admissionMar', () => {
    it('rejects a cross-org admission', async () => {
      prisma.admissions.findUnique.mockResolvedValue({ id: 'adm-a', client_org_id: 'org-b', is_deleted: false });
      await expect(service.admissionMar('adm-a', undefined, undefined, orgAUser)).rejects.toThrow(NotFoundException);
    });
  });
});
