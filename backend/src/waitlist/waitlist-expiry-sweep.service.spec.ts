import { Test, TestingModule } from '@nestjs/testing';
import { WaitlistExpirySweepService } from './waitlist-expiry-sweep.service';
import { WaitlistService } from './waitlist.service';
import { PrismaService } from '../prisma/prisma.service';

// REQ106
describe('WaitlistExpirySweepService', () => {
  let service: WaitlistExpirySweepService;
  let prisma: { waitlistEntries: { findMany: jest.Mock; update: jest.Mock } };
  let waitlistService: { promoteNext: jest.Mock };

  const staleEntry = {
    id: 'entry-1', clinician_id: 'clinician-a', waitlist_date: new Date('2026-09-01T00:00:00.000Z'),
    status: 'notified', claim_expires_at: new Date('2026-08-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = { waitlistEntries: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() } };
    waitlistService = { promoteNext: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitlistExpirySweepService,
        { provide: PrismaService, useValue: prisma },
        { provide: WaitlistService, useValue: waitlistService },
      ],
    }).compile();
    service = module.get(WaitlistExpirySweepService);
  });

  it('queries only notified rows with a lapsed claim_expires_at', async () => {
    await service.sweepExpiredClaims();
    expect(prisma.waitlistEntries.findMany).toHaveBeenCalledWith({
      where: { status: 'notified', claim_expires_at: { lt: expect.any(Date) } },
    });
  });

  it('leaves a non-expired entry alone', async () => {
    prisma.waitlistEntries.findMany.mockResolvedValue([]);
    await service.sweepExpiredClaims();
    expect(prisma.waitlistEntries.update).not.toHaveBeenCalled();
    expect(waitlistService.promoteNext).not.toHaveBeenCalled();
  });

  it('expires a stale notified entry and promotes the next one in that clinician/date\'s queue', async () => {
    prisma.waitlistEntries.findMany.mockResolvedValue([staleEntry]);
    await service.sweepExpiredClaims();
    expect(prisma.waitlistEntries.update).toHaveBeenCalledWith({ where: { id: 'entry-1' }, data: { status: 'expired' } });
    expect(waitlistService.promoteNext).toHaveBeenCalledWith('clinician-a', staleEntry.waitlist_date);
  });
});
