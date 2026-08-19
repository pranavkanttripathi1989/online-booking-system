import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: {
    reviews: { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  };

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u2', roles: ['admin'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  const scopedReview = {
    id: 'rev-a1',
    is_deleted: false,
    stars: 5,
    comment: 'Great',
    response: null,
    created_at: new Date(),
    patient: { first_name: 'Priya', last_name: 'Shah' },
    clinician: { first_name: 'Dr', last_name: 'Rao' },
    clinic: { id: 'clinic-a', client_org_id: 'org-a' },
  };
  const otherOrgReview = { ...scopedReview, id: 'rev-b1', clinic: { id: 'clinic-b', client_org_id: 'org-b' } };

  beforeEach(async () => {
    prisma = { reviews: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() } };
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ReviewsService);
  });

  describe('findAll — tenant isolation + shaping', () => {
    it('scopes to the caller org via the clinic relation', async () => {
      prisma.reviews.findMany.mockResolvedValue([]);
      await service.findAll(undefined, orgAUser);
      expect(prisma.reviews.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clinic: { client_org_id: 'org-a' } }) }),
      );
    });

    it('does not scope by org for a platform-wide caller', async () => {
      prisma.reviews.findMany.mockResolvedValue([]);
      await service.findAll(undefined, platformUser);
      expect(prisma.reviews.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clinic: undefined }) }),
      );
    });

    it('applies a stars filter when given', async () => {
      prisma.reviews.findMany.mockResolvedValue([]);
      await service.findAll({ stars: 5 } as any, orgAUser);
      expect(prisma.reviews.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ stars: 5 }) }),
      );
    });

    it('builds a case-insensitive OR search across comment and patient name', async () => {
      prisma.reviews.findMany.mockResolvedValue([]);
      await service.findAll({ search: 'great' } as any, orgAUser);
      const call = prisma.reviews.findMany.mock.calls[0][0];
      expect(call.where.OR).toEqual([
        { comment: { contains: 'great', mode: 'insensitive' } },
        { patient: { first_name: { contains: 'great', mode: 'insensitive' } } },
        { patient: { last_name: { contains: 'great', mode: 'insensitive' } } },
      ]);
    });

    it('shapes patient_name/clinician_name from the related records', async () => {
      prisma.reviews.findMany.mockResolvedValue([scopedReview]);
      const [result] = await service.findAll(undefined, orgAUser);
      expect(result.patient_name).toBe('Priya Shah');
      expect(result.clinician_name).toBe('Dr Rao');
    });

    it('omits clinician_name when the review has no clinician', async () => {
      prisma.reviews.findMany.mockResolvedValue([{ ...scopedReview, clinician: null }]);
      const [result] = await service.findAll(undefined, orgAUser);
      expect(result.clinician_name).toBeUndefined();
    });
  });

  describe('respondToReview — tenant isolation', () => {
    it('rejects when the review does not exist', async () => {
      prisma.reviews.findUnique.mockResolvedValue(null);
      await expect(service.respondToReview('missing', 'Thanks!', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects a soft-deleted review', async () => {
      prisma.reviews.findUnique.mockResolvedValue({ ...scopedReview, is_deleted: true });
      await expect(service.respondToReview('rev-a1', 'Thanks!', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects a cross-org response without ever calling update', async () => {
      prisma.reviews.findUnique.mockResolvedValue(otherOrgReview);
      await expect(service.respondToReview('rev-b1', 'Thanks!', orgAUser)).rejects.toThrow(NotFoundException);
      expect(prisma.reviews.update).not.toHaveBeenCalled();
    });

    it('writes the response with a responded_at timestamp for a same-org review', async () => {
      prisma.reviews.findUnique.mockResolvedValue(scopedReview);
      prisma.reviews.update.mockResolvedValue({ ...scopedReview, response: 'Thanks!' });
      const result = await service.respondToReview('rev-a1', 'Thanks!', orgAUser);
      expect(prisma.reviews.update).toHaveBeenCalledWith({
        where: { id: 'rev-a1' },
        data: { response: 'Thanks!', responded_at: expect.any(Date) },
        include: { patient: true, clinician: true },
      });
      expect(result).toEqual({ success: true, review: expect.objectContaining({ response: 'Thanks!' }) });
    });
  });

  describe('remove — tenant isolation', () => {
    it('rejects when the review does not exist', async () => {
      prisma.reviews.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects a cross-org delete without ever calling update', async () => {
      prisma.reviews.findUnique.mockResolvedValue(otherOrgReview);
      await expect(service.remove('rev-b1', orgAUser)).rejects.toThrow(NotFoundException);
      expect(prisma.reviews.update).not.toHaveBeenCalled();
    });

    it('soft-deletes a same-org review', async () => {
      prisma.reviews.findUnique.mockResolvedValue(scopedReview);
      prisma.reviews.update.mockResolvedValue({ ...scopedReview, is_deleted: true });
      const result = await service.remove('rev-a1', orgAUser);
      expect(prisma.reviews.update).toHaveBeenCalledWith({ where: { id: 'rev-a1' }, data: { is_deleted: true } });
      expect(result).toEqual({ success: true });
    });
  });
});
