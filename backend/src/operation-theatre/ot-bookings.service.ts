import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, assertSameOrg, isSameOrg } from '../common/scoping/tenant-scope';
import { OperationTheatresService } from './operation-theatres.service';
import { CreateOtBookingInput, CancelOtBookingInput, AssignOtBookingStaffInput } from './dto/operation-theatre.input';
import { isTheatreOverlapViolation, isSurgeonOverlapViolation } from './ot-overlap';
import { OT_CHECKLIST_PHASES } from './dto/operation-theatre.input';
import { IpdBillingService } from '../ipd-billing/ipd-billing.service';

const LIVE_BOOKING_STATUSES = ['scheduled', 'in_progress'];

// REQ179 (IPD slice 3) — OT booking lifecycle. Both mutual-exclusion
// guarantees (theatre-overlap including turnaround, surgeon-overlap) are
// enforced by the database, exactly as slice 1's bed-occupancy design axiom
// states: an availability check and an insert are two statements, so the
// only real guarantee is the one the database itself makes atomic.
@Injectable()
export class OtBookingsService {
  private readonly logger = new Logger(OtBookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly theatresService: OperationTheatresService,
    private readonly billingService: IpdBillingService,
  ) {}

  // ── Scope guards ─────────────────────────────────────────────────────
  private async assertAdmissionInScope(admissionId: string, user: JwtPayload) {
    const admission = await this.prisma.admissions.findUnique({ where: { id: admissionId } });
    if (!admission || admission.is_deleted) throw new BadRequestException('Admission not found');
    if (!isSameOrg(user, admission.client_org_id)) throw new BadRequestException('Admission not found');
    return admission;
  }

  private async assertClinicianInScope(clinicianId: string, user: JwtPayload) {
    const clinician = await this.prisma.clinicians.findUnique({ where: { id: clinicianId }, include: { clinic: true } });
    if (!clinician || clinician.is_deleted) throw new BadRequestException('Clinician not found');
    if (!isSameOrg(user, clinician.clinic.client_org_id)) throw new BadRequestException('Clinician not found');
    return clinician;
  }

