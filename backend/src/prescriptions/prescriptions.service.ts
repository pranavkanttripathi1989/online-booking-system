import { Injectable, NotFoundException, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScopeVia, orgIdForWrite, isSameOrg } from '../common/scoping/tenant-scope';
import { CreatePrescriptionInput, CreatePrescriptionSetInput, PrescriptionItemInput } from './dto/prescription.input';
import { PatientsService } from '../patients/patients.service';
import { NotificationProviderConfigService } from '../notifications/notification-provider-config.service';
import { EncountersService } from '../encounters/encounters.service';
import { findAllergyConflict } from './allergy-check';
import { computeObstetricDates } from './obstetric-dates';

// REQ109 — same 6-digit-numeric-OTP shape auth.service.ts's own
// requestOtp()/verifyOtp() use, and the same lockout threshold
// (OTP_MAX_ATTEMPTS), deliberately NOT imported from auth.service.ts
// (not exported, and this domain's own OTP is a durable DB row, not a
// Redis key — see PLAN149 on why).
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? 3);
const SHARE_LINK_TTL_MINUTES = 15;
const RX_SHARE_PURPOSE = 'rx_share';

// REQ021 (Phase 1, slice 3) P0 -- prescription builder, print view, and
// repeat-Rx. Prescriptions has no client_org_id of its own -- scoped
// indirectly via encounter.client_org_id, the same reasoning as every
// other model hanging off Encounters (REQ020's own precedent).

