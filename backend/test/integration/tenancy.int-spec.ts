import { createHarness, Harness } from './setup/app';
import { Actor, ActorName, buildActors } from './setup/actors';
import { IDS } from './setup/fixture';
import { CASES, DomainCase } from './setup/domain-cases';

/**
 * THE TENANCY MATRIX (F-25 / BUG007).
 *
 * technical-plans/00-foundation-hardening.md §4. Table-driven over every
 * tenant-scoped read × every caller archetype, so adding a domain is one row
 * rather than a new suite.
 *
 * What makes this different from the 641 unit tests: nothing is mocked. A unit
 * test asserts the `where` object a service *built*; this asserts the rows the
 * database actually *returned*, over real HTTP, through the real guard chain.
 * A `where` clause can look correct and still leak — `{ client_org_id: undefined }`
 * is the canonical example, because Prisma reads it as "no filter". That is
 * precisely how F-01 shipped with a green suite.
 *
 * The assertion that carries the weight is NOT "the caller sees something". A
 * leaking query passes that. It is **"org B's specific id is absent"**.
 */

type Expectation = 'ownOrgOnly' | 'all' | 'empty' | 'forbidden' | 'unauthenticated';

const READERS: ActorName[] = [
  'superAdmin',
  'admin',
  'managerA',
  'clinicianA',
  'staffA',
  'patientA',
  'managerB',
  'patientNoOrg',
  'anonymous',
];

function roleOf(actor: Actor): string | null {
  return actor.payload?.roles?.[0] ?? null;
}

function expectationFor(actor: Actor, c: DomainCase): Expectation {
  if (actor.name === 'anonymous') return 'unauthenticated';
  const role = roleOf(actor);
  if (role && !c.allowedRoles.includes(role)) return 'forbidden';
  if (actor.isPlatformOperator) return 'all';
  // A caller with a real org sees that org. A caller with NO org — which in
  // practice only ever means a self-registered account — sees nothing. "No org"
  // must never be read as "every org"; that inference was F-01.
  return actor.org ? 'ownOrgOnly' : 'empty';
}

describe('tenancy matrix', () => {
  let h: Harness;
  const actors = buildActors();

  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(async () => {
    await h?.close();
  });

  describe.each(CASES.map((c) => [`${c.domain}: ${c.what}`, c] as const))('%s', (_title, c) => {
    it.each(READERS.map((n) => [`${actors[n].label} -> ${expectationFor(actors[n], c)}`, n] as const))(
      '%s',
      async (_label, actorName) => {
        const actor = actors[actorName];
        const expectation = expectationFor(actor, c);
        const res = await h.gql(c.query, c.variables ?? {}, actor);

        if (expectation === 'unauthenticated') {
          expect(res.errorCode).toBe('UNAUTHENTICATED');
          return;
        }
        if (expectation === 'forbidden') {
          expect(res.errorCode).toBe('FORBIDDEN');
          return;
        }

        expect(res.errors).toBeUndefined();
        const ids = c.ids(res.data);

        if (expectation === 'all') {
          expect(ids).toEqual(expect.arrayContaining([c.aId, c.bId]));
          return;
        }
        if (expectation === 'empty') {
          // The self-registered, org-less caller. Must see neither tenant.
          expect(ids).not.toContain(c.aId);
          expect(ids).not.toContain(c.bId);
          return;
        }

        // ownOrgOnly — asserted from the caller's own side so the same row
        // serves org A and org B actors.
        const own = actor.org === IDS.orgA ? c.aId : c.bId;
        const foreign = actor.org === IDS.orgA ? c.bId : c.aId;
        expect(ids).toContain(own);
        expect(ids).not.toContain(foreign);
      },
    );
  });

  // Single-record reads. A list query can be scoped correctly while the
  // by-id path is not — the by-id path takes a caller-supplied id, which is the
  // classic IDOR shape, and it is a separate code path in every service here.
  describe('single-record cross-tenant reads', () => {
    const BY_ID: Array<{ domain: string; what: string; query: string; foreignId: string; actor: ActorName }> = [
      { domain: 'clinics', what: 'clinic(id) from another org', query: `query($id: ID!) { clinic(id: $id) { id } }`, foreignId: IDS.clinicB, actor: 'managerA' },
      { domain: 'products', what: 'product(id) from another org', query: `query($id: ID!) { product(id: $id) { id } }`, foreignId: IDS.productB, actor: 'managerA' },
      { domain: 'appointments', what: 'appointment(id) from another org', query: `query($id: ID!) { appointment(id: $id) { id } }`, foreignId: IDS.appointmentB, actor: 'managerA' },
      { domain: 'test-results', what: 'testResult(id) from another org', query: `query($id: ID!) { testResult(id: $id) { id } }`, foreignId: IDS.testResultLinkedB, actor: 'managerA' },
      // The second live leak. A free-text test result (patient_id NULL — the
      // common shape) read by a self-registered, org-less account. The org
      // check in findOne is skipped entirely when client_org_id is null, and
      // `row.patient_id !== user.patient_id` is `null !== null` → false, so the
      // patient self-scope does not catch it either.
      { domain: 'test-results', what: 'testResult(id) with NULL patient_id, read by a self-registered account', query: `query($id: ID!) { testResult(id: $id) { id } }`, foreignId: IDS.testResultFreeB, actor: 'patientNoOrg' },
    ];

    it.each(BY_ID.map((b) => [`${b.domain}: ${b.what}`, b] as const))('%s is not readable', async (_t, b) => {
      const res = await h.gql(b.query, { id: b.foreignId }, actors[b.actor]);
      const returnedId = res.data ? Object.values(res.data)[0] : null;
      // Either a NotFound-style error or an explicit null — never the row.
      expect(returnedId).toBeFalsy();
    });
  });

  // Writes. CLAUDE.md Hard Rule 6 records this as a repeated real bug class:
  // update/delete look up an existing row first and so inherit the check, while
  // create takes a foreign key straight from the input and had nowhere natural
  // to hang it.
  describe('cross-tenant writes are rejected', () => {
    it('createRoom into another org’s clinic', async () => {
      const res = await h.gql(
        `mutation($input: RoomInput!) { createRoom(input: $input) { id } }`,
        { input: { clinic_id: IDS.clinicB, room_number: 'INTRUDER-1' } },
        actors.managerA,
      );
      expect(res.errors).toBeDefined();
      const created = await h.prisma.rooms.findFirst({ where: { room_number: 'INTRUDER-1' } });
      expect(created).toBeNull();
    });

    it('createAppointment into another org’s clinic', async () => {
      const res = await h.gql(
        `mutation($input: AppointmentInput!) { createAppointment(input: $input) { id } }`,
        {
          input: {
            clinic_id: IDS.clinicB,
            room_id: IDS.roomB,
            clinician_id: IDS.clinicianB,
            patient_id: IDS.patientB,
            appointment_date: '2026-09-02T10:00:00.000Z',
            appointment_time: '2026-09-02T10:00:00.000Z',
            reason: 'INTRUDER',
          },
        },
        actors.managerA,
      );
      expect(res.errors).toBeDefined();
      const created = await h.prisma.appointments.findFirst({ where: { reason: 'INTRUDER' } });
      expect(created).toBeNull();
    });
  });
});
