import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ReviewsResolver } from './reviews.resolver';
import { ReviewsService } from './reviews.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

describe('ReviewsResolver', () => {
  let resolver: ReviewsResolver;
  let service: { findAll: jest.Mock; respondToReview: jest.Mock; remove: jest.Mock; create: jest.Mock };
  const reflector = new Reflector();

  beforeEach(async () => {
    service = { findAll: jest.fn(), respondToReview: jest.fn(), remove: jest.fn(), create: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewsResolver, { provide: ReviewsService, useValue: service }],
    }).compile();
    resolver = module.get(ReviewsResolver);
  });

  describe('role gating (@Auth annotations)', () => {
    it.each([
      ['reviews', ReviewsResolver.prototype.reviews],
      ['respondToReview', ReviewsResolver.prototype.respondToReview],
      ['deleteReview', ReviewsResolver.prototype.deleteReview],
    ])('%s is gated to admin/super_admin/manager', (_name, handler) => {
      expect(reflector.get(ROLES_KEY, handler)).toEqual(['admin', 'super_admin', 'manager']);
    });

    // P1-06 — deliberately NOT admin/manager: this is the caller submitting
    // their own review, not staff moderating one.
    it('submitReview is gated to patient only', () => {
      expect(reflector.get(ROLES_KEY, ReviewsResolver.prototype.submitReview)).toEqual(['patient']);
    });
  });

  describe('argument passthrough', () => {
    it('reviews forwards filter and user', async () => {
      const user = { client_org_id: 'org-a' } as any;
      const filter = { stars: 5 } as any;
      service.findAll.mockResolvedValue([]);
      await resolver.reviews(filter, user);
      expect(service.findAll).toHaveBeenCalledWith(filter, user);
    });

    it('respondToReview forwards id, response, and user', async () => {
      const user = { client_org_id: 'org-a' } as any;
      service.respondToReview.mockResolvedValue({ success: true });
      await resolver.respondToReview('rev-1', 'Thanks!', user);
      expect(service.respondToReview).toHaveBeenCalledWith('rev-1', 'Thanks!', user);
    });

    it('deleteReview forwards id and user', async () => {
      const user = { client_org_id: 'org-a' } as any;
      service.remove.mockResolvedValue({ success: true });
      await resolver.deleteReview('rev-1', user);
      expect(service.remove).toHaveBeenCalledWith('rev-1', user);
    });

    it('submitReview forwards input and user', async () => {
      const user = { patient_id: 'pat-1' } as any;
      const input = { appointment_id: 'appt-1', stars: 5, comment: 'Great' } as any;
      service.create.mockResolvedValue({ success: true });
      await resolver.submitReview(input, user);
      expect(service.create).toHaveBeenCalledWith(input, user);
    });
  });
});
