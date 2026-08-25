import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScopeVia, orgIdForWrite, isSameOrg } from '../common/scoping/tenant-scope';
import { CreatePrescriptionInput, CreatePrescriptionSetInput, PrescriptionItemInput } from './dto/prescription.input';
import { PatientsService } from '../patients/patients.service';

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
  ) {}

  private calculateQty(frequency: string, durationDays?: number): number | undefined {
    const perDay = FREQUENCY_PER_DAY[frequency];
    if (perDay == null || !durationDays) return undefined;
    return perDay * durationDays;
  }

  private orgScope(user: JwtPayload) {
    return orgScopeVia(user, 'encounter');
  }

  private async itemsToGraphQL(items: any[]) {
    const drugIds = [...new Set(items.map((i) => i.drug_id))];
    const drugs = await this.prisma.drugs.findMany({ where: { id: { in: drugIds } } });
    const nameById = new Map(drugs.map((d) => [d.id, d.name]));
    return items.map((i) => ({ ...i, drug_name: nameById.get(i.drug_id) ?? 'Unknown drug' }));
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

    // Nothing on Appointments/Encounters tracks video/audio/text yet --
    // that's REQ026 (telemedicine)'s own consultation_mode column, not
    // built until that requirement lands. Every prescription is in_person
    // until then; TPG mode-gating (US-RX-06) is correctly deferred with it.
    const mode = 'in_person';

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
    const items = await this.itemsToGraphQL(prescription.items as any[]);
    return { ...prescription, items };
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
    const items = await this.itemsToGraphQL(prescription.items as any[]);

    // Letterhead reuses the real org branding (REQ002: name/logo_url) plus
    // ClientOrganizations' own contact/address fields -- no dedicated
    // "letterhead" concept exists, and building one is out of this slice's
    // scope (see PLAN057).
    const [clinician, patient, org] = await Promise.all([
      this.prisma.clinicians.findUnique({ where: { id: prescription.clinician_id } }),
      this.prisma.patients.findUnique({ where: { id: prescription.patient_id } }),
      this.prisma.clientOrganizations.findUnique({ where: { id: prescription.encounter.client_org_id } }),
    ]);

    return {
      prescription: { ...prescription, items },
      clinic: {
        name: org?.name ?? 'Clinic',
        logo_url: org?.logo_url ?? undefined,
        contact_phone: org?.contact_phone ?? undefined,
        address: undefined,
      },
      clinician: {
        full_name: clinician ? `${clinician.first_name} ${clinician.last_name}` : 'Unknown',
        registration_number: clinician?.registration_number ?? undefined,
        qualifications: clinician?.qualifications ?? undefined,
      },
      patient: {
        full_name: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown',
        date_of_birth: patient?.date_of_birth,
        gender: patient?.gender ?? undefined,
      },
      is_reprint: isReprint,
    };
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