// US-RX-01: qty auto-calculates from frequency x duration so a clinician
// never does the arithmetic. SOS (as-needed) has no fixed daily count, so
// qty is left null rather than guessed at.
const FREQUENCY_PER_DAY: Record<string, number | null> = {
  OD: 1,
  BD: 2,
  TDS: 3,
  QID: 4,
  HS: 1,
  SOS: null,
};

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientsService: PatientsService,
    private readonly jwtService: JwtService,
    private readonly providerConfigService: NotificationProviderConfigService,
    private readonly encountersService: EncountersService,
  ) {}

  private calculateQty(frequency: string, durationDays?: number): number | undefined {
    const perDay = FREQUENCY_PER_DAY[frequency];
    if (perDay == null || !durationDays) return undefined;
    return perDay * durationDays;
  }

  private orgScope(user: JwtPayload) {
    return orgScopeVia(user, 'encounter');
  }

  // REQ129 (US-RX-08) -- SHA-256 over the prescription's own canonical
  // clinical content, not rendered PDF bytes (pdfkit stamps a wall-clock
  // CreationDate into every PDF it produces, which would make two renders
  // of identical content hash differently). Item order is stable (create
  // order, Prisma's default when no orderBy is given, matching every other
  // read of prescription.items in this file) so this is deterministic
  // across repeated calls against the same row.
  private computeContentHash(prescription: { patient_id: string; clinician_id: string; encounter_id: string; issued_at: Date }, items: any[]): string {
    const canonical = JSON.stringify({
      patient_id: prescription.patient_id,
      clinician_id: prescription.clinician_id,
      encounter_id: prescription.encounter_id,
      issued_at: prescription.issued_at.toISOString(),
      items: items.map((i) => ({
        drug_id: i.drug_id,
        dose: i.dose,
        frequency: i.frequency,
        route: i.route ?? null,
        duration_days: i.duration_days ?? null,
        qty: i.qty ?? null,
        instructions: i.instructions ?? null,
      })),
    });
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  private async itemsToGraphQL(items: any[]) {
    const drugIds = [...new Set(items.map((i) => i.drug_id))];
    const drugs = await this.prisma.drugs.findMany({ where: { id: { in: drugIds } } });
    const drugById = new Map(drugs.map((d) => [d.id, d]));
    // REQ171 -- Drugs.composition already existed and was never selected
    // here; a combination drug's composition line on the printout.
    return items.map((i) => ({
      ...i,
      drug_name: drugById.get(i.drug_id)?.name ?? 'Unknown drug',
      composition: drugById.get(i.drug_id)?.composition ?? undefined,
    }));
  }

  // REQ137 (US-INS-06) — used by InsuranceService to auto-attach an
  // appointment's issued prescriptions as claim evidence. Access control
  // is already enforced by the caller (InsuranceService#loadClaimForUser
  // validates the claim's own org before this is ever called), so this
  // is a plain data fetch on an already-authorized encounter id, not a
  // second independent authorization check.
  async prescriptionsForEncounter(encounterId: string) {
    const prescriptions = await this.prisma.prescriptions.findMany({
      where: { encounter_id: encounterId },
      include: { items: true },
      orderBy: { issued_at: 'desc' },
    });
    return Promise.all(
      prescriptions.map(async (p) => ({ ...p, items: await this.itemsToGraphQL(p.items as any[]) })),
    );
  }

  private async loadPrescriptionForUser(id: string, user: JwtPayload) {
    const prescription = await this.prisma.prescriptions.findUnique({
      where: { id },
      include: { encounter: true, items: true },
    });
    if (!prescription) throw new NotFoundException('Prescription not found');
    if (!isSameOrg(user, prescription.encounter.client_org_id)) {
      throw new NotFoundException('Prescription not found');
    }
    // REQ065 (REQ018 US-BOOK-02 residue) — a patient caller may read a
    // dependant's prescription too, not just their own, matching
    // patients.service.ts's own "own or dependant" definition.
    if (user.roles.includes('patient')) {
      const allowedIds = await this.patientsService.ownAndDependantPatientIds(user);
      if (!allowedIds.includes(prescription.patient_id)) {
        throw new NotFoundException('Prescription not found');
      }
    }
    if (user.roles.includes('clinician') && prescription.clinician_id !== (user.clinician_id ?? '__no_clinician_link__')) {
      throw new NotFoundException('Prescription not found');
    }
    return prescription;
  }

  async prescription(id: string, user: JwtPayload) {
    const prescription = await this.loadPrescriptionForUser(id, user);
    const items = await this.itemsToGraphQL(prescription.items as any[]);
    return { ...prescription, items };
  }

  // Front-desk/admin Rx log, plus a clinician's own issued-prescriptions
  // list. Deliberately excludes 'patient' -- a patient caller uses
  // patientPrescriptions() instead, mirroring encounters.service.ts's
  // identical findAll()/patientTimeline() split.
  async findAll(user: JwtPayload) {
    const prescriptions = await this.prisma.prescriptions.findMany({
      where: {
        ...this.orgScope(user),
        ...(user.roles.includes('clinician') ? { clinician_id: user.clinician_id ?? '__no_clinician_link__' } : {}),
      },
      include: { items: true },
      orderBy: { issued_at: 'desc' },
    });
    return Promise.all(
      prescriptions.map(async (p) => ({ ...p, items: await this.itemsToGraphQL(p.items as any[]) })),
    );
  }

  async patientPrescriptions(patientId: string, user: JwtPayload) {
    if (user.roles.includes('patient')) {
      const allowedIds = await this.patientsService.ownAndDependantPatientIds(user);
      if (!allowedIds.includes(patientId)) {
        throw new NotFoundException('Patient not found');
      }
    }
    if (user.roles.includes('clinician')) {
      const treated = await this.prisma.appointments.findFirst({
        where: { patient_id: patientId, clinician_id: user.clinician_id ?? '__no_clinician_link__' },
      });
      if (!treated) throw new NotFoundException('Patient not found');
    }
    const prescriptions = await this.prisma.prescriptions.findMany({
      where: { patient_id: patientId, ...this.orgScope(user) },
      include: { items: true },
      orderBy: { issued_at: 'desc' },
    });
    return Promise.all(
      prescriptions.map(async (p) => ({ ...p, items: await this.itemsToGraphQL(p.items as any[]) })),
    );
  }

  // REQ026 (US-RX-06, FR-RX-10/11) — Telemedicine Practice Guidelines
  // enforcement. Applies only to a non-in_person consultation_mode; a
  // real in-person visit is never gated by any of this.
  //
  // "First consultation" is a defensible engineering proxy for TPG's
  // own concept, NOT a verified legal definition — flagged here and in
  // REQ026's own doc for a real compliance review before this ships to
  // a real market. A follow-up is any encounter where this same
  // clinician has already seen this same patient before, in any mode.
  private async isFirstConsultation(encounter: { patient_id: string; clinician_id: string; created_at: Date }): Promise<boolean> {
    const priorCount = await this.prisma.encounters.count({
      where: { patient_id: encounter.patient_id, clinician_id: encounter.clinician_id, created_at: { lt: encounter.created_at } },
    });
    return priorCount === 0;
  }

  private async assertTpgCompliant(
    encounter: { id: string; patient_id: string; clinician_id: string; created_at: Date; consultation_mode: string },
    items: PrescriptionItemInput[],
  ): Promise<void> {
    if (encounter.consultation_mode === 'in_person') return;

    // US-RX-06 — mandatory diagnosis before Rx in tele mode.
    const diagnosisCount = await this.prisma.diagnoses.count({ where: { encounter_id: encounter.id } });
    if (diagnosisCount === 0) {
      throw new BadRequestException('Record a diagnosis on this encounter before issuing a prescription in a teleconsultation');
    }

    const drugIds = [...new Set(items.map((i) => i.drug_id))];
    const drugs = await this.prisma.drugs.findMany({ where: { id: { in: drugIds } } });
    const drugById = new Map(drugs.map((d) => [d.id, d]));
    const isFirst = await this.isFirstConsultation(encounter);

    for (const item of items) {
      const drug = drugById.get(item.drug_id);
      const name = drug?.name ?? 'This drug';
      const list = drug?.tpg_list ?? null;
      if (list === 'prohibited') {
        throw new BadRequestException(`${name} is a scheduled/NDPS drug and cannot be prescribed via any teleconsultation mode`);
      }
      if (list == null) {
        throw new BadRequestException(`${name} has not been classified for teleconsultation prescribing yet — contact your admin`);
      }
      if (list === 'B' && isFirst) {
        throw new BadRequestException(`${name} is a follow-up-only (List B) drug and cannot be prescribed on a first teleconsultation`);
      }
    }
  }

  // REQ159 (P2-07, scoped down to allergy-only — see its own doc for
  // why drug-drug interaction checking was deliberately not built). A
  // real hard stop, no override, matching assertTpgCompliant()'s own
  // shape immediately above. Reuses EncountersService.patientAllergyBanner()
  // rather than re-deriving the same Diagnoses query — same discipline
  // as ai-clinical.service.ts's preConsultSummary().
  private async assertNoAllergyConflict(patientId: string, items: PrescriptionItemInput[], user: JwtPayload): Promise<void> {
    const allergies = (await this.encountersService.patientAllergyBanner(patientId, user)) as { id: string; text: string }[];
    if (allergies.length === 0) return;

    const drugIds = [...new Set(items.map((i) => i.drug_id))];
    const drugs = await this.prisma.drugs.findMany({ where: { id: { in: drugIds } } });
    const drugById = new Map(drugs.map((d) => [d.id, d]));

    for (const item of items) {
      const drug = drugById.get(item.drug_id);
      if (!drug) continue;
      const conflict = findAllergyConflict(drug, allergies);
      if (conflict) {
        throw new BadRequestException(
          `${drug.name} conflicts with this patient's recorded allergy to "${conflict.text}" — cannot be prescribed`,
        );
      }
    }
  }

  // Clinician-only: issuing a script is a clinical act, matching
  // encounters.service.ts's own signEncounter() role restriction.
  // Deliberately independent of the encounter's own locked state -- signing
  // the encounter and issuing a prescription are separate actions per the
  // requirement's own model (a clinician can prescribe mid-consultation,
  // before writing up final notes, or add a script to an already-signed
  // encounter during a same-day follow-up).
  async createPrescription(input: CreatePrescriptionInput, user: JwtPayload) {
    if (!user.roles.includes('clinician')) {
      throw new ForbiddenException('Only the treating clinician can issue a prescription');
    }
    const encounter = await this.prisma.encounters.findUnique({ where: { id: input.encounter_id } });
    if (!encounter) throw new NotFoundException('Encounter not found');
    if (!isSameOrg(user, encounter.client_org_id)) throw new NotFoundException('Encounter not found');
    if (encounter.clinician_id !== (user.clinician_id ?? '__no_clinician_link__')) {
      throw new ForbiddenException('You do not have access to this encounter');
    }

    // REQ026 (US-RX-06) — real consultation_mode, and the TPG guard that
    // reads it. A hard compliance blocker, no override path for the
    // prohibited/unclassified cases.
    const mode = encounter.consultation_mode;
    await this.assertTpgCompliant(encounter, input.items);
    await this.assertNoAllergyConflict(encounter.patient_id, input.items, user);

    if (input.repeated_from_id) {
      const source = await this.loadPrescriptionForUser(input.repeated_from_id, user);
      if (source.patient_id !== encounter.patient_id) {
        throw new BadRequestException('The prescription being repeated belongs to a different patient');
      }
    }

    const prescription = await this.prisma.prescriptions.create({
      data: {
        encounter_id: input.encounter_id,
        patient_id: encounter.patient_id,
        clinician_id: encounter.clinician_id,
        mode,
        language: input.language ?? 'en',
        repeated_from_id: input.repeated_from_id,
        items: {
          create: input.items.map((item: PrescriptionItemInput) => ({
            drug_id: item.drug_id,
            dose: item.dose,
            frequency: item.frequency,
            route: item.route,
            duration_days: item.duration_days,
            qty: this.calculateQty(item.frequency, item.duration_days),
            instructions: item.instructions,
            substitutable: item.substitutable ?? true,
          })),
        },
      },
      include: { items: true },
    });
    // REQ129 -- computed after create, not passed into the create() data,
    // since issued_at is DB-stamped (default(now())) and not known until
    // the row exists.
    const pdfHash = this.computeContentHash(prescription, prescription.items as any[]);
    await this.prisma.prescriptions.update({ where: { id: prescription.id }, data: { pdf_hash: pdfHash } });
    const items = await this.itemsToGraphQL(prescription.items as any[]);
    return { ...prescription, pdf_hash: pdfHash, items };
  }

  // REQ129 (US-RX-08) -- re-derives the hash from the prescription's
  // current DB content (same access control as prescription()/
  // printPrescription(), via loadPrescriptionForUser) and compares it to
  // the one stamped at issue time.
  async verifyPrescriptionIntegrity(id: string, user: JwtPayload) {
    const prescription = await this.loadPrescriptionForUser(id, user);
    const computedHash = this.computeContentHash(prescription, prescription.items as any[]);
    return {
      prescription_id: id,
      stored_hash: prescription.pdf_hash ?? undefined,
      computed_hash: computedHash,
      valid: prescription.pdf_hash === computedHash,
    };
  }

  // US-RX-05: returns an unsaved draft (not a persisted row) so the
  // clinician can review/adjust before createPrescription actually issues
  // it -- "pre-populate for review and adjustment", not a silent copy.
  async repeatPrescription(sourceId: string, user: JwtPayload) {
    const source = await this.loadPrescriptionForUser(sourceId, user);
    const items = await this.itemsToGraphQL(source.items as any[]);
    return {
      repeated_from_id: sourceId,
      items: items.map((i) => ({
        id: i.id,
        drug_id: i.drug_id,
        drug_name: i.drug_name,
        dose: i.dose,
        frequency: i.frequency,
        route: i.route,
        duration_days: i.duration_days,
        qty: i.qty,
        instructions: i.instructions,
        substitutable: i.substitutable,
      })),
    };
  }

  // REQ170 -- resolves a clinic's own configured letterhead doctor roster
  // (Clinics.letterhead_clinician_ids, an ordered array of Clinicians.id)
  // into full doctor blocks. Falls back to [the issuing clinician] when
  // unset/empty -- an org that never configures this renders exactly as
  // before REQ170, per that slice's own stated regression contract.
  private async resolveLetterheadDoctors(clinicLetterheadIds: unknown, issuingClinician: any) {
    const ids = Array.isArray(clinicLetterheadIds) ? (clinicLetterheadIds as string[]) : [];
    if (ids.length === 0) {
      return issuingClinician
        ? [
            {
              full_name: `${issuingClinician.first_name} ${issuingClinician.last_name}`,
              qualifications: issuingClinician.qualifications ?? undefined,
              specialty_highlights: issuingClinician.specialty_highlights ?? undefined,
              registration_number: issuingClinician.registration_number ?? undefined,
            },
          ]
        : [];
    }
    const rows = await this.prisma.clinicians.findMany({ where: { id: { in: ids } } });
    const byId = new Map(rows.map((c) => [c.id, c]));
    // Preserves the admin-configured display order -- Prisma's findMany
    // with `in` does not guarantee input order.
    return ids
      .map((id) => byId.get(id))
      .filter((c): c is (typeof rows)[number] => !!c)
      .map((c) => ({
        full_name: `${c.first_name} ${c.last_name}`,
        qualifications: c.qualifications ?? undefined,
        specialty_highlights: c.specialty_highlights ?? undefined,
        registration_number: c.registration_number ?? undefined,
      }));
  }

  // REQ171 -- the same encounter's own clinical narrative, already fully
  // modelled (EncounterNotes/Diagnoses/Vitals) and already read verbatim
  // by documents.service.ts#visitSummaryPdf -- reused here rather than
  // re-deriving a second query shape for the same three tables. Every
  // field is optional; a specialty/clinician that never records one keeps
  // today's clean printout, nothing rendered.
  private async assembleEncounterContext(encounterId: string, lmpDate: Date | null | undefined) {
    const [notes, diagnoses, vitals] = await Promise.all([
      this.prisma.encounterNotes.findMany({ where: { encounter_id: encounterId } }),
      this.prisma.diagnoses.findMany({ where: { encounter_id: encounterId, type: 'diagnosis', status: 'active' } }),
      this.prisma.vitals.findMany({ where: { encounter_id: encounterId }, orderBy: { recorded_at: 'desc' } }),
    ]);

    const noteBySection = new Map(notes.map((n) => [n.section, n.content]));
    const latestVital = (code: string) => vitals.find((v) => v.code === code)?.value;
    const heightCm = latestVital('height_cm');
    const weightKg = latestVital('weight_kg');
    const bmi = heightCm && weightKg ? weightKg / (heightCm / 100) ** 2 : undefined;

    const obstetric = lmpDate ? computeObstetricDates(lmpDate, new Date()) : undefined;

    return {
      complaints: noteBySection.get('complaints') || undefined,
      exam: noteBySection.get('exam') || undefined,
      diagnosis: diagnoses.length ? diagnoses.map((d) => d.text).join(', ') : undefined,
      advice: noteBySection.get('advice') || undefined,
      follow_up: noteBySection.get('follow_up') || undefined,
      investigations: noteBySection.get('investigations') || undefined,
      bp_systolic: latestVital('bp_systolic'),
      bp_diastolic: latestVital('bp_diastolic'),
      height_cm: heightCm,
      weight_kg: weightKg,
      bmi: bmi ? Math.round(bmi * 100) / 100 : undefined,
      lmp_date: lmpDate ?? undefined,
      edd: obstetric?.edd,
      gestational_age_weeks: obstetric?.gestational_age_weeks,
      gestational_age_days: obstetric?.gestational_age_days,
    };
  }

  // REQ109 — shared by printPrescription() (bumps reprint_count) and
  // assembleForShare() (does not — see that method's own comment on why
  // those are different concepts). Extracted verbatim from printPrescription's
  // own pre-REQ109 body; no behaviour change to that method's own output.
  private async assemblePrintPayload(prescription: any, isReprint: boolean) {
    const items = await this.itemsToGraphQL(prescription.items as any[]);

    // REQ170 -- letterhead now reads the SPECIFIC clinic (branch) the
    // appointment actually happened at, not just the org-wide branding --
    // the pre-REQ170 version hardcoded `address: undefined` and always
    // used the org's own contact_phone, which is wrong for any multi-
    // branch org (every branch would print the same phone/address).
    const [clinician, patient, appointment] = await Promise.all([
      this.prisma.clinicians.findUnique({ where: { id: prescription.clinician_id } }),
      this.prisma.patients.findUnique({ where: { id: prescription.patient_id } }),
      this.prisma.appointments.findUnique({
        where: { id: prescription.encounter.appointment_id },
        include: { clinic: { include: { client_organization: true } } },
      }),
    ]);
    const clinic = appointment?.clinic;
    const org = clinic?.client_organization;

    const [doctors, encounterContext] = await Promise.all([
      this.resolveLetterheadDoctors(clinic?.letterhead_clinician_ids, clinician),
      this.assembleEncounterContext(prescription.encounter_id, prescription.encounter.lmp_date),
    ]);

    return {
      prescription: { ...prescription, items },
      clinic: {
        name: org?.name ?? clinic?.name ?? 'Clinic',
        logo_url: org?.logo_url ?? undefined,
        contact_phone: clinic?.phone ?? org?.contact_phone ?? undefined,
        address: clinic?.address ?? undefined,
        email: clinic?.email ?? undefined,
        website: clinic?.website ?? undefined,
        alternate_phone: clinic?.alternate_phone ?? undefined,
        appointment_note: clinic?.appointment_note ?? undefined,
        tagline: org?.tagline ?? undefined,
        primary_color: org?.primary_color ?? undefined,
        secondary_color: org?.secondary_color ?? undefined,
      },
      clinician: {
        full_name: clinician ? `${clinician.first_name} ${clinician.last_name}` : 'Unknown',
        registration_number: clinician?.registration_number ?? undefined,
        qualifications: clinician?.qualifications ?? undefined,
      },
      doctors,
      patient: {
        full_name: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown',
        date_of_birth: patient?.date_of_birth,
        gender: patient?.gender ?? undefined,
      },
      encounter_context: encounterContext,
      is_reprint: isReprint,
    };
  }

  // US-RX-03: one-call print payload. The first fetch right after issuance
  // is the original (reprint_count stays 0); every fetch after that is a
  // reprint, incremented here and reported back so the frontend renders a
  // "DUPLICATE" watermark from the second view onward, never the first.
  async printPrescription(id: string, user: JwtPayload) {
    const prescription = await this.loadPrescriptionForUser(id, user);
    const isReprint = prescription.reprint_count > 0;
    if (isReprint) {
      await this.prisma.prescriptions.update({ where: { id }, data: { reprint_count: { increment: 1 } } });
    } else {
      await this.prisma.prescriptions.update({ where: { id }, data: { reprint_count: 1 } });
    }
    return this.assemblePrintPayload(prescription, isReprint);
  }

  // REQ109 — the WhatsApp-shared retrieval path. Deliberately NO access
  // control here (the caller already passed the OTP + signed-link-token
  // check before reaching this) and deliberately NO reprint_count bump —
  // that counter tracks reprints of the CLINIC's own print view; a
  // patient retrieving their own already-shared copy is a different
  // concept and must not eventually mark the clinic's own original as
  // "DUPLICATE".
  async assembleForShare(prescriptionId: string) {
    const prescription = await this.prisma.prescriptions.findUnique({
      where: { id: prescriptionId },
      include: { encounter: true, items: true },
    });
    if (!prescription) throw new NotFoundException('Prescription not found');
    return this.assemblePrintPayload(prescription, false);
  }

  // REQ109 — two-channel delivery: WhatsApp carries the link, SMS (to the
  // same phone) carries the OTP. A single channel carrying both would
  // defeat the point of a second factor. The real access-control check
  // is loadPrescriptionForUser() (same as printPrescription's own) — no
  // new logic invented for who may trigger a share.
  async sharePrescriptionViaWhatsapp(id: string, user: JwtPayload) {
    const prescription = await this.loadPrescriptionForUser(id, user);
    const patient = await this.prisma.patients.findUnique({ where: { id: prescription.patient_id } });
    if (!patient?.phone) {
      return { success: false, userErrors: [{ message: 'This patient has no phone number on file' }] };
    }
    // The prescription's OWN org, not the caller's -- a platform operator
    // (client_org_id: null) still shares against the real org whose
    // provider credentials must be used.
    const orgId = prescription.encounter.client_org_id;
    if (!orgId) {
      return { success: false, userErrors: [{ message: 'This prescription has no organization to resolve a provider from' }] };
    }

    const whatsappConfig = await this.providerConfigService.getActiveConfigForOrg(orgId, 'whatsapp');
    if (!whatsappConfig) {
      return { success: false, userErrors: [{ message: 'No WhatsApp provider configured for this organization' }] };
    }
    const smsConfig = await this.providerConfigService.getActiveConfigForOrg(orgId, 'sms');
    if (!smsConfig) {
      return { success: false, userErrors: [{ message: 'No SMS provider configured for this organization -- cannot deliver a one-time code' }] };
    }

    const otpCode = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    const expiresAt = new Date(Date.now() + SHARE_LINK_TTL_MINUTES * 60_000);
    await this.prisma.prescriptionShareOtps.create({
      data: { prescription_id: id, phone: patient.phone, otp_code: otpCode, expires_at: expiresAt },
    });
    // Same JWT-as-short-lived-token pattern auth.service.ts's own
    // TOTP_CHALLENGE_PURPOSE uses -- a distinct `purpose` claim so this
    // token can never be replayed as, or confused with, a login/session
    // credential, and is scoped to exactly this one prescription.
    const shareToken = this.jwtService.sign(
      { purpose: RX_SHARE_PURPOSE, prescriptionId: id },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: `${SHARE_LINK_TTL_MINUTES}m` },
    );
    const shareUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/share/rx/${shareToken}`;

    const linkResult = await whatsappConfig.provider.send(
      whatsappConfig.credentials,
      patient.phone,
      `Your prescription is ready to view: ${shareUrl}\nThis link expires in ${SHARE_LINK_TTL_MINUTES} minutes.`,
    );
    if (!linkResult.sent) {
      return { success: false, userErrors: [{ message: linkResult.error ?? 'Failed to send WhatsApp link' }] };
    }
    const otpResult = await smsConfig.provider.send(
      smsConfig.credentials,
      patient.phone,
      `Your prescription verification code is ${otpCode}. It expires in ${SHARE_LINK_TTL_MINUTES} minutes.`,
    );
    if (!otpResult.sent) {
      return { success: false, userErrors: [{ message: otpResult.error ?? 'WhatsApp link sent, but the verification code could not be delivered -- please try again' }] };
    }

    return { success: true, userErrors: [], phone_last_two: patient.phone.slice(-2) };
  }

  // REQ109 — called from documents.service.ts before rendering the PDF.
  // Never distinguishes "no such prescription" from "wrong code" in its
  // error messages -- both a nonexistent prescriptionId and a genuinely
  // expired/exhausted OTP surface the identical "expired, please request
  // a new share link" message, so neither leaks which case occurred.
  async verifyShareOtp(prescriptionId: string, code: string): Promise<void> {
    const row = await this.prisma.prescriptionShareOtps.findFirst({
      where: { prescription_id: prescriptionId, consumed_at: null },
      orderBy: { created_at: 'desc' },
    });
    if (!row || row.expires_at < new Date() || row.attempts >= OTP_MAX_ATTEMPTS) {
      throw new UnauthorizedException('This code has expired -- please request a new share link');
    }
    if (row.otp_code !== code) {
      await this.prisma.prescriptionShareOtps.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException('Incorrect code');
    }
    await this.prisma.prescriptionShareOtps.update({ where: { id: row.id }, data: { consumed_at: new Date() } });
  }

  // clinician_id set = personal favourite; null = org-shared. Mirrors
  // encounters.service.ts's encounterTemplates() exactly.
  async prescriptionSets(specialty: string | undefined, user: JwtPayload) {
    const sets = await this.prisma.prescriptionSets.findMany({
      where: {
        ...(specialty ? { specialty } : {}),
        OR: [
          { clinician_id: user.clinician_id ?? '__no_clinician_link__' },
          { clinician_id: null, ...(user.client_org_id ? { client_org_id: user.client_org_id } : {}) },
        ],
      },
      include: { items: true },
      orderBy: { created_at: 'desc' },
    });
    return Promise.all(sets.map(async (s) => ({ ...s, items: await this.itemsToGraphQL(s.items as any[]) })));
  }

  async createPrescriptionSet(input: CreatePrescriptionSetInput, user: JwtPayload) {
    const set = await this.prisma.prescriptionSets.create({
      data: {
        client_org_id: orgIdForWrite(user, 'PrescriptionSet') as string,
        clinician_id: input.org_shared ? null : (user.clinician_id ?? null),
        specialty: input.specialty,
        name: input.name,
        items: {
          create: input.items.map((item: PrescriptionItemInput) => ({
            drug_id: item.drug_id,
            dose: item.dose,
            frequency: item.frequency,
            route: item.route,
            duration_days: item.duration_days,
            instructions: item.instructions,
          })),
        },
      },
      include: { items: true },
    });
    const items = await this.itemsToGraphQL(set.items as any[]);
    return { ...set, items };
  }

  // US-RX-02: applying a set returns its items in the same draft shape
  // repeatPrescription uses, for the builder to pre-fill -- not a direct
  // persist, since the clinician may still edit before issuing.
  async applyPrescriptionSet(setId: string, user: JwtPayload) {
    const set = await this.prisma.prescriptionSets.findUnique({ where: { id: setId }, include: { items: true } });
    if (!set) throw new NotFoundException('Prescription set not found');
    if (set.client_org_id && !isSameOrg(user, set.client_org_id)) {
      throw new NotFoundException('Prescription set not found');
    }
    const items = await this.itemsToGraphQL(set.items as any[]);
    return items.map((i) => ({
      id: i.id,
      drug_id: i.drug_id,
      drug_name: i.drug_name,
      dose: i.dose,
      frequency: i.frequency,
      route: i.route,
      duration_days: i.duration_days,
      qty: this.calculateQty(i.frequency, i.duration_days),
      instructions: i.instructions,
      substitutable: true,
    }));
  }
}
