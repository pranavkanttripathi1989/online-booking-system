import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, assertSameOrg, isSameOrg } from '../common/scoping/tenant-scope';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { nextDocumentNumber, DOCUMENT_SERIES } from '../common/billing/document-numbering';
import {
  CreateAdmissionInput,
  UpdateAdmissionInput,
  TransferAdmissionBedInput,
  DischargeAdmissionInput,
  AdmissionFilterInput,
} from './dto/admission.input';
import { isBedOverlapViolation } from '../wards/bed-overlap';

// Statuses that mean "this patient is currently in a bed".
const LIVE_STATUSES = ['pending', 'admitted', 'discharge_initiated'];

// REQ179 (IPD slice 1) — admissions and the ADT lifecycle.
//
// The stay is the IPD aggregate root, exactly as `appointment_id` is the OPD
// one. Every ADT operation is one transaction that writes the BedOccupancies
// timeline, the Beds.status cache, the Admissions row, and an AdmissionEvents
// entry together — so a crash mid-transfer can never leave a patient in two
// beds or none.
@Injectable()
export class AdmissionsService {
  private readonly logger = new Logger(AdmissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationTrigger: NotificationTriggerService,
  ) {}

  // ── Scope guards (Hard Rule 6, applied to every caller-supplied FK) ────

  private async assertClinicInScope(clinicId: string, user: JwtPayload) {
    const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
    if (!clinic || clinic.is_deleted) throw new BadRequestException('Clinic not found');
    if (!isSameOrg(user, clinic.client_org_id)) throw new BadRequestException('Clinic not found');
    return clinic;
  }

  private async assertBedInScope(bedId: string, user: JwtPayload) {
    const bed = await this.prisma.beds.findUnique({ where: { id: bedId }, include: { ward: true } });
    if (!bed || bed.is_deleted) throw new BadRequestException('Bed not found');
    if (!isSameOrg(user, bed.client_org_id)) throw new BadRequestException('Bed not found');
    if (!bed.is_active) throw new BadRequestException(`Bed ${bed.bed_number} is not in service`);
    return bed;
  }

  private async assertPatientInScope(patientId: string, user: JwtPayload) {
    const patient = await this.prisma.patients.findUnique({ where: { id: patientId } });
    if (!patient || patient.is_deleted) throw new BadRequestException('Patient not found');
    if (!isSameOrg(user, patient.client_org_id)) throw new BadRequestException('Patient not found');
    return patient;
  }

  // Clinicians has no client_org_id of its own — it scopes through its
  // (non-nullable) clinic, matching revenue-share.service.ts's own precedent.
  private async assertClinicianInScope(clinicianId: string, user: JwtPayload) {
    const clinician = await this.prisma.clinicians.findUnique({ where: { id: clinicianId }, include: { clinic: true } });
    if (!clinician || clinician.is_deleted) throw new BadRequestException('Clinician not found');
    if (!isSameOrg(user, clinician.clinic.client_org_id)) throw new BadRequestException('Clinician not found');
    return clinician;
  }

  // ── Projection ────────────────────────────────────────────────────────

  private readonly ADMISSION_INCLUDE = {
    patient: true,
    admitting_clinician: true,
    attending_clinician: true,
    clinic: true,
    department: true,
    payer: true,
    occupancies: {
      where: { is_cancelled: false },
      orderBy: { start_at: 'asc' as const },
      include: { bed: true, ward: true },
    },
  };

