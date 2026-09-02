import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { assertSameOrg, isSameOrg } from '../common/scoping/tenant-scope';
import { VITAL_UNITS } from '../encounters/dto/encounter.input';
import {
  RecordAdmissionVitalsInput,
  RecordIntakeOutputInput,
  CreateAdmissionNoteInput,
  SignAdmissionNoteInput,
  AddAdmissionNoteAddendumInput,
  CreateShiftHandoverInput,
  AcknowledgeShiftHandoverInput,
  IO_INTAKE_CATEGORIES,
  IO_OUTPUT_CATEGORIES,
} from './dto/nursing.input';

// REQ179 (IPD slice 2) — ward charting: vitals (extends the OPD Vitals
// table, see encounters.service.ts#patientVitals), intake/output, admission
// notes (nursing + doctor, one table with a note_kind discriminator, per the
// market research: separate in the UI, not in storage), and SBAR shift
// handover. Medication orders/MAR live in their own services in this same
// module (medication-orders.service.ts / mar.service.ts) since the
// real-stock-consumption transaction shape is a different concern.
@Injectable()
export class NursingService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Scope guard, replicated per-service per this codebase's own
  // established convention (admissions.service.ts, wards.service.ts,
  // pharmacy.service.ts each define their own rather than sharing one). ──
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

  // ── Vitals ────────────────────────────────────────────────────────────

  async recordAdmissionVitals(input: RecordAdmissionVitalsInput, user: JwtPayload) {
    await this.assertAdmissionInScope(input.admission_id, user);
    await this.prisma.vitals.createMany({
      data: input.readings.map((reading) => ({
        admission_id: input.admission_id,
        code: reading.code,
        value: reading.value,
        unit: VITAL_UNITS[reading.code as keyof typeof VITAL_UNITS],
        shift: input.shift,
        recorded_by_user_id: user.sub,
      })),
    });
    return this.admissionVitals(input.admission_id, user);
  }

  async admissionVitals(admissionId: string, user: JwtPayload) {
    await this.assertAdmissionInScope(admissionId, user);
    return this.prisma.vitals.findMany({ where: { admission_id: admissionId }, orderBy: { recorded_at: 'asc' } });
  }

  // ── Intake / output ───────────────────────────────────────────────────

  async recordIntakeOutput(input: RecordIntakeOutputInput, user: JwtPayload) {
    await this.assertAdmissionInScope(input.admission_id, user);
    const allowed = input.direction === 'intake' ? IO_INTAKE_CATEGORIES : IO_OUTPUT_CATEGORIES;
    if (!(allowed as readonly string[]).includes(input.category)) {
      throw new BadRequestException(`"${input.category}" is not a valid category for ${input.direction}`);
    }

    const admission = await this.prisma.admissions.findUnique({ where: { id: input.admission_id } });
    const record = await this.prisma.intakeOutputRecords.create({
      data: {
        client_org_id: admission!.client_org_id,
        admission_id: input.admission_id,
        direction: input.direction,
        category: input.category,
        volume_ml: input.volume_ml,
        recorded_at: input.recorded_at ?? new Date(),
        shift: input.shift,
        notes: input.notes,
        recorded_by_user_id: user.sub,
      },
    });
    return this.ioToGraphQL(record);
  }

  private ioToGraphQL(r: any) {
    return {
      id: r.id,
      direction: r.direction,
      category: r.category,
      volume_ml: r.volume_ml,
      recorded_at: r.recorded_at,
      shift: r.shift,
      notes: r.notes ?? undefined,
      recorded_by_name: r.recorded_by ? this.fullName(r.recorded_by) : undefined,
    };
  }

  async intakeOutputRecords(admissionId: string, user: JwtPayload) {
    await this.assertAdmissionInScope(admissionId, user);
    const records = await this.prisma.intakeOutputRecords.findMany({
      where: { admission_id: admissionId },
      include: { recorded_by: true },
      orderBy: { recorded_at: 'desc' },
    });
    return records.map((r) => this.ioToGraphQL(r));
  }

  // Derived at read time, never stored — the 24h (or caller-chosen) running
  // balance a ward round needs, computed fresh from IntakeOutputRecords so
  // there is never a maintained total that can drift from its own ledger.
  async intakeOutputBalance(admissionId: string, windowHours: number, user: JwtPayload) {
    await this.assertAdmissionInScope(admissionId, user);
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - windowHours * 3_600_000);
    const records = await this.prisma.intakeOutputRecords.findMany({
      where: { admission_id: admissionId, recorded_at: { gte: windowStart, lte: windowEnd } },
    });
    const totalIntake = records.filter((r) => r.direction === 'intake').reduce((sum, r) => sum + r.volume_ml, 0);
    const totalOutput = records.filter((r) => r.direction === 'output').reduce((sum, r) => sum + r.volume_ml, 0);
    return {
      total_intake_ml: totalIntake,
      total_output_ml: totalOutput,
      balance_ml: totalIntake - totalOutput,
      window_start: windowStart,
      window_end: windowEnd,
    };
  }

  // ── Admission notes ───────────────────────────────────────────────────

  private noteToGraphQL(n: any) {
    return {
      id: n.id,
      note_kind: n.note_kind,
      content: n.content,
      subjective: n.subjective ?? undefined,
      objective: n.objective ?? undefined,
      assessment: n.assessment ?? undefined,
      plan: n.plan ?? undefined,
      shift: n.shift ?? undefined,
      note_datetime: n.note_datetime,
      author_name: n.author ? this.fullName(n.author) : undefined,
      signed_at: n.signed_at ?? undefined,
      locked: n.locked,
      addenda: (n.addenda ?? []).map((a: any) => ({
        id: a.id,
        content: a.content,
        reason: a.reason ?? undefined,
        created_at: a.created_at,
        author_name: a.author ? this.fullName(a.author) : undefined,
      })),
      created_at: n.created_at,
    };
  }

  private readonly NOTE_INCLUDE = { author: true, addenda: { include: { author: true }, orderBy: { created_at: 'asc' as const } } };

  async createAdmissionNote(input: CreateAdmissionNoteInput, user: JwtPayload) {
    const admission = await this.assertAdmissionInScope(input.admission_id, user);
    const note = await this.prisma.admissionNotes.create({
      data: {
        client_org_id: admission.client_org_id,
        admission_id: input.admission_id,
        note_kind: input.note_kind,
        content: input.content ?? '',
        subjective: input.subjective,
        objective: input.objective,
        assessment: input.assessment,
        plan: input.plan,
        shift: input.shift,
        note_datetime: input.note_datetime ?? new Date(),
        author_user_id: user.sub,
        author_clinician_id: user.clinician_id ?? null,
      },
      include: this.NOTE_INCLUDE,
    });
    return this.noteToGraphQL(note);
  }

  async signAdmissionNote(input: SignAdmissionNoteInput, user: JwtPayload) {
    const note = await this.prisma.admissionNotes.findUnique({ where: { id: input.note_id } });
    if (!note) throw new NotFoundException('Admission note not found');
    assertSameOrg(user, note.client_org_id, 'Admission note');
    if (note.locked) throw new BadRequestException('This note has already been signed');

    const updated = await this.prisma.admissionNotes.update({
      where: { id: input.note_id },
      data: { locked: true, signed_at: new Date() },
      include: this.NOTE_INCLUDE,
    });
    return this.noteToGraphQL(updated);
  }

  // Append-only — allowed regardless of lock state, the only path to add
  // information to a signed note. Mirrors encounters.service.ts#addAddendum.
  async addAdmissionNoteAddendum(input: AddAdmissionNoteAddendumInput, user: JwtPayload) {
    const note = await this.prisma.admissionNotes.findUnique({ where: { id: input.note_id } });
    if (!note) throw new NotFoundException('Admission note not found');
    assertSameOrg(user, note.client_org_id, 'Admission note');

    await this.prisma.admissionNoteAddenda.create({
      data: { admission_note_id: input.note_id, author_id: user.sub, content: input.content, reason: input.reason },
    });
    const updated = await this.prisma.admissionNotes.findUnique({ where: { id: input.note_id }, include: this.NOTE_INCLUDE });
    return this.noteToGraphQL(updated);
  }

  async admissionNotes(admissionId: string, noteKind: string | undefined, user: JwtPayload) {
    await this.assertAdmissionInScope(admissionId, user);
    const notes = await this.prisma.admissionNotes.findMany({
      where: { admission_id: admissionId, ...(noteKind ? { note_kind: noteKind } : {}) },
      include: this.NOTE_INCLUDE,
      orderBy: { note_datetime: 'desc' },
    });
    return notes.map((n) => this.noteToGraphQL(n));
  }

  // ── Shift handover (SBAR) ─────────────────────────────────────────────

  private handoverToGraphQL(h: any) {
    return {
      id: h.id,
      ward_id: h.ward_id,
      ward_name: h.ward?.name ?? undefined,
      from_shift: h.from_shift,
      to_shift: h.to_shift,
      handover_at: h.handover_at,
      situation: h.situation,
      background: h.background,
      assessment: h.assessment,
      recommendation: h.recommendation,
      pending_tasks: h.pending_tasks ?? undefined,
      from_user_name: h.from_user ? this.fullName(h.from_user) : undefined,
      to_user_name: h.to_user ? this.fullName(h.to_user) : undefined,
      acknowledged_at: h.acknowledged_at ?? undefined,
    };
  }

  private readonly HANDOVER_INCLUDE = { ward: true, from_user: true, to_user: true };

  async createShiftHandover(input: CreateShiftHandoverInput, user: JwtPayload) {
    const admission = await this.assertAdmissionInScope(input.admission_id, user);
    const ward = await this.prisma.wards.findUnique({ where: { id: input.ward_id } });
    if (!ward || ward.is_deleted) throw new BadRequestException('Ward not found');
    if (!isSameOrg(user, ward.client_org_id)) throw new BadRequestException('Ward not found');

    const handover = await this.prisma.shiftHandovers.create({
      data: {
        client_org_id: admission.client_org_id,
        admission_id: input.admission_id,
        ward_id: input.ward_id,
        from_shift: input.from_shift,
        to_shift: input.to_shift,
        handover_at: input.handover_at ?? new Date(),
        situation: input.situation ?? '',
        background: input.background ?? '',
        assessment: input.assessment ?? '',
        recommendation: input.recommendation ?? '',
        pending_tasks: input.pending_tasks,
        from_user_id: user.sub,
        to_user_id: input.to_user_id,
      },
      include: this.HANDOVER_INCLUDE,
    });
    return this.handoverToGraphQL(handover);
  }

  async acknowledgeShiftHandover(input: AcknowledgeShiftHandoverInput, user: JwtPayload) {
    const handover = await this.prisma.shiftHandovers.findUnique({ where: { id: input.handover_id } });
    if (!handover) throw new NotFoundException('Shift handover not found');
    assertSameOrg(user, handover.client_org_id, 'Shift handover');
    if (handover.acknowledged_at) throw new BadRequestException('This handover has already been acknowledged');

    const updated = await this.prisma.shiftHandovers.update({
      where: { id: input.handover_id },
      data: { acknowledged_at: new Date(), to_user_id: handover.to_user_id ?? user.sub },
      include: this.HANDOVER_INCLUDE,
    });
    return this.handoverToGraphQL(updated);
  }

  async admissionHandovers(admissionId: string, user: JwtPayload) {
    await this.assertAdmissionInScope(admissionId, user);
    const handovers = await this.prisma.shiftHandovers.findMany({
      where: { admission_id: admissionId },
      include: this.HANDOVER_INCLUDE,
      orderBy: { handover_at: 'desc' },
    });
    return handovers.map((h) => this.handoverToGraphQL(h));
  }

  async wardHandovers(wardId: string, user: JwtPayload) {
    const ward = await this.prisma.wards.findUnique({ where: { id: wardId } });
    if (!ward || ward.is_deleted) throw new NotFoundException('Ward not found');
    assertSameOrg(user, ward.client_org_id, 'Ward');
    const handovers = await this.prisma.shiftHandovers.findMany({
      where: { ward_id: wardId },
      include: this.HANDOVER_INCLUDE,
      orderBy: { handover_at: 'desc' },
      take: 50,
    });
    return handovers.map((h) => this.handoverToGraphQL(h));
  }
}
