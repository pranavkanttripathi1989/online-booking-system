import { Test, TestingModule } from '@nestjs/testing';
import { PriceHistorySweepService } from './price-history-sweep.service';
import { PrismaService } from '../prisma/prisma.service';

// REQ016 (US-CAT-05) — the cron half of the deferred-price-change design:
// "when that [effective_from] date arrives, the new price takes effect
// automatically."
describe('PriceHistorySweepService', () => {
  let service: PriceHistorySweepService;
  let prisma: {
    priceHistory: { findMany: jest.Mock; update: jest.Mock };
    products: { update: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      priceHistory: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
      products: { update: jest.fn() },
      $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [PriceHistorySweepService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(PriceHistorySweepService);
  });

  it('does nothing when no price changes are due', async () => {
    await service.sweep();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('only queries changes that are applied:false and past their effective_from', async () => {
    await service.sweep();
    expect(prisma.priceHistory.findMany).toHaveBeenCalledWith({
      where: { applied: false, effective_from: { lte: expect.any(Date) } },
    });
  });

  it('applies a due change: updates the product price and marks the row applied', async () => {
    prisma.priceHistory.findMany.mockResolvedValue([
      { id: 'ph-1', product_id: 'prod-1', new_price: 20000 },
    ]);
    await service.sweep();
    expect(prisma.products.update).toHaveBeenCalledWith({ where: { id: 'prod-1' }, data: { price: 20000 } });
    expect(prisma.priceHistory.update).toHaveBeenCalledWith({ where: { id: 'ph-1' }, data: { applied: true } });
  });

  it('continues to the next change if one transaction fails', async () => {
    prisma.priceHistory.findMany.mockResolvedValue([
      { id: 'ph-1', product_id: 'prod-1', new_price: 20000 },
      { id: 'ph-2', product_id: 'prod-2', new_price: 30000 },
    ]);
    prisma.$transaction.mockRejectedValueOnce(new Error('db error')).mockResolvedValueOnce([]);
    await expect(service.sweep()).resolves.not.toThrow();
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });
});
