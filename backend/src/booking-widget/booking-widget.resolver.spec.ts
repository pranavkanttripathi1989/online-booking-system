import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { BookingWidgetResolver } from './booking-widget.resolver';
import { BookingWidgetService } from './booking-widget.service';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';

describe('BookingWidgetResolver', () => {
  let resolver: BookingWidgetResolver;
  let service: { isOriginAllowed: jest.Mock };
  const reflector = new Reflector();

  beforeEach(async () => {
    service = { isOriginAllowed: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [BookingWidgetResolver, { provide: BookingWidgetService, useValue: service }],
    }).compile();
    resolver = module.get(BookingWidgetResolver);
  });

  // REQ105 — this mutation has no ambient caller identity to gate on; it
  // must be genuinely @Public(), not merely un-role-gated.
  describe('validateBookingWidgetEmbed', () => {
    it('is marked @Public()', () => {
      const isPublic = reflector.get(IS_PUBLIC_KEY, BookingWidgetResolver.prototype.validateBookingWidgetEmbed);
      expect(isPublic).toBe(true);
    });

    it('delegates to service.isOriginAllowed with the given slug and origin', async () => {
      service.isOriginAllowed.mockResolvedValue(true);
      const result = await resolver.validateBookingWidgetEmbed('slug-a', 'https://a.test');
      expect(service.isOriginAllowed).toHaveBeenCalledWith('slug-a', 'https://a.test');
      expect(result).toBe(true);
    });

    it('returns false through when the service does', async () => {
      service.isOriginAllowed.mockResolvedValue(false);
      const result = await resolver.validateBookingWidgetEmbed('slug-a', 'https://evil.test');
      expect(result).toBe(false);
    });
  });
});
