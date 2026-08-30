import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollInRegistryInput, MarkRegistryReviewedInput, ResolveRegistryEnrollmentInput } from './dto/chronic-registry.input';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { assertSameOrg, orgScopeVia } from '../common/scoping/tenant-scope';

const DAY_MS = 24 * 60 * 60 * 1000;
const DUE_SOON_WINDOW_DAYS = 30;
// A fixed interval for both conditions -- a stated simplification, not a
// per-condition clinically-validated cadence this codebase has any real
// source for (see REQ168's own note).
export const REVIEW_INTERVAL_DAYS = 90;

// Diagnoses.icd10_code is free text with no guaranteed cleanliness
// (REQ108's own schema comment) -- these prefixes only ever power a
// *suggestion*, never an automatic enrollment.
const ICD10_PREFIXES: Record<string, string[]> = {
  diabetes: ['E10', 'E11', 'E13'],
  hypertension: ['I10', 'I11', 'I12', 'I13', 'I15'],
};

export type RecallStatus = 'overdue' | 'due_soon' | 'upcoming';

// Exported for direct unit coverage, same convention as
// immunizations.service.ts's own computeImmunizationStatus().
export function computeRecallStatus(lastReviewedAt: Date, now: Date): RecallStatus {
  const dueDate = new Date(lastReviewedAt.getTime() + REVIEW_INTERVAL_DAYS * DAY_MS);
  const daysUntilDue = (dueDate.getTime() - now.getTime()) / DAY_MS;
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= DUE_SOON_WINDOW_DAYS) return 'due_soon';
  return 'upcoming';
}

@Injectable()
export class ChronicRegistriesService {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(row: any, now: Date) {
    return {
      id: row.id,
      patient_id: row.patient_id,
      patient_name: `${row.patient.first_name} ${row.patient.last_name}`,
      condition: row.condition,
      status: row.status,
      enrolled_at: row.enrolled_at.toISOString(),
      enrolled_by_name: row.enrolledBy ? `${row.enrolledBy.first_name} ${row.enrolledBy.last_name}` : undefined,
      last_reviewed_at: row.last_reviewed_at.toISOString(),
      notes: row.notes ?? undefined,
      recall_status: computeRecallStatus(row.last_reviewed_at, now),
    };
  }

  async chronicRegistrySuggestions(condition: string, user: JwtPayload) {
    const prefixes = ICD10_PREFIXES[condition] ?? [];
    const diagnoses = await this.prisma.diagnoses.findMany({
      where: {
        ...orgScopeVia(user, 'encounter'),
        OR: prefixes.map((p) => ({ icd10_code: { startsWith: p } })),
      },
      include: { encounter: { include: { patient: true } } },
      orderBy: { created_at: 'desc' },
    });

    const candidatePatientIds = [...new Set(diagnoses.map((d) => d.encounter.patient_id))];
    const alreadyEnrolled = await this.prisma.chronicRegistryEnrollments.findMany({
      where: { condition: condition as any, is_deleted: false, patient_id: { in: candidatePatientIds } },
      select: { patient_id: true },
    });
    const enrolledIds = new Set(alreadyEnrolled.map((e) => e.patient_id));

    const seen = new Set<string>();
    const suggestions: any[] = [];
    for (const d of diagnoses) {
      const patientId = d.encounter.patient_id;
      if (enrolledIds.has(patientId) || seen.has(patientId)) continue;
      seen.add(patientId);
      suggestions.push({
        patient_id: patientId,
        patient_name: `${d.encounter.patient.first_name} ${d.encounter.patient.last_name}`,
        matched_icd10_code: d.icd10_code,
        matched_diagnosis_text: d.text,
      });
    }
    return suggestions;
  }

  async registryEnrollments(condition: string | undefined, user: JwtPayload) {
    const rows = await this.prisma.chronicRegistryEnrollments.findMany({
      where: {
        is_deleted: false,
        status: 'active',
        ...(condition ? { condition: condition as any } : {}),
        ...orgScopeVia(user, 'patient'),
      },
      include: { patient: true, enrolledBy: true },
      orderBy: { last_reviewed_at: 'asc' },
    });
    const now = new Date();
    return rows.map((r) => this.toGraphQL(r, now));
  }

  async enrollInRegistry(input: EnrollInRegistryInput, user: JwtPayload) {
    const patient = await this.prisma.patients.findUnique({ where: { id: input.patient_id } });
    if (!patient || patient.is_deleted) {
      throw new BadRequestException('Patient not found');
    }
    assertSameOrg(user, patient.client_org_id, 'Patient');

    const existing = await this.prisma.chronicRegistryEnrollments.findUnique({
      where: { patient_id_condition: { patient_id: input.patient_id, condition: input.condition as any } },
    });
    if (existing) {
      if (existing.status === 'active' && !existing.is_deleted) {
        throw new BadRequestException('Patient is already enrolled in this registry');
      }
      // A previously resolved registration -- reactivate rather than
      // violate the [patient_id, condition] unique constraint with a
      // second row.
      const row = await this.prisma.chronicRegistryEnrollments.update({
        where: { id: existing.id },
        data: {
          status: 'active',
          is_deleted: false,
          notes: input.notes,
          enrolled_by_user_id: user.sub,
          enrolled_at: new Date(),
          last_reviewed_at: new Date(),
        },
        include: { patient: true, enrolledBy: true },
      });
      return this.toGraphQL(row, new Date());
    }

    const row = await this.prisma.chronicRegistryEnrollments.create({
      data: {
        patient_id: input.patient_id,
        condition: input.condition as any,
        notes: input.notes,
        enrolled_by_user_id: user.sub,
      },
      include: { patient: true, enrolledBy: true },
    });
    return this.toGraphQL(row, new Date());
  }

  async markRegistryReviewed(input: MarkRegistryReviewedInput, user: JwtPayload) {
    const enrollment = await this.prisma.chronicRegistryEnrollments.findUnique({
      where: { id: input.enrollment_id },
      include: { patient: true },
    });
    if (!enrollment || enrollment.is_deleted) {
      throw new NotFoundException('Enrollment not found');
    }
    assertSameOrg(user, enrollment.patient.client_org_id, 'Enrollment');
    const row = await this.prisma.chronicRegistryEnrollments.update({
      where: { id: input.enrollment_id },
      data: { last_reviewed_at: new Date() },
      include: { patient: true, enrolledBy: true },
    });
    return this.toGraphQL(row, new Date());
  }

  async resolveRegistryEnrollment(input: ResolveRegistryEnrollmentInput, user: JwtPayload) {
    const enrollment = await this.prisma.chronicRegistryEnrollments.findUnique({
      where: { id: input.enrollment_id },
      include: { patient: true },
    });
    if (!enrollment || enrollment.is_deleted) {
      throw new NotFoundException('Enrollment not found');
    }
    assertSameOrg(user, enrollment.patient.client_org_id, 'Enrollment');
    const row = await this.prisma.chronicRegistryEnrollments.update({
      where: { id: input.enrollment_id },
      data: { status: 'resolved' },
      include: { patient: true, enrolledBy: true },
    });
    return this.toGraphQL(row, new Date());
  }
}