  private fullName(row: any): string {
    if (!row) return '';
    return [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || row.full_name || '';
  }

  // ── Projection ────────────────────────────────────────────────────────
  private readonly BOOKING_INCLUDE = {
    theatre: true,
    admission: { include: { patient: true } },
    primary_surgeon: true,
    anesthetist: true,
    staff: { include: { user: true } },
    checklists: { include: { completed_by: true }, orderBy: { created_at: 'asc' as const } },
    consumables: { include: { drug: true, recorded_by: true }, orderBy: { created_at: 'desc' as const } },
  };

  private toGraphQL(b: any) {
    return {
      id: b.id,
      theatre_id: b.theatre_id,
      theatre_name: b.theatre?.name ?? undefined,
      admission_id: b.admission_id,
      admission_number: b.admission?.admission_number ?? undefined,
      patient_name: b.admission?.patient ? this.fullName(b.admission.patient) : undefined,
      procedure_name: b.procedure_name,
      primary_surgeon_clinician_id: b.primary_surgeon_clinician_id,
      primary_surgeon_name: b.primary_surgeon ? this.fullName(b.primary_surgeon) : undefined,
      anesthetist_clinician_id: b.anesthetist_clinician_id ?? undefined,
      anesthetist_name: b.anesthetist ? this.fullName(b.anesthetist) : undefined,
      start_at: b.start_at,
      end_at: b.end_at,
      turnaround_minutes: b.turnaround_minutes,
      status: b.status,
      cancel_reason: b.cancel_reason ?? undefined,
      notes: b.notes ?? undefined,
      staff: (b.staff ?? []).map((s: any) => ({ id: s.id, user_id: s.user_id, user_name: this.fullName(s.user), role: s.role })),
      checklists: (b.checklists ?? []).map((c: any) => ({
        id: c.id,
        phase: c.phase,
        items: (c.items_json as any[]) ?? [],
        completed_by_name: c.completed_by ? this.fullName(c.completed_by) : undefined,
        completed_at: c.completed_at ?? undefined,
      })),
      consumables: (b.consumables ?? []).map((c: any) => ({
        id: c.id,
        drug_id: c.drug_id,
        drug_name: c.drug?.name ?? undefined,
        quantity: c.quantity,
        implant_serial_no: c.implant_serial_no ?? undefined,
        recorded_by_name: c.recorded_by ? this.fullName(c.recorded_by) : undefined,
        created_at: c.created_at,
      })),
      created_at: b.created_at,
    };
  }

  // ── Reads ─────────────────────────────────────────────────────────────
  async findOne(id: string, user: JwtPayload) {
    const booking = await this.prisma.otBookings.findUnique({ where: { id }, include: this.BOOKING_INCLUDE });
    if (!booking || !isSameOrg(user, booking.client_org_id)) throw new NotFoundException('OT booking not found');
    return this.toGraphQL(booking);
  }

  async findAllForAdmission(admissionId: string, user: JwtPayload) {
    await this.assertAdmissionInScope(admissionId, user);
    const bookings = await this.prisma.otBookings.findMany({
      where: { admission_id: admissionId },
      include: this.BOOKING_INCLUDE,
      orderBy: { start_at: 'desc' },
    });
    return bookings.map((b) => this.toGraphQL(b));
  }

  // The theatre schedule board — a bounded window, matching the bed
  // board's own "one query, org+clinic scoped" shape.
  async findAllForTheatre(theatreId: string | undefined, clinicId: string | undefined, from: string, to: string, user: JwtPayload) {
    const bookings = await this.prisma.otBookings.findMany({
      where: {
        ...(theatreId ? { theatre_id: theatreId } : {}),
        ...(clinicId ? { clinic_id: clinicId } : {}),
        start_at: { lt: new Date(to) },
        end_at: { gt: new Date(from) },
        ...orgScope(user),
      },
      include: this.BOOKING_INCLUDE,
      orderBy: { start_at: 'asc' },
    });
    return bookings.map((b) => this.toGraphQL(b));
  }

  // ── Best-effort cross-domain clash detection ────────────────────────
  //
  // Postgres has no cross-table EXCLUDE constraint, so a surgeon double-
  // booked between a real OPD Appointments row and this OT slot cannot be
  // stopped by the database the way the two same-table constraints above
  // are. This is a best-effort application-level check only — it catches
  // the create-time case, not a subsequent OPD booking made after this OT
  // slot exists (the identical, already-documented gap this codebase's own
  // session-mode capacity check has). Widened window on the initial query,
  // narrowed to the exact overlap in application code, since Prisma can't
  // express "appointment_time + duration_minutes*interval" in a `where`.
  private async assertSurgeonFree(clinicianId: string, startAt: Date, endAt: Date) {
    const windowStart = new Date(startAt.getTime() - 4 * 3_600_000);
    const windowEnd = new Date(endAt.getTime() + 4 * 3_600_000);
    const candidates = await this.prisma.appointments.findMany({
      where: {
        clinician_id: clinicianId,
        is_deleted: false,
        status: { notIn: ['cancelled', 'no_show'] },
        appointment_time: { gte: windowStart, lte: windowEnd },
      },
    });
    const clash = candidates.find((a) => {
      const apptStart = a.appointment_time;
      const apptEnd = new Date(apptStart.getTime() + a.duration_minutes * 60_000);
      return apptStart < endAt && apptEnd > startAt;
    });
    if (clash) {
      throw new ConflictException('This surgeon has an OPD appointment that overlaps this OT slot.');
    }
  }

  // ── Create ────────────────────────────────────────────────────────────
  async create(input: CreateOtBookingInput, user: JwtPayload) {
    if (input.end_at <= input.start_at) throw new BadRequestException('End time must be after start time');

    const theatre = await this.theatresService.assertTheatreInScope(input.theatre_id, user);
    const admission = await this.assertAdmissionInScope(input.admission_id, user);
    if (admission.clinic_id !== theatre.clinic_id) {
      throw new BadRequestException('This theatre belongs to a different clinic than the admission');
    }
    await this.assertClinicianInScope(input.primary_surgeon_clinician_id, user);
    if (input.anesthetist_clinician_id) await this.assertClinicianInScope(input.anesthetist_clinician_id, user);

    await this.assertSurgeonFree(input.primary_surgeon_clinician_id, input.start_at, input.end_at);

    const turnaround = input.turnaround_minutes ?? theatre.default_turnaround_minutes;

    try {
      const created = await this.prisma.otBookings.create({
        data: {
          client_org_id: theatre.client_org_id,
          clinic_id: theatre.clinic_id,
          theatre_id: theatre.id,
          admission_id: admission.id,
          procedure_name: input.procedure_name,
          primary_surgeon_clinician_id: input.primary_surgeon_clinician_id,
          anesthetist_clinician_id: input.anesthetist_clinician_id ?? null,
          start_at: input.start_at,
          end_at: input.end_at,
          turnaround_minutes: turnaround,
          notes: input.notes ?? null,
          created_by_user_id: user.sub,
        },
      });
      return this.findOne(created.id, user);
    } catch (err: any) {
      if (isTheatreOverlapViolation(err)) {
        throw new ConflictException(`Theatre ${theatre.name} is already booked (including turnaround) for that period.`);
      }
      if (isSurgeonOverlapViolation(err)) {
        throw new ConflictException('This surgeon already has another OT booking that overlaps that period.');
      }
      throw err;
    }
  }

  // ── Status transitions ──────────────────────────────────────────────
  private async loadForTransition(id: string, user: JwtPayload) {
    const booking = await this.prisma.otBookings.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('OT booking not found');
    assertSameOrg(user, booking.client_org_id, 'OT booking');
    return booking;
  }

  async start(id: string, user: JwtPayload) {
    const booking = await this.loadForTransition(id, user);
    if (booking.status !== 'scheduled') throw new BadRequestException(`Cannot start a ${booking.status} booking`);
    await this.prisma.otBookings.update({ where: { id }, data: { status: 'in_progress' } });
    return this.findOne(id, user);
  }

  // S3 gate: all 3 WHO Surgical Safety Checklist phases must be complete.
  async complete(id: string, user: JwtPayload) {
    const booking = await this.loadForTransition(id, user);
    if (booking.status !== 'in_progress') throw new BadRequestException(`Cannot complete a ${booking.status} booking`);

    const checklists = await this.prisma.otChecklists.findMany({ where: { booking_id: id } });
    const completedPhases = new Set(checklists.filter((c) => c.completed_at).map((c) => c.phase));
    const missing = OT_CHECKLIST_PHASES.filter((p) => !completedPhases.has(p));
    if (missing.length > 0) {
      throw new BadRequestException(`Complete the WHO checklist first — missing: ${missing.join(', ')}`);
    }

    await this.prisma.otBookings.update({ where: { id }, data: { status: 'completed' } });
    await this.postUsageCharge(booking, user.sub);
    return this.findOne(id, user);
  }

  // REQ179 (IPD slice 4) — a flat per-booking theatre-usage charge, posted
  // once on completion, only when the theatre has a configured usage
  // charge item (OperationTheatres.usage_charge_product_id — null means
  // "not configured", the same fail-safe convention as every other
  // optional charge trigger in this slice). service_date is the booking's
  // own start_at, so the charge lands on the day the procedure actually
  // happened, not whenever completeOtBooking happens to be called.
  private async postUsageCharge(booking: { id: string; admission_id: string; theatre_id: string; start_at: Date }, postedByUserId: string) {
    const theatre = await this.prisma.operationTheatres.findUnique({ where: { id: booking.theatre_id } });
    if (!theatre?.usage_charge_product_id) return;
    const admission = await this.prisma.admissions.findUnique({ where: { id: booking.admission_id }, include: { patient: true } });
    if (!admission) return;
    const unitPricePaise = await this.billingService.priceProductForAdmission(theatre.usage_charge_product_id, admission);
    if (unitPricePaise == null) return;
    await this.billingService.postCharge({
      admissionId: admission.id,
      chargeType: 'ot_usage',
      description: `Theatre usage — ${theatre.name}`,
      serviceDate: booking.start_at,
      productId: theatre.usage_charge_product_id,
      quantity: 1,
      unitPricePaise,
      sourceReferenceType: 'ot_booking',
      sourceReferenceId: booking.id,
      postedByUserId,
    });
  }

  async cancel(input: CancelOtBookingInput, user: JwtPayload) {
    const booking = await this.prisma.otBookings.findUnique({ where: { id: input.booking_id } });
    if (!booking) return { success: false, userErrors: [{ message: 'OT booking not found' }] };
    if (!isSameOrg(user, booking.client_org_id)) return { success: false, userErrors: [{ message: 'OT booking not found' }] };
    if (!LIVE_BOOKING_STATUSES.includes(booking.status)) {
      return { success: false, userErrors: [{ message: `Cannot cancel a ${booking.status} booking` }] };
    }
    await this.prisma.otBookings.update({
      where: { id: input.booking_id },
      data: { status: 'cancelled', is_cancelled: true, cancel_reason: input.reason },
    });
    return { success: true, userErrors: [] };
  }

  // ── Staff assignment ─────────────────────────────────────────────────
  async assignStaff(input: AssignOtBookingStaffInput, user: JwtPayload) {
    const booking = await this.loadForTransition(input.booking_id, user);
    const userProfile = await this.prisma.userProfiles.findUnique({ where: { id: input.user_id } });
    if (!userProfile || userProfile.is_deleted) throw new BadRequestException('User not found');
    if (!isSameOrg(user, userProfile.client_org_id)) throw new BadRequestException('User not found');

    await this.prisma.otBookingStaff.create({
      data: { booking_id: booking.id, user_id: input.user_id, role: input.role },
    });
    return this.findOne(booking.id, user);
  }

  async removeStaff(staffAssignmentId: string, user: JwtPayload) {
    const row = await this.prisma.otBookingStaff.findUnique({ where: { id: staffAssignmentId }, include: { booking: true } });
    if (!row) throw new NotFoundException('Assignment not found');
    assertSameOrg(user, row.booking.client_org_id, 'OT booking');
    await this.prisma.otBookingStaff.delete({ where: { id: staffAssignmentId } });
    return this.findOne(row.booking_id, user);
  }
}
