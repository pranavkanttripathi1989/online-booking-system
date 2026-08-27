import Redis from 'ioredis';
import { createHarness, Harness } from './setup/app';
import { buildActors } from './setup/actors';
import { IDS } from './setup/fixture';

/**
 * P1-05 — slot hold (BOOK-2) and booking idempotency (BOOK-3), against the
 * real backend. booking-concurrency.int-spec.ts already proves the DB's own
 * EXCLUDE constraint is what makes "two browsers can't book the same slot"
 * true; this file proves the two things that constraint alone does NOT
 * give you: a slot can be reserved for one patient's wizard before they've
 * finished filling it in (the hold), and a retried/double-tapped booking
 * request never creates a second row (the idempotency key) — including
 * under real concurrency, not just sequentially.
 */

const HOLD_SLOT = '2026-10-16T09:00:00.000Z';
const IDEMPOTENCY_SLOT = '2026-10-16T10:00:00.000Z';
const CONCURRENT_IDEMPOTENCY_SLOT = '2026-10-16T11:00:00.000Z';
const CREATE_MUTATION = `
  mutation($input: AppointmentInput!) {
    createAppointment(input: $input) { id }
  }`;
const HOLD_MUTATION = `
  mutation($clinician_id: String!, $start_datetime: String!) {
    holdAppointmentSlot(clinician_id: $clinician_id, start_datetime: $start_datetime) {
      hold_token
      expires_at
    }
  }`;
const RELEASE_MUTATION = `
  mutation($clinician_id: String!, $start_datetime: String!, $hold_token: String!) {
    releaseAppointmentSlot(clinician_id: $clinician_id, start_datetime: $start_datetime, hold_token: $hold_token)
  }`;

describe('booking slot hold & idempotency (P1-05)', () => {
  let h: Harness;
  const actors = buildActors();
  // Unlike postgres_test, Redis has no separate throwaway instance — this
  // suite's own SlotHoldsService talks to the same Redis global-setup.ts
  // never resets. A raw client here (never DEL'd via the mutation's own
  // "only if the token matches" safety, deliberately) lets this file
  // guarantee a clean slate regardless of what a prior interrupted run left.
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  const holdKey = `slot-hold:${IDS.clinicianA}:${HOLD_SLOT}`;

  beforeAll(async () => {
    await redis.del(holdKey);
    h = await createHarness();
  });
  afterAll(async () => {
    await h?.prisma.appointments.deleteMany({ where: { reason: { in: ['P1-05-IDEMPOTENCY-PROBE', 'P1-05-CONCURRENT-IDEMPOTENCY-PROBE'] } } });
    await redis.del(holdKey);
    await redis.quit();
    await h?.close();
  });

  describe('slot hold', () => {
    it('a second hold for the same clinician/time is rejected while the first is still active', async () => {
      const first = await h.gql(HOLD_MUTATION, { clinician_id: IDS.clinicianA, start_datetime: HOLD_SLOT }, actors.managerA);
      expect(first.errors).toBeUndefined();
      const holdToken = first.data!.holdAppointmentSlot.hold_token;
      expect(holdToken).toEqual(expect.any(String));

      const second = await h.gql(HOLD_MUTATION, { clinician_id: IDS.clinicianA, start_datetime: HOLD_SLOT }, actors.managerA);
      expect(second.errors?.[0]?.message).toMatch(/currently held/);

      // Explicit release frees it up for a new hold immediately, without
      // waiting for the TTL.
      const released = await h.gql(RELEASE_MUTATION, { clinician_id: IDS.clinicianA, start_datetime: HOLD_SLOT, hold_token: holdToken }, actors.managerA);
      expect(released.data!.releaseAppointmentSlot).toBe(true);

      const third = await h.gql(HOLD_MUTATION, { clinician_id: IDS.clinicianA, start_datetime: HOLD_SLOT }, actors.managerA);
      expect(third.errors).toBeUndefined();

      // Tidy up so afterAll's own best-effort release isn't the only cleanup.
      await h.gql(
        RELEASE_MUTATION,
        { clinician_id: IDS.clinicianA, start_datetime: HOLD_SLOT, hold_token: third.data!.holdAppointmentSlot.hold_token },
        actors.managerA,
      );
    });
  });

  describe('idempotency key', () => {
    it('a repeat key on createAppointment returns the original appointment, not a second row', async () => {
      const input = {
        clinic_id: IDS.clinicA,
        clinician_id: IDS.clinicianA,
        patient_id: IDS.patientA,
        service_id: IDS.productA,
        start_datetime: IDEMPOTENCY_SLOT,
        notes: 'P1-05-IDEMPOTENCY-PROBE',
        idempotency_key: 'p1-05-sequential-retry-probe',
      };

      const firstCall = await h.gql(CREATE_MUTATION, { input }, actors.managerA);
      expect(firstCall.errors).toBeUndefined();
      const firstId = firstCall.data!.createAppointment.id;

      // Same key, same call, simulating a flaky-network resubmit — never a
      // second real request the way a genuinely different booking would be.
      const secondCall = await h.gql(CREATE_MUTATION, { input }, actors.managerA);
      expect(secondCall.errors).toBeUndefined();
      expect(secondCall.data!.createAppointment.id).toBe(firstId);

      const persisted = await h.prisma.appointments.count({ where: { reason: 'P1-05-IDEMPOTENCY-PROBE' } });
      expect(persisted).toBe(1);
    });

    it('N truly-concurrent requests carrying the same key all agree on one appointment, and only one row is ever persisted', async () => {
      const input = {
        clinic_id: IDS.clinicA,
        clinician_id: IDS.clinicianA,
        patient_id: IDS.patientA,
        service_id: IDS.productA,
        start_datetime: CONCURRENT_IDEMPOTENCY_SLOT,
        notes: 'P1-05-CONCURRENT-IDEMPOTENCY-PROBE',
        idempotency_key: 'p1-05-concurrent-doubletap-probe',
      };

      const results = await Promise.all(Array.from({ length: 5 }, () => h.gql(CREATE_MUTATION, { input }, actors.managerA)));
      const ids = results.map((r) => r.data?.createAppointment?.id).filter(Boolean);

      // Every single request succeeded (unlike the plain EXCLUDE-constraint
      // case in booking-concurrency.int-spec.ts, where only one of N wins) —
      // that is the whole point of an idempotency key: a genuine double-tap
      // or resubmit of the SAME request is never an error, and every caller
      // walks away with the SAME appointment id.
      expect(ids).toHaveLength(5);
      expect(new Set(ids).size).toBe(1);

      const persisted = await h.prisma.appointments.count({ where: { reason: 'P1-05-CONCURRENT-IDEMPOTENCY-PROBE' } });
      expect(persisted).toBe(1);
    });
  });
});
