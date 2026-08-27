import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SlotHoldsService } from './slot-holds.service';
import { REDIS_CLIENT } from '../redis/redis.module';

describe('SlotHoldsService', () => {
  let service: SlotHoldsService;
  let redis: { set: jest.Mock; get: jest.Mock; del: jest.Mock; scan: jest.Mock };

  beforeEach(async () => {
    redis = { set: jest.fn(), get: jest.fn(), del: jest.fn(), scan: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [SlotHoldsService, { provide: REDIS_CLIENT, useValue: redis }],
    }).compile();
    service = module.get(SlotHoldsService);
  });

  describe('holdSlot', () => {
    it('acquires the hold via SET NX and returns a token and expiry', async () => {
      redis.set.mockResolvedValue('OK');
      const result = await service.holdSlot('cln-1', '2026-10-15T09:00:00.000Z');
      expect(redis.set).toHaveBeenCalledWith('slot-hold:cln-1:2026-10-15T09:00:00.000Z', expect.any(String), 'EX', 600, 'NX');
      expect(result.holdToken).toEqual(expect.any(String));
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('rejects when the slot is already held by someone else (SET NX fails)', async () => {
      redis.set.mockResolvedValue(null);
      await expect(service.holdSlot('cln-1', '2026-10-15T09:00:00.000Z')).rejects.toThrow(BadRequestException);
    });

    it('two holds for the same clinician/time never both succeed (mirrors SET NX\'s own atomicity)', async () => {
      redis.set.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);
      await service.holdSlot('cln-1', '2026-10-15T09:00:00.000Z');
      await expect(service.holdSlot('cln-1', '2026-10-15T09:00:00.000Z')).rejects.toThrow('currently held');
    });
  });

  describe('releaseSlot', () => {
    it('deletes the key when the current value matches the given token', async () => {
      redis.get.mockResolvedValue('tok-1');
      await service.releaseSlot('cln-1', '2026-10-15T09:00:00.000Z', 'tok-1');
      expect(redis.del).toHaveBeenCalledWith('slot-hold:cln-1:2026-10-15T09:00:00.000Z');
    });

    it('never deletes when the token does not match (a late release cannot steal back a slot someone else already acquired)', async () => {
      redis.get.mockResolvedValue('someone-elses-token');
      await service.releaseSlot('cln-1', '2026-10-15T09:00:00.000Z', 'tok-1');
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('is a no-op when nothing is held', async () => {
      redis.get.mockResolvedValue(null);
      await service.releaseSlot('cln-1', '2026-10-15T09:00:00.000Z', 'tok-1');
      expect(redis.del).not.toHaveBeenCalled();
    });
  });

  describe('consumeIfOwned', () => {
    it('releases when a token is given', async () => {
      redis.get.mockResolvedValue('tok-1');
      await service.consumeIfOwned('cln-1', '2026-10-15T09:00:00.000Z', 'tok-1');
      expect(redis.del).toHaveBeenCalled();
    });

    it('is silently a no-op when no token is given (booking succeeded without ever holding)', async () => {
      await service.consumeIfOwned('cln-1', '2026-10-15T09:00:00.000Z', undefined);
      expect(redis.get).not.toHaveBeenCalled();
    });
  });

  describe('listHeldStartTimesForDay', () => {
    it('scans via SCAN (never KEYS) and returns start times within the given day window', async () => {
      redis.scan
        .mockResolvedValueOnce(['5', ['slot-hold:cln-1:2026-10-15T09:00:00.000Z', 'slot-hold:cln-1:2026-10-16T09:00:00.000Z']])
        .mockResolvedValueOnce(['0', ['slot-hold:cln-1:2026-10-15T10:00:00.000Z']]);
      const result = await service.listHeldStartTimesForDay('cln-1', '2026-10-15T00:00:00.000Z', '2026-10-15T23:59:59.999Z');
      expect(result).toEqual(['2026-10-15T09:00:00.000Z', '2026-10-15T10:00:00.000Z']);
      expect(redis.scan).toHaveBeenCalledWith('0', 'MATCH', 'slot-hold:cln-1:*', 'COUNT', 100);
    });

    it('returns an empty list when nothing is held', async () => {
      redis.scan.mockResolvedValue(['0', []]);
      const result = await service.listHeldStartTimesForDay('cln-1', '2026-10-15T00:00:00.000Z', '2026-10-15T23:59:59.999Z');
      expect(result).toEqual([]);
    });
  });
});