  private fullName(row: any): string {
    if (!row) return '';
    return [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || row.full_name || '';
  }

  private placement(o: any) {
    return {
      bed_id: o.bed_id,
      bed_number: o.bed?.bed_number ?? '',
      ward_id: o.ward_id,
      ward_name: o.ward?.name ?? '',
      ward_type: o.ward?.ward_type ?? '',
      start_at: o.start_at,
      end_at: o.end_at ?? undefined,
      end_reason: o.end_reason ?? undefined,
    };
  }

  private toGraphQL(a: any) {
    if (!a) return null;
    const occupancies: any[] = a.occupancies ?? [];
    const current = occupancies.find((o) => o.end_at === null);
    // Inclusive of the admission day, so a same-day stay reads "1", not "0" —
    // this is the human "day N of stay" label, not the billing day count
    // (slice 4 applies the real per-clinic day-boundary policy).
    const end = a.discharged_at ?? new Date();
    const lengthOfStay = Math.max(1, Math.floor((end.getTime() - a.admitted_at.getTime()) / 86_400_000) + 1);

    return {
      id: a.id,
      admission_number: a.admission_number,
      status: a.status,
      admission_type: a.admission_type,
      admitted_at: a.admitted_at,
      expected_discharge_at: a.expected_discharge_at ?? undefined,
      discharge_initiated_at: a.discharge_initiated_at ?? undefined,
      discharged_at: a.discharged_at ?? undefined,
      discharge_type: a.discharge_type ?? undefined,

      patient: {
        id: a.patient.id,
        full_name: this.fullName(a.patient),
        phone: a.patient.phone ?? undefined,
        gender: a.patient.gender ?? undefined,
        date_of_birth: a.patient.date_of_birth ?? undefined,
      },
      admitting_clinician: {
        id: a.admitting_clinician.id,
        full_name: this.fullName(a.admitting_clinician),
        clinician_type: a.admitting_clinician.clinician_type ?? undefined,
      },
      attending_clinician: {
        id: a.attending_clinician.id,
        full_name: this.fullName(a.attending_clinician),
        clinician_type: a.attending_clinician.clinician_type ?? undefined,
      },
      clinic_id: a.clinic_id,
      clinic_name: a.clinic?.name ?? undefined,
      department_id: a.department_id ?? undefined,
      department_name: a.department?.name ?? undefined,

      current_bed: current ? this.placement(current) : undefined,
      bed_history: occupancies.map((o) => this.placement(o)),

      provisional_diagnosis: a.provisional_diagnosis,
      final_diagnosis: a.final_diagnosis ?? undefined,
      admission_notes: a.admission_notes,
      billing_mode: a.billing_mode,
      payer_id: a.payer_id ?? undefined,
      payer_name: a.payer?.name ?? undefined,
      is_mlc: a.is_mlc,
      is_critical: a.is_critical,
      length_of_stay_days: lengthOfStay,
      source_appointment_id: a.source_appointment_id ?? undefined,
      source_encounter_id: a.source_encounter_id ?? undefined,
      created_at: a.created_at,
    };
  }

  // ── Reads ─────────────────────────────────────────────────────────────

  async findAll(filter: AdmissionFilterInput | undefined, user: JwtPayload) {
    const f = filter ?? ({} as AdmissionFilterInput);
    const admissions = await this.prisma.admissions.findMany({
      where: {
        is_deleted: false,
        ...(f.clinic_id ? { clinic_id: f.clinic_id } : {}),
        ...(f.patient_id ? { patient_id: f.patient_id } : {}),
        ...(f.attending_clinician_id ? { attending_clinician_id: f.attending_clinician_id } : {}),
        ...(f.status ? { status: f.status } : {}),
        ...(f.is_mlc !== undefined ? { is_mlc: f.is_mlc } : {}),
        ...(f.ward_id
          ? { occupancies: { some: { ward_id: f.ward_id, end_at: null, is_cancelled: false } } }
          : {}),
        ...orgScope(user),
      },
      include: this.ADMISSION_INCLUDE,
      orderBy: { admitted_at: 'desc' },
      take: f.limit ?? 50,
      skip: f.offset ?? 0,
    });
    return admissions.map((a) => this.toGraphQL(a));
  }

  async findOne(id: string, user: JwtPayload) {
    const admission = await this.prisma.admissions.findUnique({ where: { id }, include: this.ADMISSION_INCLUDE });
    if (!admission || admission.is_deleted) throw new NotFoundException('Admission not found');
    assertSameOrg(user, admission.client_org_id, 'Admission');
    return this.toGraphQL(admission);
  }

  async events(admissionId: string, user: JwtPayload) {
    const admission = await this.prisma.admissions.findUnique({ where: { id: admissionId } });
    if (!admission || admission.is_deleted) throw new NotFoundException('Admission not found');
    assertSameOrg(user, admission.client_org_id, 'Admission');

    const events = await this.prisma.admissionEvents.findMany({
      where: { admission_id: admissionId },
      orderBy: { occurred_at: 'asc' },
      include: { actor: true },
    });
    return events.map((e: any) => {
      const payload = (e.payload_json ?? {}) as Record<string, any>;
      return {
        id: e.id,
        event_type: e.event_type,
        occurred_at: e.occurred_at,
        notes: e.notes ?? undefined,
        actor_user_id: e.actor_user_id,
        actor_name: this.fullName(e.actor) || undefined,
        from_bed_number: payload.from_bed_number ?? undefined,
        to_bed_number: payload.to_bed_number ?? undefined,
        from_ward_name: payload.from_ward_name ?? undefined,
        to_ward_name: payload.to_ward_name ?? undefined,
        reason: payload.reason ?? undefined,
      };
    });
  }

  // ── Admit ─────────────────────────────────────────────────────────────

  async create(input: CreateAdmissionInput, user: JwtPayload) {
    const clinic = await this.assertClinicInScope(input.clinic_id, user);
    const bed = await this.assertBedInScope(input.bed_id, user);
    if (bed.clinic_id !== clinic.id) {
      throw new BadRequestException('That bed belongs to a different clinic');
    }
    await this.assertPatientInScope(input.patient_id, user);
    await this.assertClinicianInScope(input.admitting_clinician_id, user);
    if (input.attending_clinician_id && input.attending_clinician_id !== input.admitting_clinician_id) {
      await this.assertClinicianInScope(input.attending_clinician_id, user);
    }

    // One live admission per patient. Checked here for a clean message; the
    // bed exclusion constraint independently prevents the physical collision.
    const existingLive = await this.prisma.admissions.findFirst({
      where: { patient_id: input.patient_id, status: { in: LIVE_STATUSES }, is_deleted: false },
    });
    if (existingLive) {
      throw new ConflictException(
        `This patient is already admitted (${existingLive.admission_number}). Discharge that stay first.`,
      );
    }

    const admittedAt = input.admitted_at ?? new Date();
    const orgId = clinic.client_org_id as string;

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        // Numbered inside the transaction so a rejected admission does not
        // burn an admission number.
        const admissionNumber = await nextDocumentNumber(
          tx as any,
          clinic.id,
          DOCUMENT_SERIES.ADMISSION,
          'ADM',
          admittedAt,
        );

        const admission = await tx.admissions.create({
          data: {
            client_org_id: orgId,
            clinic_id: clinic.id,
            patient_id: input.patient_id,
            admission_number: admissionNumber,
            status: 'admitted',
            admission_type: input.admission_type ?? 'general',
            admitted_at: admittedAt,
            expected_discharge_at: input.expected_discharge_at ?? null,
            admitting_clinician_id: input.admitting_clinician_id,
            attending_clinician_id: input.attending_clinician_id ?? input.admitting_clinician_id,
            department_id: input.department_id ?? null,
            source_appointment_id: input.source_appointment_id ?? null,
            source_encounter_id: input.source_encounter_id ?? null,
            provisional_diagnosis: input.provisional_diagnosis ?? '',
            admission_notes: input.admission_notes ?? '',
            // An insurance admission defaults to package billing intent;
            // everything else itemizes. Overridable until the bill finalises
            // (slice 4).
            billing_mode: input.admission_type === 'insurance' ? 'package' : 'itemized',
            payer_id: input.payer_id ?? null,
            policy_id: input.policy_id ?? null,
            is_critical: input.is_critical ?? false,
            created_by_user_id: user.sub,
          },
        });

        // The occupancy row is what the exclusion constraint judges. If the
        // bed is taken for this period, THIS insert is what fails — and it
        // fails after the admission row exists but inside the same
        // transaction, so both roll back together.
        await tx.bedOccupancies.create({
          data: {
            client_org_id: orgId,
            clinic_id: clinic.id,
            bed_id: bed.id,
            ward_id: bed.ward_id,
            admission_id: admission.id,
            occupancy_kind: 'occupied',
            start_at: admittedAt,
            created_by_user_id: user.sub,
          },
        });

        await tx.beds.update({ where: { id: bed.id }, data: { status: 'occupied' } });

        await tx.admissionEvents.create({
          data: {
            admission_id: admission.id,
            client_org_id: orgId,
            event_type: 'admitted',
            occurred_at: admittedAt,
            payload_json: { to_bed_number: bed.bed_number, to_ward_name: (bed as any).ward?.name ?? null },
            actor_user_id: user.sub,
          },
        });

        return admission;
      });

