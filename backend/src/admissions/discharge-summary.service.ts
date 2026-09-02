import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, assertSameOrg, isSameOrg, orgIdForWrite } from '../common/scoping/tenant-scope';
import {
  CreateDischargeSummaryTemplateInput,
  CreateDischargeSummaryInput,
  UpdateDischargeSummaryInput,
  SignDischargeSummaryInput,
} from './dto/admission.input';

const formatDateTime = (d: Date) =>
  new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// REQ179 (IPD slice 2) — discharge summaries. "Template-based" is real: the
// summary's free-text sections are pre-filled server-side from
// AdmissionEvents and the active medication list at create() time, not a
// blank form. Locked/hashed exactly like Prescriptions (pdf_hash over
// canonical clinical content, never rendered PDF bytes — see that
// service's own computeContentHash comment for why) and immutable once
// signed via the DB's reject_write_if_locked() trigger, mirroring
// EncounterAddenda: an addendum-style correction after signing is out of
// this slice's scope (no discharge-summary-addendum table exists), so a
// signed summary can only be corrected by a fresh future slice, matching
// this codebase's own "record the gap, don't silently guess" convention.
@Injectable()
export class DischargeSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertAdmissionInScope(admissionId: string, user: JwtPayload) {
    const admission = await this.prisma.admissions.findUnique({ where: { id: admissionId } });
    if (!admission || admission.is_deleted) throw new NotFoundException('Admission not found');
    assertSameOrg(user, admission.client_org_id, 'Admission');
    return admission;
  }

  private fullName(row: any): string {
    if (!row) return '';
    return [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || row.full_name || '';
  }

  // ── Templates ─────────────────────────────────────────────────────────

  private templateToGraphQL(t: any) {
    return {
      id: t.id,
      clinic_id: t.clinic_id ?? undefined,
      name: t.name,
      specialty: t.specialty ?? undefined,
      sections: ((t.sections_json as any[]) ?? []).map((s) => ({ key: s.key, label: s.label, default_text: s.default ?? s.default_text })),
      is_active: t.is_active,
    };
  }

  async dischargeSummaryTemplates(clinicId: string | undefined, user: JwtPayload) {
    const templates = await this.prisma.dischargeSummaryTemplates.findMany({
      where: { is_deleted: false, is_active: true, ...(clinicId ? { OR: [{ clinic_id: clinicId }, { clinic_id: null }] } : {}), ...orgScope(user) },
      orderBy: { name: 'asc' },
    });
    return templates.map((t) => this.templateToGraphQL(t));
  }

  async createDischargeSummaryTemplate(input: CreateDischargeSummaryTemplateInput, user: JwtPayload) {
    if (input.clinic_id) {
      const clinic = await this.prisma.clinics.findUnique({ where: { id: input.clinic_id } });
      if (!clinic || clinic.is_deleted) throw new BadRequestException('Clinic not found');
      if (!isSameOrg(user, clinic.client_org_id)) throw new BadRequestException('Clinic not found');
    }
    const template = await this.prisma.dischargeSummaryTemplates.create({
      data: {
        client_org_id: orgIdForWrite(user, 'DischargeSummaryTemplate') as string,
        clinic_id: input.clinic_id,
        name: input.name,
        specialty: input.specialty,
        department_id: input.department_id,
        sections_json: input.sections.map((s) => ({ key: s.key, label: s.label, default: s.default_text ?? '' })) as any,
      },
    });
    return this.templateToGraphQL(template);
  }

  // ── Discharge summary ─────────────────────────────────────────────────

  private toGraphQL(d: any) {
    return {
      id: d.id,
      admission_id: d.admission_id,
      template_id: d.template_id ?? undefined,
      chief_complaint: d.chief_complaint,
      history: d.history,
      examination_findings: d.examination_findings,
      final_diagnosis: d.final_diagnosis,
      course_in_hospital: d.course_in_hospital,
      procedures_performed: d.procedures_performed,
      investigations_summary: d.investigations_summary,
      condition_at_discharge: d.condition_at_discharge,
      discharge_prescription_id: d.discharge_prescription_id ?? undefined,
      discharge_medications: d.discharge_medications,
      diet_advice: d.diet_advice,
      follow_up_advice: d.follow_up_advice,
      follow_up_date: d.follow_up_date ?? undefined,
      emergency_instructions: d.emergency_instructions,
      icd10_codes: (d.icd10_codes as string[] | null) ?? undefined,
      prepared_by_name: d.prepared_by ? this.fullName(d.prepared_by) : undefined,
      signed_by_name: d.signed_by ? this.fullName(d.signed_by) : undefined,
      signed_at: d.signed_at ?? undefined,
      locked: d.locked,
      pdf_hash: d.pdf_hash ?? undefined,
      created_at: d.created_at,
    };
  }

  private readonly INCLUDE = { prepared_by: true, signed_by: true };

  // Pre-fills course_in_hospital (the admission timeline) and
  // discharge_medications (the current active order list) server-side —
  // the clinician edits and corrects rather than starting from a blank
  // section, matching EncounterTemplates' own "template-based" intent.
  private async buildPrefill(admissionId: string) {
    const [events, activeOrders] = await Promise.all([
      this.prisma.admissionEvents.findMany({ where: { admission_id: admissionId }, orderBy: { occurred_at: 'asc' } }),
      this.prisma.ipdMedicationOrders.findMany({
        where: { admission_id: admissionId, status: { in: ['active', 'held'] } },
        include: { drug: true },
      }),
    ]);

    const eventLabel: Record<string, string> = {
      admitted: 'Admitted',
      transferred: 'Transferred',
      attending_changed: 'Attending clinician changed',
      discharged: 'Discharged',
      cancelled: 'Admission cancelled',
    };
    const courseLines = events.map((e: any) => {
      const payload = (e.payload_json ?? {}) as Record<string, any>;
      const detail = payload.to_ward_name && payload.to_bed_number ? ` — ${payload.to_ward_name}, Bed ${payload.to_bed_number}` : '';
      return `${formatDateTime(e.occurred_at)}: ${eventLabel[e.event_type] ?? e.event_type}${detail}`;
    });

    const medicationLines = activeOrders.map(
      (o: any) => `${o.drug?.name ?? 'Unknown drug'} ${o.dose}${o.dose_unit ?? ''} ${o.route} ${o.frequency}`,
    );

    return {
      course_in_hospital: courseLines.join('\n'),
      discharge_medications: medicationLines.join('\n'),
    };
  }

  async findByAdmission(admissionId: string, user: JwtPayload) {
    await this.assertAdmissionInScope(admissionId, user);
    const summary = await this.prisma.dischargeSummaries.findUnique({ where: { admission_id: admissionId }, include: this.INCLUDE });
    return summary ? this.toGraphQL(summary) : null;
  }

  async create(input: CreateDischargeSummaryInput, user: JwtPayload) {
    const admission = await this.assertAdmissionInScope(input.admission_id, user);
    const existing = await this.prisma.dischargeSummaries.findUnique({ where: { admission_id: input.admission_id } });
    if (existing) throw new ConflictException('A discharge summary already exists for this admission');

    if (input.template_id) {
      const template = await this.prisma.dischargeSummaryTemplates.findUnique({ where: { id: input.template_id } });
      if (!template || template.is_deleted) throw new BadRequestException('Discharge summary template not found');
      if (!isSameOrg(user, template.client_org_id)) throw new BadRequestException('Discharge summary template not found');
    }

    const prefill = await this.buildPrefill(input.admission_id);
    const summary = await this.prisma.dischargeSummaries.create({
      data: {
        client_org_id: admission.client_org_id,
        admission_id: input.admission_id,
        template_id: input.template_id,
        final_diagnosis: admission.final_diagnosis ?? admission.provisional_diagnosis ?? '',
        course_in_hospital: prefill.course_in_hospital,
        discharge_medications: prefill.discharge_medications,
        prepared_by_user_id: user.sub,
      },
      include: this.INCLUDE,
    });
    return this.toGraphQL(summary);
  }

  async update(id: string, input: UpdateDischargeSummaryInput, user: JwtPayload) {
    const existing = await this.prisma.dischargeSummaries.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Discharge summary not found');
    assertSameOrg(user, existing.client_org_id, 'Discharge summary');
    if (existing.locked) {
      throw new BadRequestException('This discharge summary has been signed and can no longer be edited');
    }

    const updated = await this.prisma.dischargeSummaries.update({
      where: { id },
      data: {
        chief_complaint: input.chief_complaint ?? existing.chief_complaint,
        history: input.history ?? existing.history,
        examination_findings: input.examination_findings ?? existing.examination_findings,
        final_diagnosis: input.final_diagnosis ?? existing.final_diagnosis,
        course_in_hospital: input.course_in_hospital ?? existing.course_in_hospital,
        procedures_performed: input.procedures_performed ?? existing.procedures_performed,
        investigations_summary: input.investigations_summary ?? existing.investigations_summary,
        condition_at_discharge: input.condition_at_discharge ?? existing.condition_at_discharge,
        discharge_medications: input.discharge_medications ?? existing.discharge_medications,
        diet_advice: input.diet_advice ?? existing.diet_advice,
        follow_up_advice: input.follow_up_advice ?? existing.follow_up_advice,
        follow_up_date: input.follow_up_date !== undefined ? input.follow_up_date : existing.follow_up_date,
        emergency_instructions: input.emergency_instructions ?? existing.emergency_instructions,
        icd10_codes: input.icd10_codes !== undefined ? (input.icd10_codes as any) : existing.icd10_codes,
      },
      include: this.INCLUDE,
    });
    return this.toGraphQL(updated);
  }

  // SHA-256 over the summary's own canonical clinical content — the exact
  // Prescriptions.computeContentHash precedent, never rendered PDF bytes.
  private computeContentHash(d: {
    admission_id: string;
    final_diagnosis: string;
    course_in_hospital: string;
    discharge_medications: string;
    follow_up_advice: string;
  }): string {
    const canonical = JSON.stringify({
      admission_id: d.admission_id,
      final_diagnosis: d.final_diagnosis,
      course_in_hospital: d.course_in_hospital,
      discharge_medications: d.discharge_medications,
      follow_up_advice: d.follow_up_advice,
    });
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  async sign(input: SignDischargeSummaryInput, user: JwtPayload) {
    const existing = await this.prisma.dischargeSummaries.findUnique({ where: { id: input.discharge_summary_id } });
    if (!existing) throw new NotFoundException('Discharge summary not found');
    assertSameOrg(user, existing.client_org_id, 'Discharge summary');
    if (existing.locked) throw new BadRequestException('This discharge summary has already been signed');
    if (!user.clinician_id) throw new BadRequestException('Only a clinician can sign a discharge summary');

    const pdfHash = this.computeContentHash(existing);
    const updated = await this.prisma.dischargeSummaries.update({
      where: { id: input.discharge_summary_id },
      data: { locked: true, signed_at: new Date(), signed_by_clinician_id: user.clinician_id, pdf_hash: pdfHash },
      include: this.INCLUDE,
    });
    return this.toGraphQL(updated);
  }
}
