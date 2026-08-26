import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WaitlistService } from './waitlist.service';

// REQ106 — a `notified` entry whose 30-minute claim window has lapsed with
// no booking made is expired, and the next waiting entry (if any) for that
// same clinician/date is promoted — reusing WaitlistService#promoteNext,
// the exact same logic transitionStatus's own cancellation path calls, so
// "who gets notified next" has one implementation regardless of caller.
@Injectable()
export class WaitlistExpirySweepService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly waitlistService: WaitlistService,
  ) {}

  @Cron('*/5 * * * *')
  async sweepExpiredClaims() {
    const stale = await this.prisma.waitlistEntries.findMany({
      where: { status: 'notified', claim_expires_at: { lt: new Date() } },
    });
    for (const entry of stale) {
      await this.prisma.waitlistEntries.update({ where: { id: entry.id }, data: { status: 'expired' } });
      await this.waitlistService.promoteNext(entry.clinician_id, entry.waitlist_date);
    }
  }
}
