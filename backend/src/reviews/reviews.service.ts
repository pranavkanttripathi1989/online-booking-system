import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewFilterInput } from './dto/review-filter.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(r: any) {
    return {
      id: r.id,
      patient_name: `${r.patient.first_name} ${r.patient.last_name}`,
      clinician_name: r.clinician ? `${r.clinician.first_name} ${r.clinician.last_name}` : undefined,
      stars: r.stars,
      comment: r.comment,
      response: r.response ?? undefined,
      created_at: r.created_at,
    };
  }

  async findAll(filter: ReviewFilterInput | undefined, user: JwtPayload) {
    const rows = await this.prisma.reviews.findMany({
      where: {
        is_deleted: false,
        stars: filter?.stars ?? undefined,
        clinic: user.client_org_id ? { client_org_id: user.client_org_id } : undefined,
        ...(filter?.search
          ? {
              OR: [
                { comment: { contains: filter.search, mode: 'insensitive' as const } },
                { patient: { first_name: { contains: filter.search, mode: 'insensitive' as const } } },
                { patient: { last_name: { contains: filter.search, mode: 'insensitive' as const } } },
              ],
            }
          : {}),
      },
      include: { patient: true, clinician: true },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => this.toGraphQL(r));
  }

  async respondToReview(id: string, response: string, user: JwtPayload) {
    const existing = await this.prisma.reviews.findUnique({ where: { id }, include: { clinic: true } });
    if (!existing || existing.is_deleted) throw new NotFoundException('Review not found');
    if (user.client_org_id && existing.clinic && existing.clinic.client_org_id !== user.client_org_id) {
      throw new NotFoundException('Review not found');
    }
    const row = await this.prisma.reviews.update({
      where: { id },
      data: { response, responded_at: new Date() },
      include: { patient: true, clinician: true },
    });
    return { success: true, review: this.toGraphQL(row) };
  }

  async remove(id: string, user: JwtPayload) {
    const existing = await this.prisma.reviews.findUnique({ where: { id }, include: { clinic: true } });
    if (!existing || existing.is_deleted) throw new NotFoundException('Review not found');
    if (user.client_org_id && existing.clinic && existing.clinic.client_org_id !== user.client_org_id) {
      throw new NotFoundException('Review not found');
    }
    await this.prisma.reviews.update({ where: { id }, data: { is_deleted: true } });
    return { success: true };
  }
}
