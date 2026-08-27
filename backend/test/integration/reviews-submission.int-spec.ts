import { createHarness, Harness } from './setup/app';
import { buildActors } from './setup/actors';
import { IDS } from './setup/fixture';

/**
 * P1-06 — the patient-facing review submission path, against the real
 * backend: real auth guard chain, real self-scoping (Hard Rule 6), real
 * @@unique(appointment_id) constraint, and the real has_review resolve
 * field a page would actually read to decide whether to show the form.
 */

const SLOT = '2026-10-17T09:00:00.000Z';

const CREATE_APPOINTMENT = `
  mutation($input: AppointmentInput!) {
    createAppointment(input: $input) { id }
  }`;
const COMPLETE_APPOINTMENT = `
  mutation($id: ID!) {
    completeAppointment(id: $id) { id status }
  }`;
const SUBMIT_REVIEW = `
  mutation($input: CreateReviewInput!) {
    submitReview(input: $input) {
      success
      review { id stars comment }
    }
  }`;
const APPOINTMENT_HAS_REVIEW = `
  query($id: ID!) {
    appointment(id: $id) { id has_review }
  }`;

describe('review submission (P1-06)', () => {
  let h: Harness;
  const actors = buildActors();
  let appointmentId: string;

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
          start_datetime: SLOT,
          notes: 'P1-06-REVIEW-PROBE',
        },
      },
      actors.managerA,
    );
    expect(created.errors).toBeUndefined();
    appointmentId = created.data!.createAppointment.id;
    const completed = await h.gql(COMPLETE_APPOINTMENT, { id: appointmentId }, actors.managerA);
    expect(completed.errors).toBeUndefined();
    expect(completed.data!.completeAppointment.status).toBe('completed');
  });

  afterAll(async () => {
    await h?.prisma.reviews.deleteMany({ where: { appointment_id: appointmentId } });
    await h?.prisma.appointments.deleteMany({ where: { reason: 'P1-06-REVIEW-PROBE' } });
    await h?.close();
  });

  it('has_review reads false before any review is submitted', async () => {
    const result = await h.gql(APPOINTMENT_HAS_REVIEW, { id: appointmentId }, actors.patientA);
    expect(result.errors).toBeUndefined();
    expect(result.data!.appointment.has_review).toBe(false);
  });

  it('rejects a review for a not-yet-completed appointment', async () => {
    const result = await h.gql(SUBMIT_REVIEW, { input: { appointment_id: IDS.appointmentA, stars: 5, comment: 'Too soon' } }, actors.patientA);
    expect(result.errors?.[0]?.message).toMatch(/completed appointment/);
  });

  it("rejects a different patient's attempt to review this appointment (Hard Rule 6, real tenant isolation)", async () => {
    const result = await h.gql(SUBMIT_REVIEW, { input: { appointment_id: appointmentId, stars: 1, comment: 'Not mine' } }, actors.patientB);
    expect(result.errors?.[0]?.message).toMatch(/not found/i);
  });

  it('the real patient can submit a review for their own completed appointment', async () => {
    const result = await h.gql(SUBMIT_REVIEW, { input: { appointment_id: appointmentId, stars: 5, comment: 'Excellent care' } }, actors.patientA);
    expect(result.errors).toBeUndefined();
    expect(result.data!.submitReview.success).toBe(true);
    expect(result.data!.submitReview.review.stars).toBe(5);
  });

  it('has_review flips to true once a review exists', async () => {
    const result = await h.gql(APPOINTMENT_HAS_REVIEW, { id: appointmentId }, actors.patientA);
    expect(result.data!.appointment.has_review).toBe(true);
  });

  it('a second submission for the same appointment is rejected as a clean conflict, not a raw constraint error', async () => {
    const result = await h.gql(SUBMIT_REVIEW, { input: { appointment_id: appointmentId, stars: 2, comment: 'Trying again' } }, actors.patientA);
    expect(result.errors?.[0]?.message).toMatch(/already reviewed/);
  });

  it('a non-patient caller (e.g. a manager) is rejected by the role gate, never reaching the service', async () => {
    const result = await h.gql(SUBMIT_REVIEW, { input: { appointment_id: appointmentId, stars: 5, comment: 'On behalf of' } }, actors.managerA);
    expect(result.errors?.[0]?.message).toMatch(/permission/i);
  });

  it('getClinician (public dialect) reflects the real rating/review count', async () => {
    const query = `query($id: ID!) { getClinician(id: $id) { id rating reviews } }`;
    const result = await h.gql(query, { id: IDS.clinicianA }, actors.anonymous);
    expect(result.errors).toBeUndefined();
    expect(result.data!.getClinician.reviews).toBeGreaterThanOrEqual(1);
    expect(result.data!.getClinician.rating).toEqual(expect.any(Number));
  });
});
