import { createHarness, Harness } from './setup/app';
import { buildActors } from './setup/actors';
import { IDS } from './setup/fixture';

/**
 * REQ179 (IPD slice 1) — the ADT core's own Definition-of-Done gates.
 *
 * These exist because the guarantees they check are DATABASE guarantees, not
 * service-layer ones, and a mocked-Prisma unit test can never exercise them:
 *
 *   1. Two concurrent admissions to one bed — the `bed_occupancies_
 *      no_double_occupancy` GiST EXCLUDE constraint. There is deliberately NO
 *      application-level lock: the availability check and the insert are two
 *      statements, so N concurrent requests can all pass the check before any
 *      of them writes. The constraint is what makes it atomic; the service
 *      only translates 23P01 into a sentence a receptionist can act on.
 *      Exactly the booking-concurrency.int-spec.ts precedent.
 *   2. A backdated transfer into a bed that was occupied at that time.
 *   3. MLC register immutability, enforced by a Postgres trigger — asserted
 *      by attacking the table DIRECTLY, so the test cannot pass merely
 *      because a service-layer check happened to run first.
 */

const CONCURRENT_ATTEMPTS = 5;

describe('IPD ADT core', () => {
  let h: Harness;
  const actors = buildActors();

  // A dedicated ward, beds and patients, so these never disturb the shared
  // fixture rows the tenancy matrix asserts against — and, specifically,
  // because the fixture's own patientA is already admitted, which this
  // service correctly refuses to duplicate ("one live admission per patient").
  let probeWardId: string;
  let probeBedId: string;
  let probeBedTwoId: string;
  let probePatientOneId: string;
  let probePatientTwoId: string;

  const admit = (bedId: string, notes: string, admittedAt?: string, patientId?: string) =>
    h.gql(
      `mutation($input: CreateAdmissionInput!) { createAdmission(input: $input) { id admission_number } }`,
      {
        input: {
          clinic_id: IDS.clinicA,
          patient_id: patientId ?? probePatientOneId,
          bed_id: bedId,
          admitting_clinician_id: IDS.clinicianA,
          admission_notes: notes,
          ...(admittedAt ? { admitted_at: admittedAt } : {}),
        },
      },
      actors.managerA,
    );

  const cleanupProbes = async () => {
    const admissions = await h.prisma.admissions.findMany({
      where: { admission_notes: { startsWith: 'IPD-PROBE' } },
      select: { id: true },
    });
    const ids = admissions.map((a) => a.id);
    if (ids.length) {
      // MLC rows cannot be DELETEd at all — not by the app, not by a cascade,
      // and not by this cleanup: both tables carry BEFORE DELETE triggers that
      // raise unconditionally, because a medico-legal register is a statutory
      // lifelong record. TRUNCATE is the only way out, and deliberately so:
      // Postgres does not fire per-row triggers for it, so it remains
      // available to a throwaway test database while staying entirely
      // unreachable from application code (which never issues TRUNCATE).
      // This is the property under test, exercised here by necessity.
      await h.prisma.$executeRawUnsafe('TRUNCATE TABLE "MlcAmendments", "MlcRegisters" CASCADE');
      await h.prisma.admissionEvents.deleteMany({ where: { admission_id: { in: ids } } });
      await h.prisma.bedOccupancies.deleteMany({ where: { admission_id: { in: ids } } });
      await h.prisma.admissions.deleteMany({ where: { id: { in: ids } } });
    }
  };

  beforeAll(async () => {
    h = await createHarness();
    const ward = await h.prisma.wards.create({
      data: { client_org_id: IDS.orgA, clinic_id: IDS.clinicA, name: 'IPD-PROBE Ward', ward_type: 'general' },
    });
    probeWardId = ward.id;
    const bed = await h.prisma.beds.create({
      data: { client_org_id: IDS.orgA, clinic_id: IDS.clinicA, ward_id: ward.id, bed_number: 'PROBE-01' },
    });
    probeBedId = bed.id;
    const bedTwo = await h.prisma.beds.create({
      data: { client_org_id: IDS.orgA, clinic_id: IDS.clinicA, ward_id: ward.id, bed_number: 'PROBE-02' },
    });
    probeBedTwoId = bedTwo.id;

    const stamp = Date.now();
    const one = await h.prisma.patients.create({
      data: {
        client_org_id: IDS.orgA,
        first_name: 'Probe',
        last_name: 'PatientOne',
        date_of_birth: new Date('1985-01-01'),
        email: `probe1-${stamp}@ipd.test`,
        phone: `+9199${String(stamp).slice(-8)}`,
        address: '1 Probe Road',
      },
    });
    probePatientOneId = one.id;
    const two = await h.prisma.patients.create({
      data: {
        client_org_id: IDS.orgA,
        first_name: 'Probe',
        last_name: 'PatientTwo',
        date_of_birth: new Date('1986-01-01'),
        email: `probe2-${stamp}@ipd.test`,
        phone: `+9188${String(stamp).slice(-8)}`,
        address: '2 Probe Road',
      },
    });
    probePatientTwoId = two.id;
  });

  afterAll(async () => {
    await cleanupProbes();
    await h?.prisma.bedOccupancies.deleteMany({ where: { ward_id: probeWardId } });
    await h?.prisma.beds.deleteMany({ where: { ward_id: probeWardId } });
    await h?.prisma.wards.deleteMany({ where: { id: probeWardId } });
    await h?.prisma.patients.deleteMany({ where: { id: { in: [probePatientOneId, probePatientTwoId] } } });
    await h?.close();
  });

  afterEach(cleanupProbes);

  it(`only one of ${CONCURRENT_ATTEMPTS} concurrent admissions into one bed succeeds`, async () => {
    const results = await Promise.all(
      Array.from({ length: CONCURRENT_ATTEMPTS }, () => admit(probeBedId, 'IPD-PROBE concurrency')),
    );

    const succeeded = results.filter((r) => !r.errors && r.data?.createAdmission?.id).length;
    const failed = results.filter((r) => r.errors);
    const persisted = await h.prisma.bedOccupancies.count({
      where: { bed_id: probeBedId, is_cancelled: false, end_at: null },
    });

    expect(succeeded).toBe(1);
    expect(persisted).toBe(1);
    expect(failed).toHaveLength(CONCURRENT_ATTEMPTS - 1);
    // The losers must get the clean conflict message, not a raw Postgres
    // error and not a 500 — this is the half a DB constraint alone can't give.
    for (const r of failed) {
      expect(r.errors![0].message).toMatch(/already occupied/i);
    }
  });

  it('rejects a backdated transfer into a bed that was occupied at that time', async () => {
    // Patient 1 occupies PROBE-02 from T-6h onward.
    const earlier = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const first = await admit(probeBedTwoId, 'IPD-PROBE backdate-holder', earlier);
    expect(first.errors).toBeUndefined();

    // Patient 2 is admitted to a different bed, then someone tries to record
    // a transfer into PROBE-02 backdated to a time it was already taken.
    const second = await h.prisma.admissions.create({
      data: {
        client_org_id: IDS.orgA,
        clinic_id: IDS.clinicA,
        patient_id: probePatientTwoId,
        admission_number: `ADM/PROBE/${Date.now()}`,
        status: 'admitted',
        admitted_at: new Date(Date.now() - 7 * 60 * 60 * 1000),
        admitting_clinician_id: IDS.clinicianA,
        attending_clinician_id: IDS.clinicianA,
        admission_notes: 'IPD-PROBE backdate-mover',
        created_by_user_id: IDS.userManagerA,
      },
    });

    const res = await h.gql(
      `mutation($input: TransferAdmissionBedInput!) { transferAdmissionBed(input: $input) { id } }`,
      {
        input: {
          admission_id: second.id,
          to_bed_id: probeBedTwoId,
          transferred_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        },
      },
      actors.managerA,
    );

    expect(res.errors).toBeDefined();
    expect(res.errors![0].message).toMatch(/already occupied/i);
  });

  it('frees the bed for the same period when an admission is cancelled', async () => {
    const first = await admit(probeBedId, 'IPD-PROBE cancel-then-reuse');
    expect(first.errors).toBeUndefined();

    const cancelled = await h.gql(
      `mutation($id: ID!, $reason: String!) { cancelAdmission(id: $id, reason: $reason) { success } }`,
      { id: first.data.createAdmission.id, reason: 'Admitted in error' },
      actors.managerA,
    );
    expect(cancelled.data.cancelAdmission.success).toBe(true);

    // The cancelled occupancy row is excluded by the constraint's own WHERE
    // predicate, so the bed is genuinely free again rather than blocked by a
    // row that should never have existed.
    const second = await admit(probeBedId, 'IPD-PROBE cancel-then-reuse-2');
    expect(second.errors).toBeUndefined();
    expect(second.data.createAdmission.id).toBeTruthy();
  });

  it('an MLC register cannot be edited or deleted, enforced by the database itself', async () => {
    const admission = await admit(probeBedId, 'IPD-PROBE mlc');
    expect(admission.errors).toBeUndefined();

    const filed = await h.gql(
      `mutation($input: RecordMlcRegisterInput!) {
         recordMlcRegister(input: $input) { id mlc_number }
       }`,
      {
        input: {
          admission_id: admission.data.createAdmission.id,
          mlc_category: 'road_accident',
          identification_mark_1: 'Scar on left forearm',
          identification_mark_2: 'Mole below right eye',
          examined_by_clinician_id: IDS.clinicianA,
          injury_details: 'Abrasions to left leg',
        },
      },
      actors.managerA,
    );
    expect(filed.errors).toBeUndefined();
    const mlcId = filed.data.recordMlcRegister.id;

    // Attack the table DIRECTLY, bypassing every service-layer check — if this
    // succeeded, the register would only be "immutable" by convention.
    await expect(
      h.prisma.mlcRegisters.update({ where: { id: mlcId }, data: { injury_details: 'TAMPERED' } }),
    ).rejects.toThrow(/immutable/i);

    await expect(h.prisma.mlcRegisters.delete({ where: { id: mlcId } })).rejects.toThrow(/cannot be deleted/i);

    // The sanctioned correction path still works, and records what changed.
    const amended = await h.gql(
      `mutation($input: AmendMlcRegisterInput!) {
         amendMlcRegister(input: $input) { id amendments { field_name previous_value corrected_value reason } }
       }`,
      {
        input: {
          mlc_register_id: mlcId,
          field_name: 'injury_details',
          corrected_value: 'Abrasions to left leg and forehead',
          reason: 'Additional injury identified on examination',
        },
      },
      actors.managerA,
    );
    expect(amended.errors).toBeUndefined();
    expect(amended.data.amendMlcRegister.amendments).toHaveLength(1);
    expect(amended.data.amendMlcRegister.amendments[0].previous_value).toBe('Abrasions to left leg');

    // Deliberately NOT deleted here: an amendment is append-only too, and
    // this assertion is the proof. afterEach clears it by TRUNCATE, the only
    // mechanism that can, and one application code never has.
    await expect(h.prisma.mlcAmendments.deleteMany({ where: { mlc_register_id: mlcId } })).rejects.toThrow(
      /append-only/i,
    );
  });

  it('the bed board reports live occupancy and never leaks another org', async () => {
    await admit(probeBedId, 'IPD-PROBE board');

    const res = await h.gql(
      `query($filter: BedBoardFilterInput!) {
         bedBoard(filter: $filter) {
           summary { total occupied available occupancy_rate }
           entries { bed_number status patient_name }
         }
       }`,
      { filter: { clinic_id: IDS.clinicA } },
      actors.managerA,
    );

    expect(res.errors).toBeUndefined();
    const board = res.data.bedBoard;
    const probe = board.entries.find((e: any) => e.bed_number === 'PROBE-01');
    expect(probe.status).toBe('occupied');
    expect(probe.patient_name).toBeTruthy();
    // Org B's fixture bed must not appear on org A's board.
    expect(board.entries.some((e: any) => e.bed_number === 'B-01')).toBe(false);
  });
});
