import { createHarness, Harness } from './setup/app';
import { buildFixture, IDS } from './setup/fixture';

/**
 * REQ020 -- sign-off immutability trigger (US-EMR-06 / PRD S14.2).
 *
 * encounters.service.ts's own lock check is the fast, friendly-error path in
 * front of this -- this test proves the actual guarantee: a direct
 * UPDATE/DELETE against a locked encounter's EncounterNotes/Diagnoses rows,
 * issued straight through Prisma with no service layer in between, is
 * rejected by the database itself (reject_write_if_encounter_locked(),
 * 20260824010000_clinical_records_encounters/migration.sql). A mocked-Prisma
 * unit test cannot prove this -- it would only prove the mock was called
 * with the right arguments, the same blind spot booking-concurrency.int-spec.ts's
 * own header names for the EXCLUDE constraint.
 */
// buildFixture already creates one Encounters row per org (IDS.encounterA/B,
// REQ020's own tenancy-matrix fixture) tied to that org's single appointment
// -- Encounters.appointment_id is unique, so this test reuses IDS.encounterA
// rather than creating a second one against the same appointment.
const ENCOUNTER_ID = IDS.encounterA;
const NOTE_ID = '00000000-0000-4000-8000-00000000e002';
const DIAGNOSIS_ID = '00000000-0000-4000-8000-00000000e003';

describe('encounter sign-off immutability trigger', () => {
  let h: Harness;

  beforeAll(async () => {
    h = await createHarness();
    await buildFixture(h.prisma);
    await h.prisma.encounterNotes.create({
      data: { id: NOTE_ID, encounter_id: ENCOUNTER_ID, section: 'complaints', content: 'Cough' },
    });
    await h.prisma.diagnoses.create({
      data: { id: DIAGNOSIS_ID, encounter_id: ENCOUNTER_ID, type: 'diagnosis', text: 'Bronchitis' },
    });
  });

  afterAll(async () => {
    await h?.close();
  });

  it('allows UPDATE on notes and diagnoses while the encounter is unlocked', async () => {
    await expect(
      h.prisma.encounterNotes.update({ where: { id: NOTE_ID }, data: { content: 'Cough, worsening' } }),
    ).resolves.toBeDefined();
    await expect(
      h.prisma.diagnoses.update({ where: { id: DIAGNOSIS_ID }, data: { status: 'resolved' } }),
    ).resolves.toBeDefined();
  });

  it('rejects a direct UPDATE on EncounterNotes once the parent encounter is locked', async () => {
    await h.prisma.encounters.update({ where: { id: ENCOUNTER_ID }, data: { locked: true } });
    await expect(
      h.prisma.encounterNotes.update({ where: { id: NOTE_ID }, data: { content: 'tampered' } }),
    ).rejects.toThrow(/signed \(locked\) encounter/i);
  });

  it('rejects a direct DELETE on EncounterNotes once locked', async () => {
    await expect(h.prisma.encounterNotes.delete({ where: { id: NOTE_ID } })).rejects.toThrow(/signed \(locked\) encounter/i);
  });

  it('rejects a direct UPDATE on Diagnoses once locked', async () => {
    await expect(
      h.prisma.diagnoses.update({ where: { id: DIAGNOSIS_ID }, data: { status: 'active' } }),
    ).rejects.toThrow(/signed \(locked\) encounter/i);
  });

  it('rejects a direct DELETE on Diagnoses once locked', async () => {
    await expect(h.prisma.diagnoses.delete({ where: { id: DIAGNOSIS_ID } })).rejects.toThrow(/signed \(locked\) encounter/i);
  });

  it('still allows an addendum insert on a locked encounter (append-only, no trigger on EncounterAddenda)', async () => {
    await expect(
      h.prisma.encounterAddenda.create({
        data: { encounter_id: ENCOUNTER_ID, author_id: IDS.userClinicianA, content: 'Correction: worsening cough' },
      }),
    ).resolves.toBeDefined();
  });
});
