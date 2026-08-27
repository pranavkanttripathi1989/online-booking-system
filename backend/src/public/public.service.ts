import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PublicClinicianSearchInput, BookPatientAppointmentInput } from './dto/public.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { SlotHoldsService } from '../slot-holds/slot-holds.service';

const PAISE_TO_RUPEES = (paise?: number | null) => (paise == null ? undefined : paise / 100);

// P1-05 — same constraint names as appointments.service.ts's own
// OVERLAP_CONSTRAINT_NAMES (not shared/exported, matching this pair's
// existing "two dialects, deliberately separate implementations" precedent).
const OVERLAP_CONSTRAINT_NAMES = ['appointments_no_overlapping_booking', 'appointments_no_overlapping_room_booking'];

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slotHoldsService: SlotHoldsService,
  ) {}

  // P1-05 (BOOK-2) — camelCase args (date + startTime, not a single ISO
  // datetime) to match this dialect's own booking/index.jsx wire shape.
  holdSlot(clinicianId: string, date: string, startTime: string) {
    return this.slotHoldsService.holdSlot(clinicianId, new Date(`${date}T${startTime}:00.000Z`).toISOString());
  }

  async releaseSlot(clinicianId: string, date: string, startTime: string, holdToken: string): Promise<boolean> {
    await this.slotHoldsService.releaseSlot(clinicianId, new Date(`${date}T${startTime}:00.000Z`).toISOString(), holdToken);
    return true;
  }

  private async ratingFor(clinicianId: string) {
    const agg = await this.prisma.reviews.aggregate({
      where: { clinician_id: clinicianId, is_deleted: false },
      _avg: { stars: true },
      _count: { stars: true },
    });
    return { rating: agg._avg.stars ?? undefined, reviews: agg._count.stars };
  }

  // P3.4: getClinicians() used to call ratingFor() once per clinician in a
  // map -- one reviews.aggregate() round-trip per row, N+1 on every listing
  // request. groupBy does it in a single query; a clinician with zero
  // reviews (absent from the groupBy result, not a zero-row group) still
  // gets a defined {rating: undefined, reviews: 0} via the Map's default.
  private async ratingsFor(clinicianIds: string[]) {
    if (clinicianIds.length === 0) return new Map<string, { rating?: number; reviews: number }>();
    const groups = await this.prisma.reviews.groupBy({
      by: ['clinician_id'],
      where: { clinician_id: { in: clinicianIds }, is_deleted: false },
      _avg: { stars: true },
      _count: { stars: true },
    });
    const byClinicianId = new Map(
      groups.map((g) => [g.clinician_id, { rating: g._avg.stars ?? undefined, reviews: g._count.stars }]),
    );
    return clinicianIds.reduce((map, id) => {
      map.set(id, byClinicianId.get(id) ?? { rating: undefined, reviews: 0 });
      return map;
    }, new Map<string, { rating?: number; reviews: number }>());
  }

  async getClinicians(search: PublicClinicianSearchInput | undefined) {
    const clinicians = await this.prisma.clinicians.findMany({
      where: {
        is_deleted: false,
        is_active: true,
        clinic: search?.city ? { city: { contains: search.city, mode: 'insensitive' } } : undefined,
        clinician_type: search?.specialty ? { contains: search.specialty, mode: 'insensitive' } : undefined,
        clinicianLanguages: search?.language
          ? { some: { language: { name: { contains: search.language, mode: 'insensitive' } }, is_deleted: false } }
          : undefined,
      },
      include: {
        clinic: true,
        clinicianLanguages: { where: { is_deleted: false }, include: { language: true } },
        clinicianServices: { where: { is_deleted: false }, include: { product: true } },
      },
    });

    const ratings = await this.ratingsFor(clinicians.map((c) => c.id));

    return clinicians.map((c) => {
      const { rating, reviews } = ratings.get(c.id) ?? { rating: undefined, reviews: 0 };
      const prices = c.clinicianServices.map((cs) => cs.product.price).filter((p): p is number => p != null);
      return {
        id: c.id,
        name: `${c.first_name} ${c.last_name}`,
        specialty: c.clinician_type,
        clinic: c.clinic?.name,
        rating,
        reviews,
        price: prices.length ? PAISE_TO_RUPEES(Math.min(...prices)) : undefined,
        languages: c.clinicianLanguages.map((cl) => cl.language.name),
        bio: c.bio ?? undefined,
        initials: `${c.first_name[0] ?? ''}${c.last_name[0] ?? ''}`.toUpperCase(),
        videoEnabled: true,
        verified: c.is_active,
      };
    });
  }

  async getClinician(id: string) {
    const c = await this.prisma.clinicians.findUnique({
      where: { id },
      include: {
        clinic: true,
        clinicianLanguages: { where: { is_deleted: false }, include: { language: true } },
        clinicianServices: { where: { is_deleted: false }, include: { product: true } },
      },
    });
    if (!c || c.is_deleted) throw new NotFoundException('Clinician not found');
    const { rating, reviews } = await this.ratingFor(c.id);
    return {
      id: c.id,
      name: `${c.first_name} ${c.last_name}`,
      email: c.email,
      clinicianType: c.clinician_type,
      bio: c.bio ?? undefined,
      clinic: c.clinic ? { id: c.clinic.id, name: c.clinic.name, address: c.clinic.address } : undefined,
      languages: c.clinicianLanguages.map((cl) => ({ id: cl.language.id, name: cl.language.name })),
      products: c.clinicianServices.map((cs) => ({
        id: cs.product.id,
        name: cs.product.name,
        description: cs.product.description,
        price: PAISE_TO_RUPEES(cs.product.price),
      })),
      education: [],
      rating,
      reviews,
    };
  }

  async getProducts(clinicianId: string) {
    const services = await this.prisma.clinicianServices.findMany({
      where: { clinician_id: clinicianId, is_deleted: false },
      include: {
        product: {
          include: {
            variations: { where: { is_deleted: false } },
            cancellationRules: { where: { is_deleted: false } },
          },
        },
      },
    });
    return services.map((cs) => ({
      id: cs.product.id,
      name: cs.product.name,
      description: cs.product.description,
      price: PAISE_TO_RUPEES(cs.product.price),
      product_type: cs.product.product_type,
      variations: cs.product.variations.map((v) => ({ id: v.id, name: v.variation_name, price: PAISE_TO_RUPEES(v.price) })),
      cancellation_rules: cs.product.cancellationRules.map((r) => ({ id: r.id, hoursNoticeRequired: r.hours_before_appointment })),
    }));
  }

  async getAppointments(clinicianId: string, date: string) {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    const rows = await this.prisma.appointments.findMany({
      where: {
        clinician_id: clinicianId,
        is_deleted: false,
        status: { notIn: ['cancelled', 'no_show'] },
        appointment_time: { gte: dayStart, lte: dayEnd },
      },
    });
    const booked = rows.map((a) => ({
      id: a.id,
      startTime: a.appointment_time,
      endTime: new Date(a.appointment_time.getTime() + a.duration_minutes * 60000),
    }));
    // P1-05 (BOOK-2) — a slot someone else is actively holding reads as
    // unavailable here too, the same list booking/index.jsx already
    // disables a slot button from (existingApps.includes(slot)) — no
    // frontend change needed to hide a held slot, only to show *why*.
    const heldIso = await this.slotHoldsService.listHeldStartTimesForDay(clinicianId, dayStart.toISOString(), dayEnd.toISOString());
    const held = heldIso.map((iso) => {
      const start = new Date(iso);
      return { id: `held:${iso}`, startTime: start, endTime: new Date(start.getTime() + 30 * 60000) };
    });
    return [...booked, ...held];
  }

  // SECURITY: getAppointment previously had no ownership check at all -- the
  // resolver requires login but never received the caller's identity, so any
  // authenticated user (any patient, any role) could view any appointment's
  // detail (patient name, clinician, video-call timing/type) just by knowing
  // or guessing its id. Backs video/index.jsx's join page, where an
  // appointment id is realistically shared via a URL, making this a real
  // enumeration/leaked-link vector, not just a theoretical one.
  async getAppointment(id: string, user: JwtPayload) {
    const a = await this.prisma.appointments.findUnique({ where: { id }, include: { clinician: { include: { clinic: true } }, patient: true } });
    if (!a || a.is_deleted) throw new NotFoundException('Appointment not found');
    const isParticipant = a.patient_id === user.patient_id || a.clinician_id === user.clinician_id;
    // Front-desk/management roles legitimately need org-wide visibility for
    // scheduling/support; a *clinician* who isn't this appointment's treating
    // clinician does NOT get in via this branch -- they're covered (or not)
    // by isParticipant above, same self-scoping boundary as everywhere else.
    const isOrgStaff = !user.roles.includes('clinician') && !!user.client_org_id && a.clinician.clinic?.client_org_id === user.client_org_id;
    const isPlatformAdmin = !user.client_org_id && (user.roles.includes('admin') || user.roles.includes('super_admin'));
    if (!isParticipant && !isOrgStaff && !isPlatformAdmin) {
      throw new NotFoundException('Appointment not found');
    }
    return {
      id: a.id,
      startTime: a.appointment_time,
      endTime: new Date(a.appointment_time.getTime() + a.duration_minutes * 60000),
      type: a.type ?? 'in_person',
      status: a.status,
      clinician: { id: a.clinician.id, name: `${a.clinician.first_name} ${a.clinician.last_name}`, clinicianType: a.clinician.clinician_type },
      patient: { id: a.patient.id, firstName: a.patient.first_name, lastName: a.patient.last_name },
    };
  }

  async bookPatientAppointment(input: BookPatientAppointmentInput) {
    // P1-05 (BOOK-3) — see AppointmentsService.create()'s identical
    // pre-check for the full reasoning; this is its public-dialect twin.
    if (input.idempotencyKey) {
      const existingKey = await this.prisma.appointmentIdempotencyKeys.findUnique({
        where: { idempotency_key: input.idempotencyKey },
      });
      if (existingKey) {
        return { id: existingKey.appointment_id };
      }
    }
    const clinician = await this.prisma.clinicians.findUnique({ where: { id: input.clinicianId } });
    if (!clinician) throw new BadRequestException('Clinician not found');

    const variation = input.variationId ? await this.prisma.productVariations.findUnique({ where: { id: input.variationId } }) : null;
    const product = await this.prisma.products.findUnique({ where: { id: input.productId } });
    if (!product) throw new BadRequestException('Product not found');
    const durationMinutes = variation?.duration_minutes ?? product.duration_minutes ?? 30;

    const start = new Date(`${input.date}T${input.startTime}:00.000Z`);

    let patientId = input.patientId;
    if (!patientId) {
      if (!input.patientDetails) throw new BadRequestException('patientId or patientDetails is required');
      const existing = await this.prisma.patients.findFirst({ where: { email: input.patientDetails.email } });
      if (existing) {
        patientId = existing.id;
      } else {
        const created = await this.prisma.patients.create({
          data: {
            first_name: input.patientDetails.firstName,
            last_name: input.patientDetails.lastName,
            email: input.patientDetails.email,
            phone: input.patientDetails.phone,
            address: '',
            date_of_birth: new Date('2000-01-01'),
          },
        });
        patientId = created.id;
      }
    }

    // REQ017: this public/patient-self-serve dialect has its own, separate
    // appointment-creation path from AppointmentsService.create() (the
    // canonical staff-facing dialect) — see CLAUDE.md's note on the two
    // dialects being kept deliberately separate. Session/token mode is
    // duplicated here rather than extracted into a shared service, matching
    // that same established precedent (the two dialects already don't share
    // implementation, only the underlying Appointments table).
    const dow = start.getUTCDay();
    const hh = String(start.getUTCHours()).padStart(2, '0');
    const mm = String(start.getUTCMinutes()).padStart(2, '0');
    const sessionWindow = await this.prisma.clinicianAvailability.findFirst({
      where: {
        clinician_id: input.clinicianId,
        is_deleted: false,
        is_active: true,
        mode: { in: ['session', 'hybrid'] },
        start_time: `${hh}:${mm}`,
        OR: [{ day_of_week: dow }, { recurrence_type: 'daily' }],
      },
    });
    const bookingMode = sessionWindow?.mode ?? 'slot';

    if (bookingMode === 'slot') {
      const conflict = await this.prisma.appointments.findFirst({
        where: {
          clinician_id: input.clinicianId,
          is_deleted: false,
          status: { notIn: ['cancelled', 'no_show'] },
          booking_mode: 'slot',
          appointment_time: start,
        },
      });
      if (conflict) throw new BadRequestException('This time slot is no longer available');
    }

    const room = sessionWindow?.room_id
      ? await this.prisma.rooms.findUnique({ where: { id: sessionWindow.room_id } })
      : await this.prisma.rooms.findFirst({ where: { clinic_id: clinician.clinic_id, is_active: true, is_deleted: false } });
    if (!room) throw new BadRequestException('No active room available at this clinic');

    let appointment;
    try {
      appointment = await this.prisma.$transaction(async (tx) => {
        let tokenNo: number | undefined;
        if (bookingMode !== 'slot' && sessionWindow) {
          const lockKey = `${input.clinicianId}|${start.toISOString()}`;
          await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', lockKey);
          const bookedCount = await tx.appointments.count({
            where: {
              clinician_id: input.clinicianId,
              is_deleted: false,
              status: { notIn: ['cancelled', 'no_show'] },
              booking_mode: { not: 'slot' },
              appointment_time: start,
            },
          });
          const totalAllowed = (sessionWindow.capacity ?? 0) + sessionWindow.overbook_allowance;
          if (bookedCount >= totalAllowed) throw new BadRequestException('This session is fully booked');
          tokenNo = bookedCount + 1;
        }
        const created = await tx.appointments.create({
          data: {
            clinic_id: clinician.clinic_id,
            room_id: room.id,
            clinician_id: input.clinicianId,
            patient_id: patientId,
            appointment_date: new Date(input.date),
            appointment_time: start,
            duration_minutes: durationMinutes,
            status: 'scheduled',
            reason: '',
            product_id: input.productId,
            product_variation_id: input.variationId ?? undefined,
            type: input.type ?? 'in_person',
            booking_mode: bookingMode,
            token_no: tokenNo,
          },
        });
        // P1-05 (BOOK-3) — see AppointmentsService.create()'s identical
        // in-transaction write for the full reasoning.
        if (input.idempotencyKey) {
          await tx.appointmentIdempotencyKeys.create({
            data: { idempotency_key: input.idempotencyKey, appointment_id: created.id },
          });
        }
        return created;
      });
    } catch (error) {
      // P1-05 — checked for ANY transaction failure, not just a P2002 on
      // the key's own uniqueness; see AppointmentsService.create()'s
      // identical catch block for the full reasoning (two concurrent
      // requests for the same new slot most often lose to the EXCLUDE
      // constraint below, not the key insert).
      if (input.idempotencyKey) {
        const winner = await this.prisma.appointmentIdempotencyKeys.findUnique({ where: { idempotency_key: input.idempotencyKey } });
        if (winner) return { id: winner.appointment_id };
      }
      if (error instanceof Prisma.PrismaClientUnknownRequestError && OVERLAP_CONSTRAINT_NAMES.some((name) => error.message.includes(name))) {
        throw new BadRequestException('This time slot is no longer available');
      }
      throw error;
    }
    if (input.holdToken) {
      await this.slotHoldsService.consumeIfOwned(input.clinicianId, start.toISOString(), input.holdToken);
    }
    return { id: appointment.id };
  }

  // createPaymentTransaction removed (REQ004) — see public.resolver.ts's
  // comment at the same call site for why, and appointment-payments/ for
  // the real replacement.
}
