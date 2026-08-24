import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { resolveServicePrice } from '../common/pricing/resolve-price';
import { AppointmentFiltersInput } from './dto/appointment-filters.input';
import { AppointmentInput, AppointmentUpdateInput } from './dto/appointment.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScopeVia } from '../common/scoping/tenant-scope';
import { PUB_SUB } from '../common/pubsub.provider';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { QueueService } from '../queue/queue.service';
import { PatientsService } from '../patients/patients.service';

export const APPOINTMENT_UPDATED_EVENT = 'appointmentUpdated';

// P3.1/F-16: matches the two constraint names in
// 20260823030000_appointments_no_overlap_exclusion_constraint/migration.sql
// (clinician) and 20260823031500_...room_exclusion_constraint/migration.sql
// (room) exactly -- assertSlotFree() below still runs first (fails fast,
// gives a clean message for the common case), but these constraints are
// what actually close the race: two requests can both pass that check
// before either writes, since it's a separate statement from the insert.
// Postgres surfaces an exclusion violation as error code 23P01, which
// Prisma does not map to one of its own known error codes -- it arrives as
// a PrismaClientUnknownRequestError with the raw driver message, matched
// here by constraint name rather than parsing the SQLSTATE out of free text.
const OVERLAP_CONSTRAINT_NAMES = [
  'appointments_no_overlapping_booking',
  'appointments_no_overlapping_room_booking',
  // REQ017 US-CAL-05 — resource-level exclusion constraint on the new
  // AppointmentResources join table, same friendly-error mapping.
  'appointment_resources_no_overlap',
];

const PAISE_TO_RUPEES = (paise?: number | null) => (paise == null ? undefined : paise / 100);

