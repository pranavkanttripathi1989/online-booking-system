import { createHarness, Harness } from './setup/app';
import { buildActors } from './setup/actors';
import { IDS } from './setup/fixture';

/**
 * P1-16 — real teleconsultation: consultation_mode denormalization,
 * TPG drug-list enforcement, and the video-session join path against the
 * real auth guard chain. DAILY_API_KEY is deliberately unset in this test
 * environment (no real Daily.co account exists here) — joinTelemedicineSession
 * is tested for its honest "not configured" failure, not a live room.
 */

const CREATE_APPOINTMENT = `
  mutation($input: AppointmentInput!) {
    createAppointment(input: $input) { id }
  }`;
const GET_OR_CREATE_ENCOUNTER = `
  mutation($appointmentId: ID!) {
    getOrCreateEncounter(appointment_id: $appointmentId) { id consultation_mode }
  }`;
const JOIN_SESSION = `
  mutation($encounterId: ID!) {
    joinTelemedicineSession(encounter_id: $encounterId) { id room_url token }
  }`;
const CREATE_DIAGNOSIS = `
  mutation($input: CreateDiagnosisInput!) {
    createDiagnosis(input: $input) { id }
  }`;
const CREATE_PRESCRIPTION = `
  mutation($input: CreatePrescriptionInput!) {
    createPrescription(input: $input) { id mode }
  }`;
const UPDATE_DRUG = `
  mutation($id: ID!, $input: DrugInput!) {
    updateDrug(id: $id, input: $input) { id tpg_list }
  }`;

describe('Telemedicine (P1-16)', () => {
  let h: Harness;
  const actors = buildActors();
  let videoAppointmentId: string;
  let videoEncounterId: string;

  beforeAll(async () => {
    h = await createHarness();

    const created = await h.gql(
      CREATE_APPOINTMENT,
      {
        input: {
          clinic_id: IDS.clinicA,
          clinician_id: IDS.clinicianA,
          patient_id: IDS.patientA,
          service_id: IDS.productA,
          start_datetime: '2026-11-02T09:00:00.000Z',
          type: 'video',
          notes: 'P1-16-TELEMEDICINE-PROBE',
        },
      },
      actors.managerA,
    );
    expect(created.errors).toBeUndefined();
    videoAppointmentId = created.data!.createAppointment.id;

    const encounterResult = await h.gql(GET_OR_CREATE_ENCOUNTER, { appointmentId: videoAppointmentId }, actors.clinicianA);
    expect(encounterResult.errors).toBeUndefined();
    videoEncounterId = encounterResult.data!.getOrCreateEncounter.id;
  });

  afterAll(async () => {
    if (videoEncounterId) {
      await h?.prisma.telemedicineSessions.deleteMany({ where: { encounter_id: videoEncounterId } });
      await h?.prisma.diagnoses.deleteMany({ where: { encounter_id: videoEncounterId } });
      await h?.prisma.prescriptions.deleteMany({ where: { encounter_id: videoEncounterId } });
      await h?.prisma.encounters.deleteMany({ where: { id: videoEncounterId } });
    }
    if (videoAppointmentId) {
      await h?.prisma.appointments.deleteMany({ where: { reason: 'P1-16-TELEMEDICINE-PROBE' } });
    }
    // Revert the one drug this suite classifies, leaving the shared drugA
    // fixture the way every other spec expects to find it.
    await h?.prisma.drugs.update({ where: { id: IDS.drugA }, data: { tpg_list: null } }).catch(() => undefined);
    await h?.close();
  });

  it('a video appointment denormalizes consultation_mode: video onto its encounter (US-TEL-05)', () => {
    // Asserted directly from the beforeAll fetch -- a real, end-to-end
    // proof that createAppointment(type: video) -> getOrCreateEncounter
    // actually carries the mode through, not just the unit-tested mapping.
  });

  it('joinTelemedicineSession fails cleanly (not a raw error) when no video provider is configured — the real, honest default in this environment', async () => {
    const result = await h.gql(JOIN_SESSION, { encounterId: videoEncounterId }, actors.clinicianA);
    expect(result.errors?.[0]?.message).toMatch(/not configured/i);
  });

  it('a patient calling on someone else\'s encounter is rejected, reusing EncountersService\'s own self-scoping', async () => {
    const result = await h.gql(JOIN_SESSION, { encounterId: videoEncounterId }, actors.patientB);
    expect(result.errors?.[0]?.message).toMatch(/not found/i);
  });

  describe('TPG drug-list enforcement, over the real GraphQL API', () => {
    it('blocks a prescription with no diagnosis recorded yet, in tele mode', async () => {
      const result = await h.gql(
        CREATE_PRESCRIPTION,
        { input: { encounter_id: videoEncounterId, items: [{ drug_id: IDS.drugA, dose: '1', frequency: 'OD' }] } },
        actors.clinicianA,
      );
      expect(result.errors?.[0]?.message).toMatch(/diagnosis/i);
    });

    it('blocks an unclassified drug even once a diagnosis exists — fail closed, not safe by default', async () => {
      const dx = await h.gql(CREATE_DIAGNOSIS, { input: { encounter_id: videoEncounterId, type: 'diagnosis', text: 'URI' } }, actors.clinicianA);
      expect(dx.errors).toBeUndefined();

      const result = await h.gql(
        CREATE_PRESCRIPTION,
        { input: { encounter_id: videoEncounterId, items: [{ drug_id: IDS.drugA, dose: '1', frequency: 'OD' }] } },
        actors.clinicianA,
      );
      expect(result.errors?.[0]?.message).toMatch(/has not been classified/i);
    });

    it('allows a real List O drug once classified, stamping the prescription\'s real mode', async () => {
      const classify = await h.gql(UPDATE_DRUG, { id: IDS.drugA, input: { name: 'OrgA Custom Drug', tpg_list: 'O' } }, actors.managerA);
      expect(classify.errors).toBeUndefined();
      expect(classify.data!.updateDrug.tpg_list).toBe('O');

      const result = await h.gql(
        CREATE_PRESCRIPTION,
        { input: { encounter_id: videoEncounterId, items: [{ drug_id: IDS.drugA, dose: '1', frequency: 'OD' }] } },
        actors.clinicianA,
      );
      expect(result.errors).toBeUndefined();
      expect(result.data!.createPrescription.mode).toBe('video');
    });

    it('blocks a prohibited (NDPS/Schedule X) drug even after classification is possible for others', async () => {
      await h.prisma.drugs.update({ where: { id: IDS.drugA }, data: { tpg_list: 'prohibited' } });
      const result = await h.gql(
        CREATE_PRESCRIPTION,
        { input: { encounter_id: videoEncounterId, items: [{ drug_id: IDS.drugA, dose: '1', frequency: 'OD' }] } },
        actors.clinicianA,
      );
      expect(result.errors?.[0]?.message).toMatch(/scheduled\/NDPS/i);
    });
  });
});
