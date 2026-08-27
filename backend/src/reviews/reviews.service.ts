import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewFilterInput } from './dto/review-filter.input';
import { CreateReviewInput } from './dto/create-review.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScopeVia } from '../common/scoping/tenant-scope';
import { PatientsService } from '../patients/patients.service';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientsService: PatientsService,
  ) {}

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
        // BUG006 — `: undefined` is NOT a filter in Prisma, so an org-less
        // caller read every tenant's reviews (patient names and free-text
        // comments included).
        ...orgScopeVia(user, 'clinic'),
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

  // P1-06 — the patient-facing submission path. clinician_id/clinic_id are
  // derived from the appointment, never trusted from the client (Hard Rule 6).
  async create(input: CreateReviewInput, user: JwtPayload) {
    const appointment = await this.prisma.appointments.findUnique({ where: { id: input.appointment_id } });
    if (!appointment || appointment.is_deleted) throw new NotFoundException('Appointment not found');

    // Hard Rule 6 — the same ownAndDependantPatientIds() self-scope
    // REQ065 already applies to prescriptions/test-results/patientTimeline;
    // a patient may review their own visit or a genuine dependant's, never
    // an arbitrary appointment_id.
    const allowedPatientIds = await this.patientsService.ownAndDependantPatientIds(user);
    if (!allowedPatientIds.includes(appointment.patient_id)) {
      throw new NotFoundException('Appointment not found');
    }
    if (appointment.status !== 'completed') {
      throw new BadRequestException('You can only review a completed appointment');
    }

    // Pre-check for a clean, specific error; the @@unique(appointment_id)
    // constraint is the real race-safe backstop (see the P2002 catch below)
    // for two genuinely concurrent submissions of the same review.
    const existingReview = await this.prisma.reviews.findUnique({ where: { appointment_id: input.appointment_id } });
    if (existingReview) {
      throw new ConflictException('You have already reviewed this appointment');
    }

    try {
      const row = await this.prisma.reviews.create({
        data: {
          appointment_id: appointment.id,
          patient_id: appointment.patient_id,
          clinician_id: appointment.clinician_id,
          clinic_id: appointment.clinic_id,
          stars: input.stars,
          comment: input.comment,
        },
        include: { patient: true, clinician: true },
      });
      return { success: true, review: this.toGraphQL(row) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('You have already reviewed this appointment');
      }
      throw error;
    }
  }

  // Backs AppointmentsResolver's has_review @ResolveField — a cheap
  // existence check per appointment, called only when a query actually
  // selects the field (GraphQL's own resolve-field laziness), never eagerly
  // on every appointments list. Deliberately ignores is_deleted, matching
  // the real DB-level guarantee create() relies on: @@unique(appointment_id)
  // blocks a second row regardless of the first one's deletion state, so a
  // review an admin moderated away still correctly reads as "already
  // reviewed", not as an invitation to submit a second one.
  async hasReviewForAppointment(appointmentId: string): Promise<boolean> {
    const review = await this.prisma.reviews.findUnique({ where: { appointment_id: appointmentId }, select: { id: true } });
    return !!review;
  }
}