      await this.notifyAttending(created.id, 'patient_admitted', 'Patient admitted', created.admission_number);
      return this.findOne(created.id, user);
    } catch (err: any) {
      if (isBedOverlapViolation(err)) {
        throw new ConflictException(
          `Bed ${bed.bed_number} is already occupied for that period. Pick another bed or check the time.`,
        );
      }
      throw err;
    }
  }

  // ── Transfer ──────────────────────────────────────────────────────────

  async transferBed(input: TransferAdmissionBedInput, user: JwtPayload) {
    const admission = await this.prisma.admissions.findUnique({
      where: { id: input.admission_id },
      include: { occupancies: { where: { end_at: null, is_cancelled: false }, include: { bed: true, ward: true } } },
    });
    if (!admission || admission.is_deleted) throw new NotFoundException('Admission not found');
    assertSameOrg(user, admission.client_org_id, 'Admission');
    if (!LIVE_STATUSES.includes(admission.status)) {
      throw new BadRequestException(`Cannot transfer a ${admission.status} admission`);
    }

    const toBed = await this.assertBedInScope(input.to_bed_id, user);
    if (toBed.clinic_id !== admission.clinic_id) {
      throw new BadRequestException('Cannot transfer to a bed in a different clinic');
    }
    const current = (admission as any).occupancies?.[0];
    if (current && current.bed_id === toBed.id) {
      throw new BadRequestException('The patient is already in that bed');
    }

    const at = input.transferred_at ?? new Date();
    if (current && at <= current.start_at) {
      throw new BadRequestException('The transfer time must be after the current bed placement started');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // Close the source row FIRST, so the destination insert is the only
        // statement the exclusion constraint can reject — it then fails
        // cleanly with 23P01 rather than colliding with our own open row.
        if (current) {
          await tx.bedOccupancies.update({
            where: { id: current.id },
            data: { end_at: at, end_reason: 'transfer', ended_by_user_id: user.sub },
          });
          await tx.beds.update({ where: { id: current.bed_id }, data: { status: 'cleaning' } });
        }

        await tx.bedOccupancies.create({
          data: {
            client_org_id: admission.client_org_id,
            clinic_id: admission.clinic_id,
            bed_id: toBed.id,
            ward_id: toBed.ward_id,
            admission_id: admission.id,
            occupancy_kind: 'occupied',
            start_at: at,
            reason: input.reason ?? null,
            created_by_user_id: user.sub,
          },
        });

        await tx.beds.update({ where: { id: toBed.id }, data: { status: 'occupied' } });

        await tx.admissionEvents.create({
          data: {
            admission_id: admission.id,
            client_org_id: admission.client_org_id,
            event_type: 'transferred',
            occurred_at: at,
            payload_json: {
              from_bed_number: current?.bed?.bed_number ?? null,
              from_ward_name: current?.ward?.name ?? null,
              to_bed_number: toBed.bed_number,
              to_ward_name: (toBed as any).ward?.name ?? null,
              reason: input.reason ?? null,
            },
            notes: input.reason ?? null,
            actor_user_id: user.sub,
          },
        });
      });
    } catch (err: any) {
      if (isBedOverlapViolation(err)) {
        throw new ConflictException(
          `Bed ${toBed.bed_number} is already occupied for that period. Pick another bed or check the time.`,
        );
      }
      throw err;
    }

    await this.notifyAttending(admission.id, 'bed_transfer_recorded', 'Patient transferred', admission.admission_number);
    return this.findOne(admission.id, user);
  }

  // ── Discharge ─────────────────────────────────────────────────────────

  async discharge(input: DischargeAdmissionInput, user: JwtPayload) {
    const admission = await this.prisma.admissions.findUnique({
      where: { id: input.admission_id },
      include: { occupancies: { where: { end_at: null, is_cancelled: false } } },
    });
    if (!admission || admission.is_deleted) throw new NotFoundException('Admission not found');
    assertSameOrg(user, admission.client_org_id, 'Admission');
    if (admission.status === 'discharged') throw new BadRequestException('This admission is already discharged');
    if (!LIVE_STATUSES.includes(admission.status)) {
      throw new BadRequestException(`Cannot discharge a ${admission.status} admission`);
    }

    const at = input.discharged_at ?? new Date();
    if (at < admission.admitted_at) {
      throw new BadRequestException('Discharge time cannot be before the admission time');
    }
    const current = (admission as any).occupancies?.[0];

    await this.prisma.$transaction(async (tx) => {
      if (current) {
        await tx.bedOccupancies.update({
          where: { id: current.id },
          data: { end_at: at, end_reason: 'discharge', ended_by_user_id: user.sub },
        });
        // The bed goes to cleaning, not straight to available — housekeeping
        // releases it explicitly (releaseBed), which is also what stops the
        // next admission landing in an unturned bed.
        await tx.beds.update({ where: { id: current.bed_id }, data: { status: 'cleaning' } });
      }

      await tx.admissions.update({
        where: { id: admission.id },
        data: {
          status: 'discharged',
          discharged_at: at,
          discharge_type: input.discharge_type ?? 'routine',
          final_diagnosis: input.final_diagnosis ?? admission.final_diagnosis,
        },
      });

      await tx.admissionEvents.create({
        data: {
          admission_id: admission.id,
          client_org_id: admission.client_org_id,
          event_type: 'discharged',
          occurred_at: at,
          payload_json: { reason: input.discharge_type ?? 'routine' },
          notes: input.notes ?? null,
          actor_user_id: user.sub,
        },
      });
    });

    await this.notifyAttending(admission.id, 'patient_discharged', 'Patient discharged', admission.admission_number);
    return this.findOne(admission.id, user);
  }

  // ── Update / cancel ───────────────────────────────────────────────────

  async update(id: string, input: UpdateAdmissionInput, user: JwtPayload) {
    const existing = await this.prisma.admissions.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) throw new NotFoundException('Admission not found');
    assertSameOrg(user, existing.client_org_id, 'Admission');
    if (input.attending_clinician_id) await this.assertClinicianInScope(input.attending_clinician_id, user);

    const attendingChanged =
      !!input.attending_clinician_id && input.attending_clinician_id !== existing.attending_clinician_id;

    await this.prisma.$transaction(async (tx) => {
      await tx.admissions.update({
        where: { id },
        data: {
          attending_clinician_id: input.attending_clinician_id ?? existing.attending_clinician_id,
          department_id: input.department_id !== undefined ? input.department_id : existing.department_id,
          expected_discharge_at:
            input.expected_discharge_at !== undefined ? input.expected_discharge_at : existing.expected_discharge_at,
          provisional_diagnosis: input.provisional_diagnosis ?? existing.provisional_diagnosis,
          final_diagnosis: input.final_diagnosis !== undefined ? input.final_diagnosis : existing.final_diagnosis,
          admission_notes: input.admission_notes ?? existing.admission_notes,
          is_critical: input.is_critical ?? existing.is_critical,
        },
      });

      // Attending-clinician handover is clinically meaningful, so it goes on
      // the visible stay timeline rather than only into the audit log.
      if (attendingChanged) {
        await tx.admissionEvents.create({
          data: {
            admission_id: id,
            client_org_id: existing.client_org_id,
            event_type: 'attending_changed',
            payload_json: { reason: 'Attending clinician handover' },
            actor_user_id: user.sub,
          },
        });
      }
    });

    return this.findOne(id, user);
  }

  async cancel(id: string, reason: string, user: JwtPayload) {
    const admission = await this.prisma.admissions.findUnique({
      where: { id },
      include: { occupancies: { where: { end_at: null, is_cancelled: false } } },
    });
    if (!admission || admission.is_deleted) {
      return { success: false, userErrors: [{ message: 'Admission not found' }] };
    }
    if (!isSameOrg(user, admission.client_org_id)) {
      return { success: false, userErrors: [{ message: 'Admission not found' }] };
    }
    if (admission.status === 'discharged') {
      return { success: false, userErrors: [{ message: 'A discharged admission cannot be cancelled' }] };
    }

    const current = (admission as any).occupancies?.[0];
    await this.prisma.$transaction(async (tx) => {
      if (current) {
        // Cancelled, not ended: this admission should never have held the bed,
        // so the row is voided rather than closed. The exclusion constraint's
        // own WHERE predicate then stops counting it and the bed is genuinely
        // free for the period, including retroactively.
        await tx.bedOccupancies.update({
          where: { id: current.id },
          data: { is_cancelled: true, end_at: new Date(), end_reason: 'cancelled', ended_by_user_id: user.sub },
        });
        await tx.beds.update({ where: { id: current.bed_id }, data: { status: 'available' } });
      }
      await tx.admissions.update({ where: { id }, data: { status: 'cancelled' } });
      await tx.admissionEvents.create({
        data: {
          admission_id: id,
          client_org_id: admission.client_org_id,
          event_type: 'cancelled',
          payload_json: { reason },
          notes: reason,
          actor_user_id: user.sub,
        },
      });
    });

    return { success: true, userErrors: [] };
  }

  // ── Notification ──────────────────────────────────────────────────────
  //
  // Best-effort: a failed notification must never roll back a real clinical
  // state change, so this runs after the transaction and swallows its own
  // errors (the established convention for every dispatch in this codebase).
  private async notifyAttending(admissionId: string, eventType: string, title: string, admissionNumber: string) {
    try {
      const admission = await this.prisma.admissions.findUnique({
        where: { id: admissionId },
        include: { attending_clinician: true, patient: true },
      });
      const userProfile = admission?.attending_clinician
        ? await this.prisma.userProfiles.findFirst({ where: { clinician_id: admission.attending_clinician_id } })
        : null;
      if (!userProfile) return;

      await this.notificationTrigger.dispatch(userProfile.id, eventType, {
        title,
        message: `${this.fullName(admission?.patient)} — ${admissionNumber}`,
        type: 'system',
        priority: 'medium',
        action_url: `/ipd/admissions/${admissionId}`,
      });
    } catch (err) {
      this.logger.error(`Failed to dispatch ${eventType} for admission ${admissionId}: ${(err as Error).message}`);
    }
  }
}