const INCLUDE = {
  clinic: true,
  room: true,
  clinician: true,
  patient: true,
  product: true,
  booked_by_user: true,
};

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
    private readonly notificationTrigger: NotificationTriggerService,
    private readonly queueService: QueueService,
    private readonly patientsService: PatientsService,
  ) {}

  // REQ008/PLAN017 — notify the clinician's own login account, if linked.
  // An unlinked clinician (no UserProfiles row pointing at them yet) is
  // skipped silently, same as every other unlinked-account case elsewhere
  // in this codebase — not an error, just nothing to notify.
  private async notifyLinkedProfile(kind: 'clinician_id' | 'patient_id', id: string, eventType: string, payload: Parameters<NotificationTriggerService['dispatch']>[2]) {
    const profile = await this.prisma.userProfiles.findFirst({ where: { [kind]: id, is_deleted: false } });
    if (profile) await this.notificationTrigger.dispatch(profile.id, eventType, payload);
  }

  private toGraphQL(a: any, statusLogs: any[] = []) {
    const start = a.appointment_time as Date;
    const end = new Date(start.getTime() + a.duration_minutes * 60000);
    return {
      id: a.id,
      tenant_id: a.clinic?.client_org_id ?? undefined,
      start_datetime: start,
      end_datetime: end,
      duration_minutes: a.duration_minutes,
      status: a.status,
      type: a.type ?? 'in_person',
      booking_mode: a.booking_mode ?? 'slot',
      token_no: a.token_no ?? undefined,
      notes: a.notes || undefined,
      cancellation_reason: a.cancellation_reason ?? undefined,
      reminder_sent_at: a.reminder_sent_at ?? undefined,
      created_at: a.created_at,
      updated_at: a.updated_at,
      patient: {
        id: a.patient.id,
        first_name: a.patient.first_name,
        last_name: a.patient.last_name,
        full_name: `${a.patient.first_name} ${a.patient.last_name}`,
        email: a.patient.email,
        phone: a.patient.phone,
        date_of_birth: a.patient.date_of_birth,
        gender: a.patient.gender ?? undefined,
      },
      clinician: {
        id: a.clinician.id,
        first_name: a.clinician.first_name,
        last_name: a.clinician.last_name,
        full_name: `${a.clinician.first_name} ${a.clinician.last_name}`,
        avatar_url: a.clinician.avatar_url ?? undefined,
        clinician_type: a.clinician.clinician_type ? { id: a.clinician.clinician_type, name: a.clinician.clinician_type } : undefined,
      },
      clinic: {
        id: a.clinic.id,
        name: a.clinic.name,
        address: a.clinic.address ?? undefined,
        city: a.clinic.city ?? undefined,
        timezone: a.clinic.timezone ?? undefined,
      },
      // Rooms has no `name` column — room_number → name mapping matches
      // rooms.service.ts's own convention (Rule 9).
      room: a.room ? { id: a.room.id, name: a.room.room_number } : undefined,
      // REQ016 (US-CAT-04) — the patient-category-adjusted price (display
      // only; the actual payment channel isn't known at this point, so no
      // channel override applies here — see resolveServicePrice()'s own
      // comment on why channel is tied to the payment mechanism, not this
      // display mapping). Read through the shared helper, never
      // a.product.price directly — the exact inconsistency risk this
      // requirement's own research flagged between this call site and
      // appointment-payments.service.ts's charge computation.
      service: a.product
        ? { id: a.product.id, name: a.product.name, duration_minutes: a.product.duration_minutes ?? undefined, price: PAISE_TO_RUPEES(resolveServicePrice(a.product, a.patient)) }
        : undefined,
      booked_by_user: a.booked_by_user
        ? { id: a.booked_by_user.id, name: `${a.booked_by_user.first_name} ${a.booked_by_user.last_name}` }
        : undefined,
      status_logs: statusLogs.map((l) => ({
        id: l.id,
        status: l.status,
        reason: l.reason ?? undefined,
        created_at: l.created_at,
        changed_by_user: l.changed_by_user
          ? { id: l.changed_by_user.id, name: `${l.changed_by_user.first_name} ${l.changed_by_user.last_name}` }
          : undefined,
      })),
    };
  }

  // BUG006: delegates to the shared helper. The local version was the F-01
  // ternary — an org-less caller got `{}`, i.e. every tenant's appointments.
  private orgScope(user: JwtPayload) {
    return orgScopeVia(user, 'clinic');
  }

  // SECURITY: appointments() previously only org-scoped, never self-scoped --
  // any authenticated 'patient' role account could read every appointment
  // (reason, notes, clinician, other patients' names) within the org. See
  // the identical fix in patients.service.ts's selfScope for the same
  // patient_id-embedded-in-JWT pattern.
  //
  // Also applies the TC-APPT-API-010 requirement: a clinician's default
  // appointments query returns their own schedule, not every clinician's in
  // the org. Deliberately NOT applied to manager/admin/super_admin/staff --
  // front-desk staff need the whole clinic's schedule, matching TC-APPT-API-014's
  // role list for Journey mutations.
  private selfScope(user: JwtPayload) {
    if (user.roles.includes('patient')) return { patient_id: user.patient_id ?? '__no_patient_link__' };
    if (user.roles.includes('clinician')) return { clinician_id: user.clinician_id ?? '__no_clinician_link__' };
    return {};
  }

  async findAll(filters: AppointmentFiltersInput | undefined, first: number, page: number, user: JwtPayload) {
    const where: any = { is_deleted: false, ...this.orgScope(user), ...this.selfScope(user) };
    if (filters?.status) where.status = filters.status;
    if (filters?.clinician_id) where.clinician_id = filters.clinician_id;
    if (filters?.clinic_id) where.clinic_id = filters.clinic_id;
    if (filters?.date_from || filters?.date_to) {
      where.appointment_time = {};
      if (filters.date_from) where.appointment_time.gte = new Date(filters.date_from);
      if (filters.date_to) where.appointment_time.lte = new Date(`${filters.date_to}T23:59:59.999Z`);
    }
    if (filters?.patient_name) {
      where.patient = {
        OR: [
          { first_name: { contains: filters.patient_name, mode: 'insensitive' } },
          { last_name: { contains: filters.patient_name, mode: 'insensitive' } },
        ],
      };
    }
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.appointments.count({ where }),
      this.prisma.appointments.findMany({
        where,
        include: INCLUDE,
        orderBy: { appointment_time: 'desc' },
        skip: (page - 1) * first,
        take: first,
      }),
    ]);
    const lastPage = Math.max(1, Math.ceil(total / first));
    const firstItem = total === 0 ? 0 : (page - 1) * first + 1;
    return {
      data: rows.map((r) => this.toGraphQL(r)),
      paginatorInfo: {
        count: rows.length,
        currentPage: page,
        firstItem,
        hasMorePages: page < lastPage,
        lastItem: firstItem + rows.length - 1,
        lastPage,
        perPage: first,
        total,
      },
    };
  }

  private async loadScoped(id: string, user: JwtPayload) {
    const appointment = await this.prisma.appointments.findUnique({ where: { id }, include: INCLUDE });
    if (!appointment || appointment.is_deleted) {
      throw new NotFoundException('Appointment not found');
    }
    if (user.client_org_id && appointment.clinic.client_org_id !== user.client_org_id) {
      throw new NotFoundException('Appointment not found');
    }
    if (user.roles.includes('patient') && appointment.patient_id !== user.patient_id) {
      throw new NotFoundException('Appointment not found');
    }
    if (user.roles.includes('clinician') && appointment.clinician_id !== user.clinician_id) {
      throw new NotFoundException('Appointment not found');
    }
    return appointment;
  }

  async findOne(id: string, user: JwtPayload) {
    const appointment = await this.loadScoped(id, user);
    const logs = await this.prisma.appointmentStatusLogs.findMany({
      where: { appointment_id: id },
      include: { changed_by_user: true },
      orderBy: { created_at: 'desc' },
    });
    return this.toGraphQL(appointment, logs);
  }

  // Re-runs the real conflict check server-side — never trusts the client-
  // supplied slot_id as proof of availability (next-10-features-implementation-plan.md §3).
  private async assertSlotFree(clinicianId: string, start: Date, end: Date, excludeAppointmentId?: string) {
    const conflict = await this.prisma.appointments.findFirst({
      where: {
        clinician_id: clinicianId,
        is_deleted: false,
        status: { notIn: ['cancelled', 'no_show'] },
        // REQ017: session/hybrid-mode rows legitimately share a clinician
        // and start time with many other rows — they are not "slots" and
        // must never be treated as a conflict here, matching the DB
        // exclusion constraint's own booking_mode='slot' WHERE clause.
        booking_mode: 'slot',
        id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
        appointment_time: { lt: end },
      },
    });
    if (conflict) {
      const conflictEnd = new Date(conflict.appointment_time.getTime() + conflict.duration_minutes * 60000);
      if (conflictEnd > start) {
        throw new BadRequestException('This time slot is no longer available');
      }
    }
  }

  // SECURITY: create() previously never validated input.clinic_id against
  // the caller's org at all -- same gap class fixed this session in
  // availability/blocks/clinicians create paths. Applies to org-affiliated
  // callers (manager/staff/clinician/admin-with-an-org): without this, any
  // of them could create an appointment attributed to a DIFFERENT
  // organization's clinic just by passing its clinic_id. Deliberately a
  // no-op for an org-less caller (client_org_id: null, the seeded patient
  // account's actual state) -- the real patient self-serve booking flow
  // goes through public.resolver.ts's bookPatientAppointment, a separate
  // mutation in the "public dialect" (see CLAUDE.md's two-dialect note),
  // which by design lets a patient book across any clinic on the platform;
  // this fix does not touch that path.
  // REQ017: a session/hybrid window is identified by an exact match on
  // clinician + start_time HH:MM (UTC, matching availability.service.ts's
  // own sessionAvailability()/availableSlots() convention) + day-of-week —
  // the frontend's session-booking flow always submits the window's own
  // start_time as start_datetime, so this never has to guess.
  private async findGoverningSessionWindow(clinicianId: string, start: Date) {
    const hh = String(start.getUTCHours()).padStart(2, '0');
    const mm = String(start.getUTCMinutes()).padStart(2, '0');
    const dow = start.getUTCDay();
    return this.prisma.clinicianAvailability.findFirst({
      where: {
        clinician_id: clinicianId,
        is_deleted: false,
        is_active: true,
        mode: { in: ['session', 'hybrid'] },
        start_time: `${hh}:${mm}`,
        OR: [{ day_of_week: dow }, { recurrence_type: 'daily' }],
      },
    });
  }

  // REQ017 US-CAL-05, slot mode only. Application-level pre-check mirroring
  // assertSlotFree()'s own pattern — the resource-level EXCLUDE constraint
  // (appointment_resources_no_overlap) is the actual race-safe backstop.
  private async assertResourcesFree(resourceIds: string[], start: Date, end: Date) {
    const conflict = await this.prisma.appointmentResources.findFirst({
      where: { resource_id: { in: resourceIds }, start_at: { lt: end }, end_at: { gt: start } },
    });
    if (conflict) throw new BadRequestException('This time slot is no longer available');
  }

  async create(input: AppointmentInput, user: JwtPayload) {
    if (user.client_org_id) {
      const clinic = await this.prisma.clinics.findUnique({ where: { id: input.clinic_id } });
      if (!clinic || clinic.client_org_id !== user.client_org_id) {
        throw new BadRequestException('Clinic not found');
      }
    }
    // REQ018 — found while building family/dependant profiles: a
    // 'patient'-role caller could previously book under ANY patient_id,
    // never just their own (or now, a genuine dependant's). Hard Rule 6's
    // "create* mutations must validate input ownership" class of bug,
    // caught here rather than shipped a second time.
    if (user.roles.includes('patient')) {
      const allowedPatientIds = await this.patientsService.ownAndDependantPatientIds(user);
      if (!allowedPatientIds.includes(input.patient_id)) {
        throw new BadRequestException('Patient not found');
      }
    }
    const service = await this.prisma.products.findUnique({ where: { id: input.service_id } });
    if (!service) throw new BadRequestException('Service not found');
    const start = new Date(input.start_datetime);
    const durationMinutes = service.duration_minutes ?? 30;
    const end = new Date(start.getTime() + durationMinutes * 60000);

    const sessionWindow = await this.findGoverningSessionWindow(input.clinician_id, start);
    const bookingMode = sessionWindow?.mode ?? 'slot';

    if (bookingMode === 'slot') {
      await this.assertSlotFree(input.clinician_id, start, end);
      if (input.resource_ids?.length) {
        if (user.client_org_id) {
          const ownedCount = await this.prisma.resources.count({
            where: { id: { in: input.resource_ids }, client_org_id: user.client_org_id, is_deleted: false },
          });
          if (ownedCount !== input.resource_ids.length) throw new BadRequestException('Resource not found');
        }
        await this.assertResourcesFree(input.resource_ids, start, end);
      }
    }

    const room = sessionWindow?.room_id
      ? await this.prisma.rooms.findUnique({ where: { id: sessionWindow.room_id } })
      : await this.prisma.rooms.findFirst({
          where: { clinic_id: input.clinic_id, is_active: true, is_deleted: false },
        });
    if (!room) throw new BadRequestException('No active room available at this clinic');

    let created;
    try {
      created = await this.prisma.$transaction(async (tx) => {
        // REQ017: session/hybrid capacity is a count-then-insert guarded by
        // a Postgres advisory lock, not the DB exclusion constraint (many
        // tokens deliberately share the same clinician/room/time — the
        // exclusion constraint's WHERE clause excludes booking_mode='slot'
        // rows for exactly this reason). The lock serializes concurrent
        // bookings for the same session so the count-then-insert can never
        // race past capacity, the same guarantee class as the exclusion
        // constraint gives slot mode, just enforced differently because the
        // invariant itself ("don't exceed capacity") is different from
        // "don't overlap in time".
        let tokenNo: number | undefined;
        if (bookingMode !== 'slot' && sessionWindow) {
          const lockKey = `${input.clinician_id}|${input.start_datetime}`;
          await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', lockKey);
          const bookedCount = await tx.appointments.count({
            where: {
              clinician_id: input.clinician_id,
              is_deleted: false,
              status: { notIn: ['cancelled', 'no_show'] },
              booking_mode: { not: 'slot' },
              appointment_time: start,
            },
          });
          const totalAllowed = (sessionWindow.capacity ?? 0) + sessionWindow.overbook_allowance;
          if (bookedCount >= totalAllowed) {
            throw new BadRequestException('This session is fully booked');
          }
          tokenNo = bookedCount + 1;
        }

        const appointment = await tx.appointments.create({
          data: {
            clinic_id: input.clinic_id,
            room_id: room.id,
            clinician_id: input.clinician_id,
            patient_id: input.patient_id,
            appointment_date: new Date(start.toDateString()),
            appointment_time: start,
            duration_minutes: durationMinutes,
            status: 'scheduled',
            reason: input.notes ?? '',
            notes: input.notes ?? '',
            product_id: input.service_id,
            booked_by_user_id: user.sub,
            booking_mode: bookingMode,
            token_no: tokenNo,
          },
          include: INCLUDE,
        });
        if (bookingMode === 'slot' && input.resource_ids?.length) {
          await tx.appointmentResources.createMany({
            data: input.resource_ids.map((resourceId) => ({
              appointment_id: appointment.id,
              resource_id: resourceId,
              start_at: start,
              end_at: end,
            })),
          });
        }
        await tx.appointmentStatusLogs.create({
          data: { appointment_id: appointment.id, status: 'scheduled', changed_by_user_id: user.sub },
        });
        return appointment;
      });
    } catch (error) {
      // Two genuinely concurrent inserts hitting overlapping GiST index
      // pages can surface as a deadlock (Postgres 40P01, "deadlock
      // detected") instead of a clean exclusion-constraint violation
      // (23P01) -- confirmed live under real concurrency (5 truly-parallel
      // requests), not a hypothetical. Both mean exactly the same thing
      // from the caller's side: someone else got this slot. Retrying this
      // specific transaction would not help either way -- the constraint
      // is deterministic once the row that "won" has committed -- so both
      // map to the same clean message rather than one leaking a raw error.
      if (
        error instanceof Prisma.PrismaClientUnknownRequestError &&
        (OVERLAP_CONSTRAINT_NAMES.some((name) => error.message.includes(name)) || error.message.includes('deadlock detected'))
      ) {
        throw new BadRequestException('This time slot is no longer available');
      }
      throw error;
    }

    const result = this.toGraphQL(created);
    await this.notifyLinkedProfile('clinician_id', created.clinician_id, 'new_appointment', {
      title: 'New appointment booked',
      message: `${result.patient.full_name} booked ${result.service?.name ?? 'an appointment'} for ${start.toLocaleString('en-IN')}`,
      type: 'appointment',
      action_url: `/appointments/${created.id}`,
    });
    return result;
  }

  private async transitionStatus(id: string, status: string, reason: string | undefined, user: JwtPayload) {
    const appointment = await this.loadScoped(id, user);
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.appointments.update({
        where: { id },
        data: {
          status,
          cancellation_reason: status === 'cancelled' ? reason ?? appointment.cancellation_reason : appointment.cancellation_reason,
          updated_at: new Date(),
        },
        include: INCLUDE,
      });
      // REQ017: a cancelled/no_show appointment frees its resources —
      // AppointmentResources rows are deleted (not status-filtered), since
      // "no row for this resource at this time" is what the exclusion
      // constraint relies on to know the resource is free again.
      if (status === 'cancelled' || status === 'no_show') {
        await tx.appointmentResources.deleteMany({ where: { appointment_id: id } });
      }
      await tx.appointmentStatusLogs.create({
        data: { appointment_id: id, status, reason, changed_by_user_id: user.sub },
      });
      // REQ019: keeps the queue entry (if one exists) and the appointment's
      // own status as one atomic write — see queue.service.ts's own comment
      // on why this runs inside the same transaction rather than after it.
      await this.queueService.syncFromAppointmentStatus(tx, row, status);
      return row;
    });
    const result = this.toGraphQL(updated);
    await this.pubSub.publish(APPOINTMENT_UPDATED_EVENT, { appointmentUpdated: result });
    await this.queueService.publish(updated.clinic_id);
    if (status === 'cancelled' && appointment.status !== 'cancelled') {
      await this.notifyCancellation(result);
    }
    return result;
  }

  // REQ008/PLAN017 — notifies both sides; either may be unlinked.
  private async notifyCancellation(appointment: ReturnType<AppointmentsService['toGraphQL']>) {
    const payload = {
      title: 'Appointment cancelled',
      message: `${appointment.service?.name ?? 'Appointment'} on ${new Date(appointment.start_datetime).toLocaleString('en-IN')} was cancelled`,
      type: 'appointment' as const,
      action_url: `/appointments/${appointment.id}`,
    };
    await this.notifyLinkedProfile('clinician_id', appointment.clinician.id, 'appointment_cancelled', payload);
    await this.notifyLinkedProfile('patient_id', appointment.patient.id, 'appointment_cancelled', payload);
  }

  cancel(id: string, reason: string | undefined, user: JwtPayload) {
    return this.transitionStatus(id, 'cancelled', reason, user);
  }

  complete(id: string, user: JwtPayload) {
    return this.transitionStatus(id, 'completed', undefined, user);
  }

  markNoShow(id: string, user: JwtPayload) {
    return this.transitionStatus(id, 'no_show', undefined, user);
  }

  // REQ042/BUG019-adjacent — front-desk queue tracking (waiting-room/index.jsx).
  // `status` stays a free-text column (see the model's own comment), so
  // 'checked_in'/'in_consultation' are additive convention values, not a
  // schema/enum migration.
  checkIn(id: string, user: JwtPayload) {
    return this.transitionStatus(id, 'checked_in', undefined, user);
  }

  startConsultation(id: string, user: JwtPayload) {
    return this.transitionStatus(id, 'in_consultation', undefined, user);
  }

  // Front desk's own "Undo" action -- reverts a no_show/completed
  // mis-click back to the head of the queue. Deliberately narrow: only
  // from a terminal-but-recent state back to 'scheduled', not a general
  // "set to any status" escape hatch (that already exists via
  // createAppointment's sibling `update()` for other fields, and an
  // unrestricted status-setter would let 'checked_in'/'in_consultation'
  // become reachable from role gates that shouldn't have them).
  resetAppointmentJourney(id: string, user: JwtPayload) {
    return this.transitionStatus(id, 'scheduled', undefined, user);
  }

  async update(id: string, input: AppointmentUpdateInput, user: JwtPayload) {
    const existing = await this.loadScoped(id, user);

    let appointmentDate = existing.appointment_date;
    let appointmentTime = existing.appointment_time;
    const timeChanged = !!input.start_datetime;
    if (input.start_datetime) {
      appointmentTime = new Date(input.start_datetime);
      appointmentDate = new Date(appointmentTime.toDateString());
      // REQ017: session/hybrid-mode appointments are not "slots" — many
      // rows legitimately share a clinician/time, so the slot-conflict
      // check doesn't apply to them (matches create()'s own branching and
      // the DB exclusion constraint's booking_mode='slot' WHERE clause).
      // Rescheduling a session/hybrid appointment's capacity is out of
      // scope for this slice — resource_ids/token_no reassignment aren't
      // supported here either, matching the already-accepted room-
      // reassignment-on-reschedule gap (open question #14).
      if (existing.booking_mode === 'slot') {
        await this.assertSlotFree(input.clinician_id ?? existing.clinician_id, appointmentTime, new Date(appointmentTime.getTime() + existing.duration_minutes * 60000), id);
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.appointments.update({
        where: { id },
        data: {
          status: input.status ?? existing.status,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          clinician_id: input.clinician_id ?? existing.clinician_id,
          room_id: input.room_id ?? existing.room_id,
          notes: input.notes ?? existing.notes,
          cancellation_reason: input.status === 'cancelled' ? input.cancellation_reason ?? existing.cancellation_reason : existing.cancellation_reason,
          updated_at: new Date(),
        },
        include: INCLUDE,
      });
      if (input.status === 'cancelled' || input.status === 'no_show') {
        await tx.appointmentResources.deleteMany({ where: { appointment_id: id } });
      } else if (timeChanged) {
        // Keep any attached resources' denormalized time range in sync so
        // the exclusion constraint stays meaningful — which resources are
        // attached still cannot change via update() in this slice.
        await tx.appointmentResources.updateMany({
          where: { appointment_id: id },
          data: { start_at: appointmentTime, end_at: new Date(appointmentTime.getTime() + existing.duration_minutes * 60000) },
        });
      }
      if (input.status && input.status !== existing.status) {
        await tx.appointmentStatusLogs.create({
          data: { appointment_id: id, status: input.status, reason: input.cancellation_reason, changed_by_user_id: user.sub },
        });
      }
      return row;
    });
    const result = this.toGraphQL(updated);
    await this.pubSub.publish(APPOINTMENT_UPDATED_EVENT, { appointmentUpdated: result });
    if (input.status === 'cancelled' && existing.status !== 'cancelled') {
      await this.notifyCancellation(result);
    }
    return result;
  }
}
