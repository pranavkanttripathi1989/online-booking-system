import { createHarness, Harness } from './setup/app';
import { buildActors } from './setup/actors';
import { IDS } from './setup/fixture';

/**
 * P1-17 — no-show risk score, against the real backend: real
 * createAppointment forcing awaiting_payment on a genuinely high-risk
 * booking, and the real appointment(id) query exposing a live-computed
 * no_show_risk, not a stored/stale value.
 */

const CREATE_APPOINTMENT = `
  mutation($input: AppointmentInput!) {
    createAppointment(input: $input) { id status }
  }`;
const GET_APPOINTMENT = `
  query($id: ID!) {
    appointment(id: $id) { id no_show_risk { score level reasons } }
  }`;

describe('No-show risk score (P1-17)', () => {
  let h: Harness;
  const actors = buildActors();
  let createdIds: string[] = [];
  let originalNoShowCount: number;

  beforeAll(async () => {
    h = await createHarness();
    const patient = await h.prisma.patients.findUniqueOrThrow({ where: { id: IDS.patientA } });
    originalNoShowCount = patient.no_show_count;
  });

  afterAll(async () => {
    if (createdIds.length) {
      await h?.prisma.appointments.deleteMany({ where: { id: { in: createdIds } } });
    }
    await h?.prisma.patients.update({ where: { id: IDS.patientA }, data: { no_show_count: originalNoShowCount } });
    await h?.close();
  });

  it('a clean-history patient booking a near-term slot is not forced into prepayment', async () => {
    await h.prisma.patients.update({ where: { id: IDS.patientA }, data: { no_show_count: 0 } });
    const result = await h.gql(
      CREATE_APPOINTMENT,
      {
        input: {
          clinic_id: IDS.clinicA,
          clinician_id: IDS.clinicianA,
          patient_id: IDS.patientA,
          service_id: IDS.productA,
          start_datetime: '2026-11-05T09:00:00.000Z',
          notes: 'P1-17-NO-SHOW-RISK-PROBE',
        },
      },
      actors.managerA,
    );
    expect(result.errors).toBeUndefined();
    expect(result.data!.createAppointment.status).not.toBe('awaiting_payment');
    createdIds.push(result.data!.createAppointment.id);
  });

  it('a patient with real no-show history is forced into awaiting_payment on a self-booked, far-out slot', async () => {
    await h.prisma.patients.update({ where: { id: IDS.patientA }, data: { no_show_count: 5 } });
    const result = await h.gql(
      CREATE_APPOINTMENT,
      {
        input: {
          clinic_id: IDS.clinicA,
          clinician_id: IDS.clinicianA,
          patient_id: IDS.patientA,
          service_id: IDS.productA,
          start_datetime: '2026-12-15T09:00:00.000Z',
          notes: 'P1-17-NO-SHOW-RISK-PROBE',
        },
      },
      actors.patientA,
    );
    expect(result.errors).toBeUndefined();
    expect(result.data!.createAppointment.status).toBe('awaiting_payment');
    createdIds.push(result.data!.createAppointment.id);
  });

  it('exposes a real, live-computed no_show_risk on a read, reflecting the patient\'s current history', async () => {
    await h.prisma.patients.update({ where: { id: IDS.patientA }, data: { no_show_count: 0 } });
    const created = await h.gql(
      CREATE_APPOINTMENT,
      {
        input: {
          clinic_id: IDS.clinicA,
          clinician_id: IDS.clinicianA,
          patient_id: IDS.patientA,
          service_id: IDS.productA,
          start_datetime: '2026-11-06T09:00:00.000Z',
          notes: 'P1-17-NO-SHOW-RISK-PROBE',
        },
      },
      actors.managerA,
    );
    expect(created.errors).toBeUndefined();
    const appointmentId = created.data!.createAppointment.id;
    createdIds.push(appointmentId);

    const before = await h.gql(GET_APPOINTMENT, { id: appointmentId }, actors.managerA);
    expect(before.errors).toBeUndefined();
    expect(before.data!.appointment.no_show_risk.level).toBe('low');

    // Bump the patient's real no-show history after the appointment was
    // created -- a live read must reflect it, since risk is never a
    // stored/stale column.
    await h.prisma.patients.update({ where: { id: IDS.patientA }, data: { no_show_count: 5 } });
    const after = await h.gql(GET_APPOINTMENT, { id: appointmentId }, actors.managerA);
    expect(after.errors).toBeUndefined();
    expect(after.data!.appointment.no_show_risk.level).toBe('high');
    expect(after.data!.appointment.no_show_risk.reasons).toContain('5 prior no-shows');
  });
});
