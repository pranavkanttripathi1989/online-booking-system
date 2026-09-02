import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { IpdBillingService } from './ipd-billing.service';
import { PrismaService } from '../prisma/prisma.service';
import { BranchOverridesService } from '../branch-overrides/branch-overrides.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('IpdBillingService', () => {
  let service: IpdBillingService;
  let prisma: any;
  let branchOverrides: any;

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;

  const admissionA = { id: 'adm-a', client_org_id: 'org-a', clinic_id: 'clinic-a', is_deleted: false, payer_id: null, patient: { patient_category: null } };
  const billA = { id: 'bill-a', client_org_id: 'org-a', clinic_id: 'clinic-a', admission_id: 'adm-a', status: 'open', package_id: null, gross_paise: 0, paid_paise: 0 };

  beforeEach(async () => {
    prisma = {
      admissions: { findUnique: jest.fn().mockResolvedValue(admissionA) },
      clinics: { findUnique: jest.fn().mockResolvedValue({ id: 'clinic-a', is_deleted: false, client_org_id: 'org-a' }) },
      products: { findUnique: jest.fn(), findMany: jest.fn() },
      payerTariffs: { findUnique: jest.fn().mockResolvedValue(null) },
      ipdBillingSettings: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
      ipdBills: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
      },
      ipdCharges: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _sum: { total_paise: 0 } }),
      },
      ipdPayments: { create: jest.fn() },
      ipdPackages: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn() },
      ipdPackageInclusions: { deleteMany: jest.fn(), createMany: jest.fn() },
      invoiceSequences: { upsert: jest.fn().mockResolvedValue({ last_number: 1 }) },
      $transaction: jest.fn((cb) => cb(prisma)),
    };
    branchOverrides = { getForPricing: jest.fn().mockResolvedValue(null) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [IpdBillingService, { provide: PrismaService, useValue: prisma }, { provide: BranchOverridesService, useValue: branchOverrides }],
    }).compile();
    service = module.get(IpdBillingService);
  });

  describe('postCharge — the one funnel', () => {
    it('creates a charge and increments the bill gross_paise inside the same transaction, creating the bill if none exists yet', async () => {
      prisma.ipdBills.findUnique.mockResolvedValue(null);
      prisma.ipdBills.create.mockResolvedValue(billA);
      prisma.ipdCharges.create.mockResolvedValue({ id: 'charge-1', total_paise: 5000 });

      await service.postCharge({ admissionId: 'adm-a', chargeType: 'manual', description: 'x', serviceDate: new Date(), quantity: 1, unitPricePaise: 5000 });

      expect(prisma.ipdBills.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ admission_id: 'adm-a' }) }));
      expect(prisma.ipdCharges.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ total_paise: 5000 }) }));
      expect(prisma.ipdBills.update).toHaveBeenCalledWith({ where: { id: 'bill-a' }, data: { gross_paise: { increment: 5000 } } });
    });

    it('reuses an existing bill rather than creating a second one', async () => {
      prisma.ipdBills.findUnique.mockResolvedValue(billA);
      prisma.ipdCharges.create.mockResolvedValue({ id: 'charge-1', total_paise: 1000 });
      await service.postCharge({ admissionId: 'adm-a', chargeType: 'manual', description: 'x', serviceDate: new Date(), quantity: 1, unitPricePaise: 1000 });
      expect(prisma.ipdBills.create).not.toHaveBeenCalled();
    });

    it('multiplies quantity by unit price for total_paise, supporting a signed (negative) total for a reversal-shaped charge', async () => {
      prisma.ipdBills.findUnique.mockResolvedValue(billA);
      prisma.ipdCharges.create.mockResolvedValue({ id: 'charge-1', total_paise: -3000 });
      await service.postCharge({ admissionId: 'adm-a', chargeType: 'manual', description: 'x', serviceDate: new Date(), quantity: 1, unitPricePaise: -3000 });
      expect(prisma.ipdCharges.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ total_paise: -3000 }) }));
      expect(prisma.ipdBills.update).toHaveBeenCalledWith({ where: { id: 'bill-a' }, data: { gross_paise: { increment: -3000 } } });
    });

    it('runs inside the caller-supplied transaction client when one is given, never opening its own', async () => {
      prisma.ipdBills.findUnique.mockResolvedValue(billA);
      prisma.ipdCharges.create.mockResolvedValue({ id: 'charge-1', total_paise: 1000 });
      const fakeTx = { ...prisma };
      await service.postCharge({ admissionId: 'adm-a', chargeType: 'manual', description: 'x', serviceDate: new Date(), quantity: 1, unitPricePaise: 1000 }, fakeTx);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('postManualCharge', () => {
    it('rejects a cross-org admission', async () => {
      prisma.admissions.findUnique.mockResolvedValue({ ...admissionA, client_org_id: 'org-b' });
      await expect(service.postManualCharge({ admission_id: 'adm-a', description: 'x' } as any, orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects when neither a product nor a unit price is given', async () => {
      prisma.ipdBills.findUnique.mockResolvedValue(billA);
      await expect(service.postManualCharge({ admission_id: 'adm-a', description: 'x' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('prices an ad-hoc line from the caller-supplied unit price when no product is given', async () => {
      prisma.ipdBills.findUnique.mockResolvedValue(billA);
      prisma.ipdCharges.create.mockResolvedValue({ id: 'charge-1', total_paise: 25000, quantity: 1, unit_price_paise: 25000 });
      await service.postManualCharge({ admission_id: 'adm-a', description: 'Extra dressing', unit_price: 250 } as any, orgAUser);
      expect(prisma.ipdCharges.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ unit_price_paise: 25000, product_id: null }) }));
    });

    it('rejects a product with no resolvable price for this patient', async () => {
      prisma.products.findUnique.mockResolvedValue({ id: 'prod-1', is_deleted: false, client_org_id: 'org-a', price: null });
      await expect(service.postManualCharge({ admission_id: 'adm-a', description: 'x', product_id: 'prod-1' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('reverseCharge', () => {
    const originalCharge = { id: 'charge-1', client_org_id: 'org-a', bill_id: 'bill-a', charge_type: 'manual', total_paise: 5000, unit_price_paise: 5000, quantity: 1, product_id: null, clinic_id: 'clinic-a', admission_id: 'adm-a', is_reversed: false };

    it('rejects a cross-org charge', async () => {
      prisma.ipdCharges.findUnique.mockResolvedValue({ ...originalCharge, client_org_id: 'org-b' });
      await expect(service.reverseCharge({ charge_id: 'charge-1', reason: 'x' } as any, orgAUser)).rejects.toThrow();
    });

    it('rejects reversing an already-reversed charge', async () => {
      prisma.ipdCharges.findUnique.mockResolvedValue({ ...originalCharge, is_reversed: true });
      await expect(service.reverseCharge({ charge_id: 'charge-1', reason: 'x' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('marks the original reversed and posts a new signed-negative reversal row, net-zeroing gross_paise', async () => {
      prisma.ipdCharges.findUnique.mockResolvedValue(originalCharge);
      prisma.ipdCharges.create.mockResolvedValue({ id: 'charge-2', total_paise: -5000, bill_id: 'bill-a' });
      await service.reverseCharge({ charge_id: 'charge-1', reason: 'Wrong item' } as any, orgAUser);

      expect(prisma.ipdCharges.update).toHaveBeenCalledWith({ where: { id: 'charge-1' }, data: { is_reversed: true } });
      expect(prisma.ipdCharges.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ total_paise: -5000, source_reference_type: 'charge_reversal', source_reference_id: 'charge-1' }) }));
      expect(prisma.ipdBills.update).toHaveBeenCalledWith({ where: { id: 'bill-a' }, data: { gross_paise: { increment: -5000 } } });
    });
  });

  describe('recordPayment', () => {
    it('rejects a cross-org admission', async () => {
      prisma.admissions.findUnique.mockResolvedValue({ ...admissionA, client_org_id: 'org-b' });
      await expect(service.recordPayment({ admission_id: 'adm-a', payment_type: 'deposit', tenders: [{ tender_type: 'cash', amount: 100 }] } as any, orgAUser)).rejects.toThrow();
    });

    it('sums tenders into a positive amount for a deposit and increments paid_paise', async () => {
      prisma.ipdBills.findUnique.mockResolvedValue(billA);
      prisma.ipdPayments.create.mockResolvedValue({ id: 'pay-1', amount_paise: 15000, tenders_json: [], payment_type: 'deposit', receipt_number: 'IPDR/1' });
      await service.recordPayment({ admission_id: 'adm-a', payment_type: 'deposit', tenders: [{ tender_type: 'cash', amount: 100 }, { tender_type: 'upi', amount: 50 }] } as any, orgAUser);
      expect(prisma.ipdPayments.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ amount_paise: 15000, payment_type: 'deposit' }) }));
      expect(prisma.ipdBills.update).toHaveBeenCalledWith({ where: { id: 'bill-a' }, data: { paid_paise: { increment: 15000 } } });
    });

    it('stores a refund as a negative amount, decrementing paid_paise', async () => {
      prisma.ipdBills.findUnique.mockResolvedValue(billA);
      prisma.ipdPayments.create.mockResolvedValue({ id: 'pay-1', amount_paise: -10000, tenders_json: [], payment_type: 'refund', receipt_number: 'IPDR/1' });
      await service.recordPayment({ admission_id: 'adm-a', payment_type: 'refund', tenders: [{ tender_type: 'cash', amount: 100 }] } as any, orgAUser);
      expect(prisma.ipdPayments.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ amount_paise: -10000 }) }));
      expect(prisma.ipdBills.update).toHaveBeenCalledWith({ where: { id: 'bill-a' }, data: { paid_paise: { increment: -10000 } } });
    });
  });

  describe('finalizeBill / unfinalizeBill', () => {
    it('rejects finalizing an already-finalized bill', async () => {
      prisma.ipdBills.findUnique.mockResolvedValue({ ...billA, status: 'finalized' });
      await expect(service.finalizeBill('bill-a', orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('assigns a gapless bill_number and recomputes gross_paise from the real ledger on finalize', async () => {
      prisma.ipdBills.findUnique.mockResolvedValue(billA);
      prisma.ipdCharges.aggregate.mockResolvedValue({ _sum: { total_paise: 42000 } });
      prisma.ipdBills.update.mockImplementation(({ data }: any) => {
        const updated = { ...billA, ...data };
        // finalizeBill re-fetches via fullBillRow() after update() rather
        // than trusting update()'s own return value -- mirror that real
        // read-after-write by updating what the next findUnique() sees.
        prisma.ipdBills.findUnique.mockResolvedValue({ ...updated, admission: admissionA, package: null, finalized_by: null, charges: [], payments: [] });
        return updated;
      });
      const result = await service.finalizeBill('bill-a', orgAUser);

      expect(prisma.invoiceSequences.upsert).toHaveBeenCalled();
      expect(prisma.ipdBills.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'finalized', gross_paise: 42000 }) }),
      );
      expect(result.status).toBe('finalized');
    });

    it('rejects unfinalizing a bill that is not finalized', async () => {
      prisma.ipdBills.findUnique.mockResolvedValue(billA);
      await expect(service.unfinalizeBill('bill-a', orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('unfinalize reverses a prior package_adjustment and un-marks inclusive charges', async () => {
      prisma.ipdBills.findUnique.mockResolvedValue({ ...billA, status: 'finalized' });
      prisma.ipdCharges.findFirst.mockResolvedValue({ id: 'adj-1', bill_id: 'bill-a' });
      prisma.ipdBills.update.mockImplementation(({ data }: any) => ({ ...billA, ...data, admission: admissionA, package: null, finalized_by: null, charges: [], payments: [] }));
      await service.unfinalizeBill('bill-a', orgAUser);

      expect(prisma.ipdCharges.update).toHaveBeenCalledWith({ where: { id: 'adj-1' }, data: { is_reversed: true } });
      expect(prisma.ipdCharges.updateMany).toHaveBeenCalledWith({ where: { bill_id: 'bill-a', is_package_inclusive: true }, data: { is_package_inclusive: false } });
      expect(prisma.ipdBills.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'open', finalized_at: null, finalized_by_user_id: null }) }),
      );
    });
  });

  describe('finalizeBill — package settlement', () => {
    const pkgBill = { ...billA, package_id: 'pkg-1' };
    const pkg = {
      id: 'pkg-1',
      client_org_id: 'org-a',
      clinic_id: 'clinic-a',
      name: 'Normal Delivery Package',
      price_paise: 5_000_000,
      inclusions: [{ product_id: 'prod-room', max_quantity: null }],
    };

    it('marks only inclusion-matching charges inclusive under bill_extra and posts one signed adjustment line', async () => {
      prisma.ipdBills.findUnique.mockResolvedValue(pkgBill);
      prisma.ipdPackages.findUnique.mockResolvedValue(pkg);
      prisma.ipdBillingSettings.findUnique.mockResolvedValue({ package_excess_policy: 'bill_extra' });
      prisma.ipdCharges.findMany.mockResolvedValue([
        { id: 'c1', product_id: 'prod-room', total_paise: 4_000_000, quantity: 1 },
        { id: 'c2', product_id: 'prod-extra', total_paise: 100_000, quantity: 1 },
      ]);
      prisma.ipdCharges.create.mockResolvedValue({ id: 'adj-1', total_paise: 1_000_000, bill_id: 'bill-a' });
      prisma.ipdCharges.aggregate.mockResolvedValue({ _sum: { total_paise: 5_100_000 } });
      prisma.ipdBills.update.mockImplementation(({ data }: any) => ({ ...pkgBill, ...data, admission: admissionA, package: pkg, finalized_by: null, charges: [], payments: [] }));

      await service.finalizeBill('bill-a', orgAUser);

      expect(prisma.ipdCharges.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['c1'] } }, data: { is_package_inclusive: true } });
      // adjustment = package price (5,000,000) - covered (4,000,000) = 1,000,000
      expect(prisma.ipdCharges.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ charge_type: 'package_adjustment', total_paise: 1_000_000 }) }),
      );
    });

    it('folds every remaining charge into the package under package_excess_policy=absorb', async () => {
      prisma.ipdBills.findUnique.mockResolvedValue(pkgBill);
      prisma.ipdPackages.findUnique.mockResolvedValue(pkg);
      prisma.ipdBillingSettings.findUnique.mockResolvedValue({ package_excess_policy: 'absorb' });
      prisma.ipdCharges.findMany.mockResolvedValue([
        { id: 'c1', product_id: 'prod-room', total_paise: 4_000_000, quantity: 1 },
        { id: 'c2', product_id: 'prod-extra', total_paise: 100_000, quantity: 1 },
      ]);
      prisma.ipdCharges.create.mockResolvedValue({ id: 'adj-1', total_paise: 900_000, bill_id: 'bill-a' });
      prisma.ipdCharges.aggregate.mockResolvedValue({ _sum: { total_paise: 5_000_000 } });
      prisma.ipdBills.update.mockImplementation(({ data }: any) => ({ ...pkgBill, ...data, admission: admissionA, package: pkg, finalized_by: null, charges: [], payments: [] }));

      await service.finalizeBill('bill-a', orgAUser);

      expect(prisma.ipdCharges.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['c1', 'c2'] } }, data: { is_package_inclusive: true } });
    });
  });

  describe('selectPackage', () => {
    it('rejects a package from a different clinic', async () => {
      prisma.ipdPackages.findUnique.mockResolvedValue({ id: 'pkg-1', client_org_id: 'org-a', clinic_id: 'clinic-b', is_deleted: false, is_active: true });
      await expect(service.selectPackage({ admission_id: 'adm-a', package_id: 'pkg-1' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects changing the package on an already-finalized bill', async () => {
      prisma.ipdPackages.findUnique.mockResolvedValue({ id: 'pkg-1', client_org_id: 'org-a', clinic_id: 'clinic-a', is_deleted: false, is_active: true });
      prisma.ipdBills.findUnique.mockResolvedValue({ ...billA, status: 'finalized' });
      await expect(service.selectPackage({ admission_id: 'adm-a', package_id: 'pkg-1' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('reads', () => {
    it('findBillForAdmission creates a bill on first read rather than 404ing', async () => {
      // Two real lookups happen before any bill exists: findBillForAdmission's
      // own existence check, then findOrCreateBillForAdmission's own --
      // both must see null, or create() is skipped. The third call is
      // fullBillRow()'s own read-after-write.
      prisma.ipdBills.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ ...billA, admission: admissionA, package: null, finalized_by: null, charges: [], payments: [] });
      prisma.ipdBills.create.mockResolvedValue(billA);
      const result = await service.findBillForAdmission('adm-a', orgAUser);
      expect(prisma.ipdBills.create).toHaveBeenCalled();
      expect(result.id).toBe('bill-a');
    });

    it('findOne rejects a cross-org bill without confirming it exists', async () => {
      prisma.ipdBills.findUnique.mockResolvedValue({ ...billA, client_org_id: 'org-b' });
      await expect(service.findOne('bill-a', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('exposes balance as gross minus paid, derived, never stored', async () => {
      prisma.ipdBills.findUnique.mockResolvedValue({ ...billA, gross_paise: 100000, paid_paise: 40000, admission: admissionA, package: null, finalized_by: null, charges: [], payments: [] });
      const result = await service.findOne('bill-a', orgAUser);
      expect(result.gross).toBe(1000);
      expect(result.paid).toBe(400);
      expect(result.balance).toBe(600);
    });
  });

  describe('packages', () => {
    it('createPackage rejects a cross-org clinic', async () => {
      prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-b', is_deleted: false, client_org_id: 'org-b' });
      await expect(
        service.createPackage({ clinic_id: 'clinic-b', name: 'X', price: 1000, inclusions: [{ product_id: 'p1' }] } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('createPackage rejects an inclusion referencing a cross-org product', async () => {
      prisma.products.findMany.mockResolvedValue([{ id: 'p1', client_org_id: 'org-b' }]);
      await expect(
        service.createPackage({ clinic_id: 'clinic-a', name: 'X', price: 1000, inclusions: [{ product_id: 'p1' }] } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('removePackage refuses to delete a package selected on an open bill', async () => {
      prisma.ipdPackages.findUnique.mockResolvedValue({ id: 'pkg-1', client_org_id: 'org-a', is_deleted: false });
      prisma.ipdBills.findFirst.mockResolvedValue({ id: 'bill-x' });
      const result = await service.removePackage('pkg-1', orgAUser);
      expect(result.success).toBe(false);
    });
  });

  describe('priceProductForAdmission — the PayerTariffs wiring payoff', () => {
    it('uses the payer tariff over the base price when the admission has a payer', async () => {
      prisma.products.findUnique.mockResolvedValue({ id: 'prod-1', is_deleted: false, price: 100000 });
      prisma.payerTariffs.findUnique.mockResolvedValue({ tariff_price: 80000 });
      const admissionWithPayer = { ...admissionA, payer_id: 'payer-1' };
      const price = await service.priceProductForAdmission('prod-1', admissionWithPayer);
      expect(price).toBe(80000);
    });

    it('falls back to the base price with no payer tariff configured', async () => {
      prisma.products.findUnique.mockResolvedValue({ id: 'prod-1', is_deleted: false, price: 100000 });
      const price = await service.priceProductForAdmission('prod-1', admissionA);
      expect(price).toBe(100000);
    });
  });
});
