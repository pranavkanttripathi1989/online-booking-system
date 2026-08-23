import { createHarness, Harness } from './setup/app';
import { buildActors } from './setup/actors';
import { IDS } from './setup/fixture';

/**
 * Double-booking under concurrency
 * (technical-plans/00-foundation-hardening.md §4, "Booking-concurrency test").
 *
 * Was deliberately `it.failing` until the P3.1 exclusion constraint
 * (20260823030000_appointments_no_overlap_exclusion_constraint) landed —
 * flipped to a real `it` now that it does, per that plan's own instruction:
 * "whoever adds the constraint is forced to come here and flip this line."
 *
 * There is no application-level lock: assertSlotFree() and the later
 * create() are two separate statements, so N concurrent requests could all
 * pass the check before any of them wrote. The database's own EXCLUDE
 * constraint is what actually makes "is this slot free" atomic; the failed
 * requests surface it as a clean "This time slot is no longer available"
 * (appointments.service.ts maps the raw Postgres exclusion-violation error,
 * matched by constraint name, to that existing message).
 *
 * The `input` shape below was corrected while wiring this up — the
 * pre-existing version (`room_id`/`appointment_date`/`appointment_time`/
 * `reason`) didn't match the real `AppointmentInput` GraphQL type at all
 * (confirmed live: every one of the 5 concurrent requests failed schema
 * validation, `succeeded` was 0, never 5) — the assertion happened to also
 * fail either way, so `it.failing` never caught that this test wasn't
 * exercising the real bug in the first place.
 */

const CONCURRENT_ATTEMPTS = 5;
const SLOT = '2026-10-15T09:00:00.000Z';

describe('booking concurrency', () => {
  let h: Harness;
  const actors = buildActors();

  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(async () => {
    await h?.prisma.appointments.deleteMany({ where: { reason: 'CONCURRENCY-PROBE' } });
    await h?.close();
  });

  it(`only one of ${CONCURRENT_ATTEMPTS} concurrent bookings for one slot succeeds`, async () => {
    const mutation = `
      mutation($input: AppointmentInput!) {
        createAppointment(input: $input) { id }
      }`;
    const input = {
      clinic_id: IDS.clinicA,
      clinician_id: IDS.clinicianA,
      patient_id: IDS.patientA,
      service_id: IDS.productA,
      start_datetime: SLOT,
      notes: 'CONCURRENCY-PROBE',
    };

    const results = await Promise.all(
      Array.from({ length: CONCURRENT_ATTEMPTS }, () => h.gql(mutation, { input }, actors.managerA)),
    );

    const succeeded = results.filter((r) => !r.errors && r.data?.createAppointment?.id).length;
    const failed = results.filter((r) => r.errors);
    const persisted = await h.prisma.appointments.count({ where: { reason: 'CONCURRENCY-PROBE' } });

    expect(succeeded).toBe(1);
    expect(persisted).toBe(1);
    // Every rejected attempt gets the existing clean user-facing message,
    // never the raw Postgres exclusion-violation error.
    expect(failed).toHaveLength(CONCURRENT_ATTEMPTS - 1);
    for (const r of failed) {
      expect(r.errors![0].message).toBe('This time slot is no longer available');
    }
  });
});
