import { createHarness, Harness } from './setup/app';
import { buildActors } from './setup/actors';
import { IDS } from './setup/fixture';

/**
 * REQ179 (IPD slice 3) — operation theatre scheduling's own
 * Definition-of-Done gates. Same rationale as ipd-adt.int-spec.ts: these
 * are DATABASE guarantees a mocked-Prisma unit test cannot exercise.
 *
 *   1. N concurrent bookings into one theatre — the `ot_bookings_no_
 *      theatre_overlap` GiST EXCLUDE constraint, no application-level lock.
 *   2. Turnaround is genuinely folded into the excluded range: a booking
 *      starting exactly at another's end_at (no turnaround gap) is
 *      rejected; one starting after end_at + turnaround succeeds.
 *   3. Surgeon-overlap — the same surgeon cannot hold two bookings (in
 *      different theatres) that overlap in real procedure time.
 *   4. completeOtBooking requires all 3 WHO Surgical Safety Checklist
 *      phases complete.
 *   5. OtNotes' sign-off immutability, enforced by a Postgres trigger —
 *      asserted by attacking the table directly.
 */

const CONCURRENT_ATTEMPTS = 5;

describe('IPD operation theatre', () => {
  let h: Harness;
  const actors = buildActors();

  let probeTheatreId: string;
  let probeTheatreTwoId: string;
  let probeSurgeonIds: string[];

  const createdBookingIds: string[] = [];

  const bookingWindow = (offsetHours: number, durationHours = 1) => {
    const start = new Date(Date.now() + offsetHours * 3_600_000);
    const end = new Date(start.getTime() + durationHours * 3_600_000);
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const book = (theatreId: string, startAt: string, endAt: string, surgeonId = IDS.clinicianA, turnaround?: number) =>
    h.gql(
      `mutation($input: CreateOtBookingInput!) { createOtBooking(input: $input) { id status } }`,
      {
        input: {
          admission_id: IDS.admissionA,
          theatre_id: theatreId,
          procedure_name: 'OT-PROBE procedure',
          primary_surgeon_clinician_id: surgeonId,
          start_at: startAt,
          end_at: endAt,
          ...(turnaround !== undefined ? { turnaround_minutes: turnaround } : {}),
        },
      },
      actors.managerA,
    );

  const cleanupProbes = async () => {
    if (createdBookingIds.length === 0) return;
    // A signed OtNotes row genuinely cannot be DELETEd -- not by the app,
    // not by this cleanup -- via the same reject_write_if_locked() trigger
    // AdmissionNotes/DischargeSummaries carry (REQ179 slice 2). TRUNCATE is
    // the one operation Postgres exempts from per-row triggers, exactly the
    // MlcRegisters/MlcAmendments precedent in ipd-adt.int-spec.ts.
    await h.prisma.$executeRawUnsafe('TRUNCATE TABLE "OtNotes" CASCADE');
    await h.prisma.otConsumables.deleteMany({ where: { booking_id: { in: createdBookingIds } } });
    await h.prisma.otChecklists.deleteMany({ where: { booking_id: { in: createdBookingIds } } });
    await h.prisma.otBookingStaff.deleteMany({ where: { booking_id: { in: createdBookingIds } } });
    await h.prisma.otBookings.deleteMany({ where: { id: { in: createdBookingIds } } });
    createdBookingIds.length = 0;
  };

  beforeAll(async () => {
    h = await createHarness();
    const theatre = await h.prisma.operationTheatres.create({
      data: { client_org_id: IDS.orgA, clinic_id: IDS.clinicA, name: 'OT-PROBE-1', default_turnaround_minutes: 30 },
    });
    probeTheatreId = theatre.id;
    const theatreTwo = await h.prisma.operationTheatres.create({
      data: { client_org_id: IDS.orgA, clinic_id: IDS.clinicA, name: 'OT-PROBE-2', default_turnaround_minutes: 30 },
    });
    probeTheatreTwoId = theatreTwo.id;

    // Distinct surgeons so the concurrent-bookings gate isolates the
    // theatre-overlap constraint alone -- a shared surgeon would also trip
    // the surgeon-overlap constraint, muddying which one actually fired.
    const stamp = Date.now();
    const clinicians = await Promise.all(
      Array.from({ length: CONCURRENT_ATTEMPTS }, (_, i) =>
        h.prisma.clinicians.create({
          data: {
            clinic_id: IDS.clinicA,
            first_name: 'OtProbe',
            last_name: `Surgeon${i}`,
            clinician_type: 'doctor',
            email: `ot-probe-surgeon-${i}-${stamp}@ipd.test`,
            phone: `+9177${String(stamp).slice(-6)}${i}`,
          },
        }),
      ),
    );
    probeSurgeonIds = clinicians.map((c) => c.id);
  });

  afterAll(async () => {
    await cleanupProbes();
    await h?.prisma.operationTheatres.deleteMany({ where: { id: { in: [probeTheatreId, probeTheatreTwoId] } } });
    await h?.prisma.clinicians.deleteMany({ where: { id: { in: probeSurgeonIds } } });
    await h?.close();
  });

  afterEach(cleanupProbes);

  it(`only one of ${CONCURRENT_ATTEMPTS} concurrent bookings into one theatre succeeds`, async () => {
    const { start, end } = bookingWindow(48);
    const results = await Promise.all(
      probeSurgeonIds.map((surgeonId) => book(probeTheatreId, start, end, surgeonId)),
    );

    const succeeded = results.filter((r) => !r.errors && r.data?.createOtBooking?.id);
    const failed = results.filter((r) => r.errors);

    succeeded.forEach((r) => createdBookingIds.push(r.data.createOtBooking.id));

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(CONCURRENT_ATTEMPTS - 1);
    // Every surgeon here is distinct, so only the theatre-overlap
    // constraint can be what rejected the other four.
    for (const r of failed) {
      expect(r.errors![0].message).toMatch(/already booked/i);
    }
  });

  it('rejects a booking starting exactly when another ends (turnaround not yet elapsed)', async () => {
    const { start, end } = bookingWindow(72);
    const first = await book(probeTheatreId, start, end);
    expect(first.errors).toBeUndefined();
    createdBookingIds.push(first.data.createOtBooking.id);

    // Starts exactly at `end` -- back-to-back in procedure time, but the
    // 30-minute turnaround has not elapsed, so the theatre is still
    // physically blocked.
    const second = await book(probeTheatreId, end, new Date(new Date(end).getTime() + 3_600_000).toISOString());
    expect(second.errors).toBeDefined();
    expect(second.errors![0].message).toMatch(/already booked/i);
  });

  it('allows a booking starting after the prior one plus its turnaround', async () => {
    const { start, end } = bookingWindow(96);
    const first = await book(probeTheatreId, start, end);
    expect(first.errors).toBeUndefined();
    createdBookingIds.push(first.data.createOtBooking.id);

    const afterTurnaround = new Date(new Date(end).getTime() + 31 * 60_000).toISOString();
    const second = await book(probeTheatreId, afterTurnaround, new Date(new Date(afterTurnaround).getTime() + 3_600_000).toISOString());
    expect(second.errors).toBeUndefined();
    createdBookingIds.push(second.data.createOtBooking.id);
  });

  it('rejects the same surgeon double-booked across two different theatres', async () => {
    const { start, end } = bookingWindow(120);
    const first = await book(probeTheatreId, start, end, IDS.clinicianA);
    expect(first.errors).toBeUndefined();
    createdBookingIds.push(first.data.createOtBooking.id);

    // Same surgeon, a DIFFERENT theatre, overlapping procedure time -- the
    // theatre-overlap constraint alone would not catch this.
    const second = await book(probeTheatreTwoId, start, end, IDS.clinicianA);
    expect(second.errors).toBeDefined();
    expect(second.errors![0].message).toMatch(/already has another OT booking/i);
  });

  it('completeOtBooking requires all 3 WHO checklist phases complete', async () => {
    const { start, end } = bookingWindow(144);
    const created = await book(probeTheatreId, start, end);
    expect(created.errors).toBeUndefined();
    const bookingId = created.data.createOtBooking.id;
    createdBookingIds.push(bookingId);

    const startRes = await h.gql(`mutation($id: ID!) { startOtBooking(id: $id) { status } }`, { id: bookingId }, actors.managerA);
    expect(startRes.data.startOtBooking.status).toBe('in_progress');

    const incomplete = await h.gql(`mutation($id: ID!) { completeOtBooking(id: $id) { status } }`, { id: bookingId }, actors.managerA);
    expect(incomplete.errors).toBeDefined();
    expect(incomplete.errors![0].message).toMatch(/WHO checklist/i);

    const items = [{ key: 'k1', label: 'Check', checked: true }];
    for (const phase of ['sign_in', 'time_out', 'sign_out']) {
      const res = await h.gql(
        `mutation($input: CompleteOtChecklistInput!) { completeOtChecklist(input: $input) { id } }`,
        { input: { booking_id: bookingId, phase, items } },
        actors.managerA,
      );
      expect(res.errors).toBeUndefined();
    }

    const complete = await h.gql(`mutation($id: ID!) { completeOtBooking(id: $id) { status } }`, { id: bookingId }, actors.managerA);
    expect(complete.errors).toBeUndefined();
    expect(complete.data.completeOtBooking.status).toBe('completed');
  });

  it('an operative note cannot be edited after signing, enforced by the database itself', async () => {
    const { start, end } = bookingWindow(168);
    const created = await book(probeTheatreId, start, end);
    expect(created.errors).toBeUndefined();
    const bookingId = created.data.createOtBooking.id;
    createdBookingIds.push(bookingId);

    const note = await h.gql(
      `mutation($input: CreateOtNoteInput!) { createOtNote(input: $input) { id } }`,
      { input: { booking_id: bookingId, findings: 'Uneventful' } },
      actors.clinicianA,
    );
    expect(note.errors).toBeUndefined();

    const signed = await h.gql(
      `mutation($input: SignOtNoteInput!) { signOtNote(input: $input) { locked } }`,
      { input: { booking_id: bookingId } },
      actors.clinicianA,
    );
    expect(signed.errors).toBeUndefined();
    expect(signed.data.signOtNote.locked).toBe(true);

    // Attack the table DIRECTLY, bypassing every service-layer check.
    await expect(
      h.prisma.otNotes.update({ where: { booking_id: bookingId }, data: { findings: 'TAMPERED' } }),
    ).rejects.toThrow(/signed \(locked\)/i);
  });
});
