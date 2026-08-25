import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

// REQ016 (US-CAT-05) — "given a price change with an effective-from date in
// the future, when that date arrives, then the new price takes effect
// automatically." Hourly sweep, same @Cron pattern as NoShowSweepService/
// ScheduledReportsService/WebhookDispatchService. Only ever touches rows
// this codebase itself created via recordPriceChangeIfNeeded() with
// applied: false -- there is no external write path to PriceHistory.
@Injectable()
export class PriceHistorySweepService {
  private readonly logger = new Logger(PriceHistorySweepService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 * * * *')
  async sweep() {
    const due = await this.prisma.priceHistory.findMany({
      where: { applied: false, effective_from: { lte: new Date() } },
    });

    for (const change of due) {
      try {
        await this.prisma.$transaction([
          this.prisma.products.update({ where: { id: change.product_id }, data: { price: change.new_price } }),
          this.prisma.priceHistory.update({ where: { id: change.id }, data: { applied: true } }),
        ]);
      } catch (err) {
        this.logger.error(`Failed to apply due price change ${change.id} for product ${change.product_id}: ${(err as Error).message}`);
      }
    }
  }
}
