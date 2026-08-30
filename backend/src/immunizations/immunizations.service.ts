import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordImmunizationInput } from './dto/record-immunization.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { assertSameOrg } from '../common/scoping/tenant-scope';
import { PatientsService } from '../patients/patients.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const DUE_SOON_WINDOW_DAYS = 30;

export type ImmunizationStatus = 'administered' | 'overdue' | 'due_soon' | 'upcoming';

// Exported for direct unit coverage of the pure due/overdue/upcoming math,
// without needing a live patient row -- same convention as
// notification-trigger.service.ts's own exported isWithinQuietHours().
export function computeImmunizationStatus(dueDate: Date, hasRecord: boolean, now: Date): ImmunizationStatus {
  if (hasRecord) return 'administered';
  const daysUntilDue = (dueDate.getTime() - now.getTime()) / DAY_MS;
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= DUE_SOON_WINDOW_DAYS) return 'due_soon';
  return 'upcoming';
}

@Injectable()
export class ImmunizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientsService: PatientsService,
  ) {}

  private toRecordGraphQL(row: any) {
    return {
      id: row.id,
      patient_id: row.patient_id,
      schedule_item_id: row.schedule_item_id ?? undefined,
      encounter_id: row.encounter_id ?? undefined,
      vaccine_name: row.vaccine_name,
      dose_number: row.dose_number,
      administered_at: row.administered_at.toISOString(),
      administered_by_name: row.administeredBy ? `${row.administeredBy.first_name} ${row.administeredBy.last_name}` : undefined,
      batch_no: row.batch_no ?? undefined,
      site: row.site ?? undefined,
      notes: row.notes ?? undefined,
    };
  }

  // Mirrors encounters.service.ts#assertPatientAccess() exactly -- a
  // patient-direct query keyed by patientId rather than by an encounter the
  // caller already owns. Duplicated inline, not imported from
  // EncountersService, matching this codebase's own established
  // per-domain-duplicates-its-own-check convention (test-results.service.ts
  // does the identical thing rather than depending on EncountersService).
  private async assertPatientAccess(patientId: string, user: JwtPayload) {
    if (user.roles.includes('patient')) {
      const allowedIds = await this.patientsService.ownAndDependantPatientIds(user);
      if (!allowedIds.includes(patientId)) {
        throw new NotFoundException('Patient not found');
      }
      return;
    }
    if (user.roles.includes('clinician')) {
      const treated = await this.prisma.appointments.findFirst({
        where: { patient_id: patientId, clinician_id: user.clinician_id ?? '__no_clinician_link__' },
      });
      if (!treated) throw new NotFoundException('Patient not found');
      return;
    }
    if (user.client_org_id) {
      const [hasAccess, hasAny] = await Promise.all([
        this.prisma.appointments.findFirst({ where: { patient_id: patientId, clinic: { client_org_id: user.client_org_id } } }),
        this.prisma.appointments.findFirst({ where: { patient_id: patientId } }),
      ]);
      if (hasAny && !hasAccess) throw new NotFoundException('Patient not found');
    }
  }

  async immunizationSchedule() {
    const rows = await this.prisma.immunizationScheduleItems.findMany({
      where: { is_active: true, is_deleted: false },
      orderBy: { due_age_days: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      vaccine_name: r.vaccine_name,
      dose_number: r.dose_number,
      due_age_days: r.due_age_days,
      is_active: r.is_active,
    }));
  }

  async patientImmunizations(patientId: string, user: JwtPayload) {
    await this.assertPatientAccess(patientId, user);
    const rows = await this.prisma.immunizationRecords.findMany({
      where: { patient_id: patientId, is_deleted: false },
      include: { administeredBy: true },
      orderBy: { administered_at: 'desc' },
    });
    return rows.map((r) => this.toRecordGraphQL(r));
  }

  // Shared with the reminder sweep -- the sweep must classify exactly the
  // same way this query does, never re-derive its own status logic.
  async computePatientStatus(patientId: string, now: Date = new Date()) {
    const patient = await this.prisma.patients.findUnique({ where: { id: patientId } });
    if (!patient || patient.is_deleted) {
      throw new NotFoundException('Patient not found');
    }
    const [scheduleItems, records] = await Promise.all([
      this.prisma.immunizationScheduleItems.findMany({ where: { is_active: true, is_deleted: false }, orderBy: { due_age_days: 'asc' } }),
      this.prisma.immunizationRecords.findMany({ where: { patient_id: patientId, is_deleted: false }, include: { administeredBy: true } }),
    ]);

    return scheduleItems.map((item) => {
      // Primary match: an explicit link to this schedule item. Fallback: a
      // record entered without picking one, matched by vaccine+dose --
      // covers a catch-up/off-schedule entry recorded against the same
      // vaccine/dose this item represents.
      const matched =
        records.find((r) => r.schedule_item_id === item.id) ??
        records.find((r) => r.schedule_item_id === null && r.vaccine_name === item.vaccine_name && r.dose_number === item.dose_number);
      const dueDate = new Date(patient.date_of_birth.getTime() + item.due_age_days * DAY_MS);
      return {
        schedule_item_id: item.id,
        vaccine_name: item.vaccine_name,
        dose_number: item.dose_number,
        due_date: dueDate.toISOString().split('T')[0],
        status: computeImmunizationStatus(dueDate, !!matched, now),
        administered_record: matched ? this.toRecordGraphQL(matched) : undefined,
      };
    });
  }

  async patientImmunizationStatus(patientId: string, user: JwtPayload) {
    await this.assertPatientAccess(patientId, user);
    return this.computePatientStatus(patientId);
  }

  async recordImmunization(input: RecordImmunizationInput, user: JwtPayload) {
    const patient = await this.prisma.patients.findUnique({ where: { id: input.patient_id } });
    if (!patient || patient.is_deleted) {
      throw new BadRequestException('Patient not found');
    }
    assertSameOrg(user, patient.client_org_id, 'Patient');

    if (input.schedule_item_id) {
      const item = await this.prisma.immunizationScheduleItems.findUnique({ where: { id: input.schedule_item_id } });
      if (!item || item.is_deleted) {
        throw new BadRequestException('Schedule item not found');
      }
    }

    const row = await this.prisma.immunizationRecords.create({
      data: {
        patient_id: input.patient_id,
        schedule_item_id: input.schedule_item_id,
        encounter_id: input.encounter_id,
        vaccine_name: input.vaccine_name,
        dose_number: input.dose_number,
        administered_at: input.administered_at ? new Date(input.administered_at) : new Date(),
        administered_by_user_id: user.sub,
        batch_no: input.batch_no,
        site: input.site,
        notes: input.notes,
      },
      include: { administeredBy: true },
    });
    return this.toRecordGraphQL(row);
  }
}
