import { createHarness, Harness } from './setup/app';
import { buildActors } from './setup/actors';
import { IDS } from './setup/fixture';

/**
 * Double-booking under concurrency
 * (technical-plans/00-foundation-hardening.md §4, "Booking-concurrency test").
 *
 * The plan says to write this NOW and states plainly that it is
 * "**Expected to fail** until Phase 1 §3.3 adds the exclusion constraint —
 * write it now, as that constraint's acceptance criterion."
 *
 * So this is deliberately `it.failing`. Jest inverts it: the suite is green
 * while the double-booking is still possible, and turns RED the moment the
 * exclusion constraint lands and the behaviour becomes correct. That is the
 * intent — the failure is recorded as executable spec rather than prose, and
 * whoever adds the constraint is forced to come here and flip this line, which
 * is how the acceptance criterion gets acknowledged instead of forgotten.
 *
 * There is no application-level lock to rely on either: availability is checked
 * and the row is inserted in separate statements, so two requests can both pass
 * the check before either writes.
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

  it.failing(`only one of ${CONCURRENT_ATTEMPTS} concurrent bookings for one slot succeeds`, async () => {
    const mutation = `
      mutation($input: AppointmentInput!) {
        createAppointment(input: $input) { id }
      }`;
    const input = {
      clinic_id: IDS.clinicA,
      room_id: IDS.roomA,
      clinician_id: IDS.clinicianA,
      patient_id: IDS.patientA,
      appointment_date: SLOT,
      appointment_time: SLOT,
      reason: 'CONCURRENCY-PROBE',
    };

    const results = await Promise.all(
      Array.from({ length: CONCURRENT_ATTEMPTS }, () => h.gql(mutation, { input }, actors.managerA)),
    );

    const succeeded = results.filter((r) => !r.errors && r.data?.createAppointment?.id).length;
    const persisted = await h.prisma.appointments.count({ where: { reason: 'CONCURRENCY-PROBE' } });

    // Both must be 1. Today both are CONCURRENT_ATTEMPTS: every request passes
    // the availability check before any of them inserts.
    expect(succeeded).toBe(1);
    expect(persisted).toBe(1);
  });
});
