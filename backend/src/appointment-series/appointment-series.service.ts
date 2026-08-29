import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsService } from '../appointments/appointments.service';
import type { AppointmentInput } from '../appointments/dto/appointment.input';
import { PatientsService } from '../patients/patients.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScopeVia, orgIdForWrite } from '../common/scoping/tenant-scope';
import { CreateAppointmentSeriesInput, CancelAppointmentSeriesInput } from './dto/appointment-series.input';

const NON_TERMINAL_STATUSES = ['scheduled', 'confirmed', 'awaiting_payment', 'checked_in', 'in_consultation'];

@Injectable()
export class AppointmentSeriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointmentsService: AppointmentsService,
    private readonly patientsService: PatientsService,
  ) {}

  private orgScope(user: JwtPayload) {
    return orgScopeVia(user, 'clinic');
  }

  private toGraphQL(series: any, appointments?: any[]) {
    return {
      id: series.id,
      name: series.name,
      series_type: series.series_type,
      status: series.status,
      clinic_id: series.clinic_id,
      patient_id: series.patient_id,
      created_at: series.created_at,
      updated_at: series.updated_at,
      appointments,
    };
  }

  private async loadScoped(id: string, user: JwtPayload) {
    const series = await this.prisma.appointmentSeries.findUnique({ where: { id }, include: { clinic: true } });
    if (!series) throw new NotFoundException('Series not found');
    if (user.client_org_id && series.clinic.client_org_id !== user.client_org_id) {
      throw new NotFoundException('Series not found');
    }
    if (user.roles.includes('patient')) {
      const allowedPatientIds = await this.patientsService.ownAndDependantPatientIds(user);
      if (!allowedPatientIds.includes(series.patient_id)) {
        throw new NotFoundException('Series not found');
      }
    }
    return series;
  }

  // REQ163 (P2-10). Every occurrence is validated and created through the
  // EXISTING AppointmentsService.create() — tenant scoping, patient
  // self-scope (REQ018), intake fields (REQ052), prepayment/no-show-risk
  // policy, slot-vs-session-mode conflict checking, and the idempotency-
  // key/EXCLUDE-constraint catch-and-translate logic are all reused
  // verbatim, never reimplemented. Each occurrence gets its own
  // create() call (its own transaction internally) and its own
  // try/catch here — one occurrence's genuine slot conflict never rolls
  // back the others, matching bulkReschedule()'s own established
  // partial-success pattern.
  async create(input: CreateAppointmentSeriesInput, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: input.clinic_id } });
    if (user.client_org_id) {
      if (!clinic || clinic.client_org_id !== user.client_org_id) {
        throw new BadRequestException('Clinic not found');
      }
    }
    if (!clinic) throw new BadRequestException('Clinic not found');
    // REQ018's own gap class (Hard Rule 6): a 'patient'-role caller must
    // only ever create a series for themselves or a genuine dependant.
    if (user.roles.includes('patient')) {
      const allowedPatientIds = await this.patientsService.ownAndDependantPatientIds(user);
      if (!allowedPatientIds.includes(input.patient_id)) {
        throw new BadRequestException('Patient not found');
      }
    }

    const series = await this.prisma.appointmentSeries.create({
      data: {
        client_org_id: orgIdForWrite(user, 'AppointmentSeries'),
        clinic_id: input.clinic_id,
        patient_id: input.patient_id,
        name: input.name,
        series_type: input.series_type,
        status: 'active',
        created_by_user_id: user.sub,
      },
    });

    const created: any[] = [];
    const failures: { occurrence_index: number; message: string }[] = [];
    for (let i = 0; i < input.occurrences.length; i++) {
      const occ = input.occurrences[i];
      try {
        const appointment = await this.appointmentsService.create(
          {
            patient_id: input.patient_id,
            clinician_id: occ.clinician_id ?? input.clinician_id,
            service_id: occ.service_id,
            clinic_id: input.clinic_id,
            start_datetime: occ.start_datetime,
            notes: occ.notes,
            idempotency_key: input.idempotency_key ? `${input.idempotency_key}:occ:${i}` : undefined,
          } as AppointmentInput,
          user,
          { series_id: series.id, series_occurrence_no: i + 1 },
        );
        created.push(appointment);
      } catch (error) {
        failures.push({ occurrence_index: i, message: error instanceof Error ? error.message : 'Could not create this occurrence' });
      }
    }

    return {
      success: created.length > 0,
      userErrors: created.length === 0 ? [{ message: 'No occurrence could be scheduled' }] : [],
      series: this.toGraphQL(series, created),
      attempted_count: input.occurrences.length,
      created_count: created.length,
      failed_count: failures.length,
      failures,
    };
  }

  async findOne(id: string, user: JwtPayload) {
    const series = await this.loadScoped(id, user);
    const appointments = await this.appointmentsService.findBySeriesId(id, user);
    return this.toGraphQL(series, appointments);
  }

  // Org-scoped list for the staff-facing series index — deliberately
  // omits the nested `appointments` field (undefined, matches the
  // entity's own nullable-list convention) to avoid an N+1 fetch on a
  // page that only needs series-level metadata; findOne() above is the
  // one that populates it, for the detail view.
  async list(clinicId: string | undefined, user: JwtPayload) {
    const rows = await this.prisma.appointmentSeries.findMany({
      where: { ...this.orgScope(user), ...(clinicId ? { clinic_id: clinicId } : {}) },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => this.toGraphQL(r));
  }

  // REQ163 (P2-10) — cancels only the series' own non-terminal occurrences
  // (an already-completed visit is untouched), reusing the existing
  // per-appointment cancel() path (tenant/self-scope, resource-freeing,
  // waitlist promotion, notifications — all unchanged). Same per-row
  // try/catch partial-success shape as create() above.
  async cancel(input: CancelAppointmentSeriesInput, user: JwtPayload) {
    const series = await this.loadScoped(input.series_id, user);
    const targets = await this.prisma.appointments.findMany({
      where: { series_id: series.id, is_deleted: false, status: { in: NON_TERMINAL_STATUSES } },
    });

    let cancelledCount = 0;
    let failedCount = 0;
    for (const appt of targets) {
      try {
        await this.appointmentsService.cancel(appt.id, input.reason, user);
        cancelledCount += 1;
      } catch {
        failedCount += 1;
      }
    }

    await this.prisma.appointmentSeries.update({ where: { id: series.id }, data: { status: 'cancelled', updated_at: new Date() } });

    return {
      success: cancelledCount > 0 || targets.length === 0,
      userErrors: [],
      attempted_count: targets.length,
      cancelled_count: cancelledCount,
      failed_count: failedCount,
    };
  }
}
