import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, orgIdForWrite, assertSameOrg, isSameOrg } from '../common/scoping/tenant-scope';
import {
  SaveEncounterNoteInput,
  AddAddendumInput,
  CreateDiagnosisInput,
  OrderInvestigationInput,
  CreateReferralInput,
  UpdateReferralStatusInput,
  RecordVitalsInput,
  VITAL_UNITS,
  CreateEncounterTemplateInput,
  ApplyTemplateInput,
  CreateAttachmentInput,
} from './dto/encounter.input';
import { PatientsService } from '../patients/patients.service';

// REQ135 -- more permissive than insurance.service.ts's own CLAIM_TRANSITIONS
// (money changing hands there warrants a stricter machine): a referral is
// tracking metadata, not a financial workflow, so 'pending' may go straight
// to 'completed'/'declined' without forcing a 'scheduled' stop first --
// real referrals are often only confirmed after the fact, with no separate
// "we scheduled it" step ever recorded. completed/declined are terminal.
const REFERRAL_TRANSITIONS: Record<string, string[]> = {
  pending: ['scheduled', 'completed', 'declined'],
  scheduled: ['completed', 'declined'],
  completed: [],
  declined: [],
};

// REQ020 (Phase 1, slice 2) P0 -- consultation workspace / clinical records.
// Encounters owns client_org_id directly (denormalized from the
// appointment's clinic at creation), same reasoning as Resources (REQ017):
// Patients itself has no client_org_id column of its own.
@Injectable()
export class EncountersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientsService: PatientsService,
  ) {}

  private toGraphQL(encounter: any) {
    if (!encounter) return null;
    const { client_org_id, notes, addenda, diagnoses, attachments, investigation_orders, referrals, vitals, ...rest } = encounter;
    return rest;
  }

  // REQ127 — a TestResults row ordered with this encounter_id, mapped to
  // the encounters module's own lightweight InvestigationOrderType shape.
  private toInvestigationOrderGraphQL(row: any) {
    return {
      id: row.id,
      encounter_id: row.encounter_id,
      test_name: row.test_name,
      test_type: row.test_type,
      urgency: row.urgency,
      status: row.status,
      date_ordered: row.date_ordered,
    };
  }

  private async withRelations(encounter: any) {
    const [notes, addenda, diagnoses, attachments, investigationOrders, referrals, vitals] = await Promise.all([
      this.prisma.encounterNotes.findMany({ where: { encounter_id: encounter.id }, orderBy: { section: 'asc' } }),
      this.prisma.encounterAddenda.findMany({ where: { encounter_id: encounter.id }, orderBy: { created_at: 'asc' } }),
      this.prisma.diagnoses.findMany({ where: { encounter_id: encounter.id }, orderBy: { created_at: 'asc' } }),
      this.prisma.attachments.findMany({ where: { encounter_id: encounter.id }, orderBy: { created_at: 'asc' } }),
      this.prisma.testResults.findMany({ where: { encounter_id: encounter.id }, orderBy: { date_ordered: 'asc' } }),
      this.prisma.referrals.findMany({ where: { encounter_id: encounter.id }, orderBy: { created_at: 'asc' } }),
      this.prisma.vitals.findMany({ where: { encounter_id: encounter.id }, orderBy: { recorded_at: 'asc' } }),
    ]);
    return {
      ...this.toGraphQL(encounter),
      notes,
      addenda,
      diagnoses,
      attachments,
      investigation_orders: investigationOrders.map((r: any) => this.toInvestigationOrderGraphQL(r)),
      referrals,
      vitals,
    };
  }

  // Org + self-scoping (a clinician sees only their own encounters, a
  // patient only their own) for a single-record load, mirroring
  // appointments.service.ts's selfScope() for the same JWT-embedded pattern.
  // Always NotFoundException, never Forbidden, matching assertSameOrg's own
  // convention of not confirming a cross-tenant record's existence.
  private async loadEncounterForUser(id: string, user: JwtPayload) {
    const encounter = await this.prisma.encounters.findUnique({ where: { id } });
    if (!encounter) throw new NotFoundException('Encounter not found');
    assertSameOrg(user, encounter.client_org_id, 'Encounter');
    if (user.roles.includes('patient') && encounter.patient_id !== (user.patient_id ?? '__no_patient_link__')) {
      throw new NotFoundException('Encounter not found');
    }
    if (user.roles.includes('clinician') && encounter.clinician_id !== (user.clinician_id ?? '__no_clinician_link__')) {
      throw new NotFoundException('Encounter not found');
    }
    return encounter;
  }

  // Mirrors patients.service.ts's findOne access checks -- used to gate the
  // cross-encounter allergy banner and patient timeline queries, which are
  // keyed directly by patientId rather than by an encounter this caller
  // already owns.
  private async assertPatientAccess(patientId: string, user: JwtPayload) {
    // REQ065 (REQ018 US-BOOK-02 residue) — widened to a dependant's own
    // records too, matching prescriptions.service.ts/test-results.service.ts's
    // identical fix. This call site was not one of the three the original
    // residue note flagged, found while building REQ024's own US-MSG-05
    // (message-thread timeline linkage) directly touches this same method.
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

  async encounter(id: string, user: JwtPayload) {
    const encounter = await this.loadEncounterForUser(id, user);
    return this.withRelations(encounter);
  }

  // Front-desk/admin worklist, plus a clinician's own encounter list.
  // Deliberately excludes 'patient' -- a patient caller uses
  // patientTimeline() instead of a raw cross-visit list.
  async findAll(user: JwtPayload) {
    const encounters = await this.prisma.encounters.findMany({
      where: {
        ...orgScope(user),
        ...(user.roles.includes('clinician') ? { clinician_id: user.clinician_id ?? '__no_clinician_link__' } : {}),
      },
      orderBy: { created_at: 'desc' },
    });
    return encounters.map((e: any) => this.toGraphQL(e));
  }

  // Idempotent (US-EMR-01): finds the existing encounter for this
  // appointment or creates one lazily -- the integration point with the
  // booking flow. No change needed to check-in (REQ019); a clinician opens
  // the workspace from any appointment and the encounter materializes here.
  async getOrCreateEncounter(appointmentId: string, user: JwtPayload) {
    const appointment = await this.prisma.appointments.findUnique({
      where: { id: appointmentId },
      include: { clinic: true },
    });
    if (!appointment || appointment.is_deleted) {
      throw new NotFoundException('Appointment not found');
    }
    assertSameOrg(user, appointment.clinic.client_org_id, 'Appointment');
    if (user.roles.includes('clinician') && appointment.clinician_id !== (user.clinician_id ?? '__no_clinician_link__')) {
      throw new ForbiddenException('You do not have access to this appointment');
    }
    // Clinics predating the Organizations module can have a null
    // client_org_id (a known, documented gap -- CLAUDE.md's own Architecture
    // section). Encounters.client_org_id is NOT NULL by design (every
    // clinical record must belong to exactly one tenant), so such a clinic
    // has no valid encounter to create yet -- fail closed with a clear error
    // rather than writing an org-less clinical record.
    if (!appointment.clinic.client_org_id) {
      throw new BadRequestException('This clinic is not yet linked to an organization; encounters cannot be created for it');
    }

    const existing = await this.prisma.encounters.findUnique({ where: { appointment_id: appointmentId } });
    if (existing) return this.withRelations(existing);

    // find-then-create is not atomic -- two callers opening the same
    // appointment's workspace within the same instant (confirmed live: React
    // 18 StrictMode's double-effect invocation in dev, but the same race is
    // reachable from a genuine double-click or two browser tabs in
    // production) can both pass the check above and race on create(). The
    // loser's unique-constraint violation on appointment_id is not an error
    // here -- it means the encounter now exists, which is exactly what this
    // method promises its caller either way, so fetch and return it instead
    // of leaking a raw 500.
    try {
      const encounter = await this.prisma.encounters.create({
        data: {
          client_org_id: appointment.clinic.client_org_id,
          appointment_id: appointmentId,
          patient_id: appointment.patient_id,
          clinician_id: appointment.clinician_id,
          // REQ026 (US-TEL-05) — denormalized once, at creation time,
          // matching REQ017's own booking_mode precedent. Appointments.type
          // also carries 'home_visit' (physically present care, just not
          // at the clinic) — that is NOT a teleconsultation mode and must
          // not trip the TPG guard, so only 'video' maps through; anything
          // else (including a future 'audio'/'text' appointment type) is
          // in_person from this guard's own perspective until genuinely
          // built and mapped here explicitly.
          consultation_mode: appointment.type === 'video' ? 'video' : 'in_person',
        },
      });
      return this.withRelations(encounter);
    } catch (e: any) {
      if (e.code === 'P2002') {
        const winner = await this.prisma.encounters.findUnique({ where: { appointment_id: appointmentId } });
        if (winner) return this.withRelations(winner);
      }
      throw e;
    }
  }

  // Upsert on [encounter_id, section]; version increments on every save.
  // Rejected once locked -- the app-level fast path in front of the
  // database trigger, which is the actual medico-legal guarantee (US-EMR-06).
  async saveEncounterNote(input: SaveEncounterNoteInput, user: JwtPayload) {
    const encounter = await this.loadEncounterForUser(input.encounter_id, user);
    if (encounter.locked) {
      throw new BadRequestException('This encounter has been signed and can no longer be edited. Add an addendum instead.');
    }
    const existing = await this.prisma.encounterNotes.findUnique({
      where: { encounter_id_section: { encounter_id: input.encounter_id, section: input.section } },
    });
    return this.prisma.encounterNotes.upsert({
      where: { encounter_id_section: { encounter_id: input.encounter_id, section: input.section } },
      create: { encounter_id: input.encounter_id, section: input.section, content: input.content, version: 1 },
      update: { content: input.content, version: (existing?.version ?? 1) + 1 },
    });
  }

  // One-way -- no unsign mutation exists, matching the immutability intent.
  // Only the treating clinician may sign (not front-desk staff/admin).
  async signEncounter(encounterId: string, user: JwtPayload) {
    const encounter = await this.loadEncounterForUser(encounterId, user);
    if (encounter.locked) {
      throw new BadRequestException('This encounter is already signed');
    }
    if (!user.roles.includes('clinician')) {
      throw new ForbiddenException('Only the treating clinician can sign an encounter');
    }
    const updated = await this.prisma.encounters.update({
      where: { id: encounterId },
      data: { locked: true, status: 'signed', signed_at: new Date(), signed_by_id: user.sub },
    });
    return this.withRelations(updated);
  }

  // Append-only -- allowed regardless of lock state, the only path to add
  // information to a signed encounter.
  async addAddendum(input: AddAddendumInput, user: JwtPayload) {
    await this.loadEncounterForUser(input.encounter_id, user);
    return this.prisma.encounterAddenda.create({
      data: {
        encounter_id: input.encounter_id,
        author_id: user.sub,
        content: input.content,
        reason: input.reason,
      },
    });
  }

  async createDiagnosis(input: CreateDiagnosisInput, user: JwtPayload) {
    const encounter = await this.loadEncounterForUser(input.encounter_id, user);
    if (encounter.locked) {
      throw new BadRequestException('This encounter has been signed and can no longer be edited. Add an addendum instead.');
    }
    return this.prisma.diagnoses.create({
      data: {
        encounter_id: input.encounter_id,
        type: input.type ?? 'diagnosis',
        icd10_code: input.icd10_code,
        text: input.text,
        status: input.status ?? 'active',
      },
    });
  }

  // REQ127 (FR-EMR-08) — reuses TestResults (see the schema comment on
  // TestResults.encounter_id for why this isn't a parallel table): a
  // clinician-ordered investigation is just a TestResults row with
  // encounter_id set and status starting at 'pending', the same lifecycle
  // every other test result already goes through. Same locked-encounter
  // guard as createDiagnosis() -- ordering a new investigation is new
  // clinical content, not permitted on an already-signed encounter.
  async orderInvestigation(input: OrderInvestigationInput, user: JwtPayload) {
    const encounter = await this.loadEncounterForUser(input.encounter_id, user);
    if (encounter.locked) {
      throw new BadRequestException('This encounter has been signed and can no longer be edited. Add an addendum instead.');
    }
    const [patient, orderingUser] = await Promise.all([
      this.prisma.patients.findUnique({ where: { id: encounter.patient_id } }),
      this.prisma.userProfiles.findUnique({ where: { id: user.sub } }),
    ]);
    const row = await this.prisma.testResults.create({
      data: {
        encounter_id: input.encounter_id,
        patient_id: encounter.patient_id,
        patient_name: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown',
        test_name: input.test_name,
        test_type: input.test_type,
        urgency: input.urgency ?? 'routine',
        ordered_by_name: orderingUser ? `${orderingUser.first_name} ${orderingUser.last_name}` : 'Unknown',
        ordered_by_user_id: user.sub,
        status: 'pending',
      },
    });
    return this.toInvestigationOrderGraphQL(row);
  }

  // REQ128 (FR-EMR-10) — referring the patient onward to another
  // specialty/clinician. Same locked-encounter guard as createDiagnosis()/
  // orderInvestigation(). Hard Rule 6: referred_to_clinician_id is a
  // caller-supplied FK, validated against the caller's own org before
  // write, not trusted as-is -- a cross-org id fails closed as
  // NotFoundException, matching bulkReschedule()'s own established pattern
  // for validating a supplied clinician_id.
  async createReferral(input: CreateReferralInput, user: JwtPayload) {
    const encounter = await this.loadEncounterForUser(input.encounter_id, user);
    if (encounter.locked) {
      throw new BadRequestException('This encounter has been signed and can no longer be edited. Add an addendum instead.');
    }
    if (input.referred_to_clinician_id) {
      const target = await this.prisma.clinicians.findUnique({
        where: { id: input.referred_to_clinician_id },
        include: { clinic: true },
      });
      if (!target || !isSameOrg(user, target.clinic.client_org_id)) {
        throw new NotFoundException('Clinician not found');
      }
    }
    return this.prisma.referrals.create({
      data: {
        encounter_id: input.encounter_id,
        patient_id: encounter.patient_id,
        referred_to_specialty: input.referred_to_specialty,
        referred_to_clinician_id: input.referred_to_clinician_id,
        reason: input.reason,
        urgency: input.urgency ?? 'routine',
      },
    });
  }

  // REQ135 -- Referrals has no client_org_id of its own (same reasoning as
  // Diagnoses); org access is asserted via the parent encounter's own
  // direct client_org_id column, one join deep. Broader than createReferral's
  // own clinician-only gate at the resolver -- follow-up on a referral's
  // real-world outcome is administrative tracking, not new clinical
  // content, so front-desk/manager/admin callers may record it too.
  async updateReferralStatus(id: string, input: UpdateReferralStatusInput, user: JwtPayload) {
    const referral = await this.prisma.referrals.findUnique({
      where: { id },
      include: { encounter: true },
    });
    if (!referral) throw new NotFoundException('Referral not found');
    assertSameOrg(user, referral.encounter.client_org_id, 'Referral');

    const legalNext = REFERRAL_TRANSITIONS[referral.status] ?? [];
    if (!legalNext.includes(input.status)) {
      throw new BadRequestException(`Cannot move a referral from '${referral.status}' to '${input.status}'`);
    }
    return this.prisma.referrals.update({ where: { id }, data: { status: input.status } });
  }

  // REQ130 (FR-EMR-05) -- a batch of readings recorded together (one
  // "taking vitals" moment), matching createPrescription's own items-array
  // batch-create pattern. Same locked-encounter guard as
  // createDiagnosis()/orderInvestigation()/createReferral(). unit is
  // server-derived from code (VITAL_UNITS), never client-supplied.
  async recordVitals(input: RecordVitalsInput, user: JwtPayload) {
    const encounter = await this.loadEncounterForUser(input.encounter_id, user);
    if (encounter.locked) {
      throw new BadRequestException('This encounter has been signed and can no longer be edited. Add an addendum instead.');
    }
    await this.prisma.vitals.createMany({
      data: input.readings.map((reading) => ({
        encounter_id: input.encounter_id,
        code: reading.code,
        value: reading.value,
        unit: VITAL_UNITS[reading.code as keyof typeof VITAL_UNITS],
        recorded_by_user_id: user.sub,
      })),
    });
    return this.prisma.vitals.findMany({ where: { encounter_id: input.encounter_id }, orderBy: { recorded_at: 'asc' } });
  }

  // REQ130 (FR-EMR-05) -- the growth-chart query: every reading of one
  // code across every encounter for a patient, chronological. Same access
  // control as patientAllergyBanner()/patientTimeline() (assertPatientAccess).
  async patientVitals(patientId: string, code: string, user: JwtPayload) {
    await this.assertPatientAccess(patientId, user);
    return this.prisma.vitals.findMany({
      where: { code, encounter: { patient_id: patientId } },
      orderBy: { recorded_at: 'asc' },
    });
  }

  // Persistent allergy banner (US-EMR-04): Diagnoses rows with type='allergy',
  // queried across every encounter for the patient -- see REQ020's plan for
  // why there is no separate Allergies table.
  async patientAllergyBanner(patientId: string, user: JwtPayload) {
    await this.assertPatientAccess(patientId, user);
    return this.prisma.diagnoses.findMany({
      where: { type: 'allergy', status: 'active', encounter: { patient_id: patientId } },
      orderBy: { created_at: 'desc' },
    });
  }

  // GraphQL exposes sections_json as a plain String (see
  // CreateEncounterTemplateInput's comment on why) -- stringify here, once,
  // rather than at every call site.
  private templateToGraphQL(template: any) {
    return { ...template, sections_json: JSON.stringify(template.sections_json) };
  }

  // clinician_id set = a personal favourite; null = org-shared. A platform
  // operator's org-shared branch is deliberately unfiltered by org, matching
  // orgScope()'s own documented "platform operators see everything" default.
  async encounterTemplates(specialty: string | undefined, user: JwtPayload) {
    const templates = await this.prisma.encounterTemplates.findMany({
      where: {
        ...(specialty ? { specialty } : {}),
        OR: [
          { clinician_id: user.clinician_id ?? '__no_clinician_link__' },
          { clinician_id: null, ...orgScope(user) },
        ],
      },
      orderBy: { created_at: 'desc' },
    });
    return templates.map((t) => this.templateToGraphQL(t));
  }

  async createEncounterTemplate(input: CreateEncounterTemplateInput, user: JwtPayload) {
    let sections: unknown;
    try {
      sections = JSON.parse(input.sections_json);
    } catch {
      throw new BadRequestException('sections_json must be valid JSON');
    }
    const template = await this.prisma.encounterTemplates.create({
      data: {
        client_org_id: orgIdForWrite(user, 'EncounterTemplate') as string,
        clinician_id: input.org_shared ? null : (user.clinician_id ?? null),
        specialty: input.specialty,
        name: input.name,
        sections_json: sections as any,
      },
    });
    return this.templateToGraphQL(template);
  }

  // US-EMR-03: applies every section from the template in one call.
  async applyTemplate(input: ApplyTemplateInput, user: JwtPayload) {
    const encounter = await this.loadEncounterForUser(input.encounter_id, user);
    if (encounter.locked) {
      throw new BadRequestException('This encounter has been signed and can no longer be edited.');
    }
    const template = await this.prisma.encounterTemplates.findUnique({ where: { id: input.template_id } });
    if (!template) throw new NotFoundException('Template not found');
    const sections = template.sections_json as Record<string, string>;
    await this.prisma.$transaction(
      Object.entries(sections).map(([section, content]) =>
        this.prisma.encounterNotes.upsert({
          where: { encounter_id_section: { encounter_id: input.encounter_id, section } },
          create: { encounter_id: input.encounter_id, section, content: String(content) },
          update: { content: String(content), version: { increment: 1 } },
        }),
      ),
    );
    const updated = await this.prisma.encounters.findUnique({ where: { id: input.encounter_id } });
    return this.withRelations(updated);
  }

  async createAttachment(input: CreateAttachmentInput, user: JwtPayload) {
    await this.loadEncounterForUser(input.encounter_id, user);
    return this.prisma.attachments.create({
      data: {
        encounter_id: input.encounter_id,
        file_ref: input.file_ref,
        mime_type: input.mime_type,
        original_filename: input.original_filename,
        uploaded_by_id: user.sub,
      },
    });
  }

  // US-EMR-07: aggregates Encounters (as visit events, with a complaints
  // snippet), Diagnoses/allergies, Attachments, and the already-real
  // TestResults into one chronological, typed array. Prescriptions'
  // cross-module aggregation is still deliberately out of scope. Messages
  // are now included (REQ024 US-MSG-05) -- scoped to patient_clinic
  // threads the patient's own real login account participates in; a
  // dependant with no login of their own (patients.service.ts's own
  // documented design) simply has none to surface, which is correct, not
  // a gap -- see context/open-questions.md #16 for the standing question
  // on whether that should ever change.
  async patientTimeline(patientId: string, user: JwtPayload) {
    await this.assertPatientAccess(patientId, user);
    const patientUserProfile = await this.prisma.userProfiles.findFirst({ where: { patient_id: patientId, is_deleted: false } });
    const [encounters, diagnoses, attachments, testResults, clinicalThreads] = await Promise.all([
      this.prisma.encounters.findMany({
        where: { patient_id: patientId },
        include: { notes: true },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.diagnoses.findMany({
        where: { encounter: { patient_id: patientId } },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.attachments.findMany({
        where: { encounter: { patient_id: patientId } },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.testResults.findMany({
        where: { patient_id: patientId, is_deleted: false },
        orderBy: { date_ordered: 'desc' },
      }),
      patientUserProfile
        ? this.prisma.messageThreads.findMany({
            where: { thread_type: 'patient_clinic', participants: { some: { user_id: patientUserProfile.id } } },
            orderBy: { last_activity: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    const events = [
      ...encounters.map((e: any) => ({
        id: e.id,
        type: 'encounter',
        date: e.created_at,
        title: e.status === 'signed' ? 'Consultation (signed)' : 'Consultation (in progress)',
        summary: e.notes.find((n: any) => n.section === 'complaints')?.content ?? undefined,
        encounter_id: e.id,
      })),
      ...diagnoses.map((d) => ({
        id: d.id,
        type: d.type === 'allergy' ? 'allergy' : 'diagnosis',
        date: d.created_at,
        title: d.text,
        summary: d.icd10_code ?? undefined,
        encounter_id: d.encounter_id,
      })),
      ...attachments.map((a) => ({
        id: a.id,
        type: 'attachment',
        date: a.created_at,
        title: a.original_filename,
        summary: a.mime_type,
        encounter_id: a.encounter_id,
      })),
      ...testResults.map((t) => ({
        id: t.id,
        type: 'test_result',
        date: t.date_ordered,
        title: t.test_name,
        summary: t.status as string,
        encounter_id: undefined,
      })),
      // REQ024 (US-MSG-05).
      ...clinicalThreads.map((th) => ({
        id: th.id,
        type: 'message_thread',
        date: th.last_activity,
        title: 'Clinical messaging thread',
        summary: th.last_message ?? undefined,
        encounter_id: undefined,
      })),
    ];
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}
