import { IDS } from './fixture';

/**
 * The domain table the tenancy matrix iterates.
 *
 * Extracted from tenancy.int-spec.ts so matrix-coverage.int-spec.ts can read
 * COVERED_DOMAINS without importing a spec file — importing one makes Jest
 * execute its describe blocks a second time (observed: 115 tests became 230).
 */

export interface DomainCase {
  /** Domain name — must match a directory under backend/src (matrix-coverage relies on this). */
  domain: string;
  /** Short description of the read under test. */
  what: string;
  query: string;
  variables?: Record<string, unknown>;
  /** Pull the comparable id list out of the GraphQL response. */
  ids: (data: any) => string[];
  /** The org-A row that an org-A caller must see. */
  aId: string;
  /** The org-B row that an org-A caller must NEVER see. */
  bId: string;
  /** Roles the resolver actually admits. Everyone else should be rejected. */
  allowedRoles: string[];
}

export const CASES: DomainCase[] = [
  {
    domain: 'clinics',
    what: 'clinics',
    query: `{ clinics { id } }`,
    ids: (d) => (d.clinics ?? []).map((x: any) => x.id),
    aId: IDS.clinicA,
    bId: IDS.clinicB,
    allowedRoles: ['super_admin', 'admin', 'manager', 'clinician', 'staff', 'patient'],
  },
  {
    domain: 'rooms',
    what: 'rooms',
    query: `{ rooms { id } }`,
    ids: (d) => (d.rooms ?? []).map((x: any) => x.id),
    aId: IDS.roomA,
    bId: IDS.roomB,
    allowedRoles: ['super_admin', 'admin', 'manager', 'clinician', 'staff', 'patient'],
  },
  {
    domain: 'clinicians',
    what: 'clinicians (paginated)',
    query: `{ clinicians { data { id } } }`,
    ids: (d) => (d.clinicians?.data ?? []).map((x: any) => x.id),
    aId: IDS.clinicianA,
    bId: IDS.clinicianB,
    allowedRoles: ['super_admin', 'admin', 'manager', 'clinician', 'staff', 'patient'],
  },
  {
    domain: 'products',
    what: 'products',
    query: `{ products { id } }`,
    ids: (d) => (d.products ?? []).map((x: any) => x.id),
    aId: IDS.productA,
    bId: IDS.productB,
    allowedRoles: ['super_admin', 'admin', 'manager', 'clinician', 'staff', 'patient'],
  },
  {
    domain: 'products',
    what: 'productCategories',
    query: `{ productCategories { id } }`,
    ids: (d) => (d.productCategories ?? []).map((x: any) => x.id),
    aId: IDS.categoryA,
    bId: IDS.categoryB,
    allowedRoles: ['super_admin', 'admin', 'manager', 'clinician', 'staff', 'patient'],
  },
  {
    domain: 'patients',
    what: 'patients (paginated)',
    query: `{ patients { data { id } } }`,
    ids: (d) => (d.patients?.data ?? []).map((x: any) => x.id),
    aId: IDS.patientA,
    bId: IDS.patientB,
    // Ungated on purpose: a `patient` caller reaches this and is narrowed to
    // their own row by patients.service.ts's selfScope(), not by role.
    allowedRoles: ['super_admin', 'admin', 'manager', 'clinician', 'staff', 'patient'],
  },
  {
    domain: 'appointments',
    what: 'appointments (paginated)',
    query: `{ appointments { data { id } } }`,
    ids: (d) => (d.appointments?.data ?? []).map((x: any) => x.id),
    aId: IDS.appointmentA,
    bId: IDS.appointmentB,
    allowedRoles: ['super_admin', 'admin', 'manager', 'clinician', 'staff', 'patient'],
  },
  {
    domain: 'test-results',
    what: 'testResults',
    query: `{ testResults { id } }`,
    ids: (d) => (d.testResults ?? []).map((x: any) => x.id),
    aId: IDS.testResultLinkedA,
    bId: IDS.testResultLinkedB,
    allowedRoles: ['super_admin', 'admin', 'manager', 'clinician', 'staff', 'patient'],
  },
  {
    // The live leak. No @Auth() anywhere on this resolver, and the service used
    // the null-org ternary, so a self-registered account read the full staff
    // directory of every tenant on the platform.
    domain: 'messages',
    what: 'messageableContacts',
    query: `{ messageableContacts { id } }`,
    ids: (d) => (d.messageableContacts ?? []).map((x: any) => x.id),
    // Non-actor users: this read excludes the caller, so an actor id here
    // would be absent for that actor for a legitimate reason.
    aId: IDS.userExtraA,
    bId: IDS.userExtraB,
    allowedRoles: ['super_admin', 'admin', 'manager', 'clinician', 'staff', 'patient'],
  },
  {
    domain: 'staff',
    what: 'staff',
    query: `{ staff { id } }`,
    ids: (d) => (d.staff ?? []).map((x: any) => x.id),
    aId: IDS.userStaffA,
    bId: IDS.userExtraB,
    allowedRoles: ['super_admin', 'admin', 'manager'],
  },
  {
    domain: 'users',
    what: 'getUsers',
    query: `{ getUsers { id } }`,
    ids: (d) => (d.getUsers ?? []).map((x: any) => x.id),
    aId: IDS.userManagerA,
    bId: IDS.userManagerB,
    allowedRoles: ['super_admin', 'admin', 'manager'],
  },
  {
    domain: 'appointment-payments',
    what: 'getTransactionsByDate',
    query: `query($s: String!, $e: String!) { getTransactionsByDate(startDate: $s, endDate: $e, limit: 100, offset: 0) { id } }`,
    variables: { s: '2020-01-01T00:00:00.000Z', e: '2030-01-01T00:00:00.000Z' },
    ids: (d) => (d.getTransactionsByDate ?? []).map((x: any) => x.id),
    aId: IDS.paymentA,
    bId: IDS.paymentB,
    allowedRoles: ['super_admin', 'admin', 'manager'],
  },
  // BUG012 — closes the tenancy matrix's remaining 10 KNOWN_GAPS domains.
  // `organizations`, `org-settings`, and `notifications` are deliberately
  // NOT here — see matrix-coverage.int-spec.ts's EXEMPT for why none of the
  // three fits this generic same-org-sees-same-row shape.
  {
    domain: 'reviews',
    what: 'reviews',
    query: `{ reviews { id } }`,
    ids: (d) => (d.reviews ?? []).map((x: any) => x.id),
    aId: IDS.reviewA,
    bId: IDS.reviewB,
    allowedRoles: ['super_admin', 'admin', 'manager'],
  },
  {
    domain: 'cancellation-rules',
    what: 'cancellationRules',
    query: `{ cancellationRules { id } }`,
    ids: (d) => (d.cancellationRules ?? []).map((x: any) => x.id),
    aId: IDS.cancellationRuleA,
    bId: IDS.cancellationRuleB,
    allowedRoles: ['super_admin', 'admin', 'manager'],
  },
  {
    // BUG012: this query had no @Auth() at all before this fix. 'staff' is
    // included alongside manager/admin/super_admin because calendar/index.jsx
    // (nav-listed for staff, no RoleGuard) is a real caller.
    domain: 'availability',
    what: 'availabilities',
    query: `{ availabilities { id } }`,
    ids: (d) => (d.availabilities ?? []).map((x: any) => x.id),
    aId: IDS.clinicianAvailabilityA,
    bId: IDS.clinicianAvailabilityB,
    allowedRoles: ['super_admin', 'admin', 'manager', 'staff'],
  },
  {
    domain: 'analytics',
    what: 'getClinics',
    query: `{ getClinics { id } }`,
    ids: (d) => (d.getClinics ?? []).map((x: any) => x.id),
    aId: IDS.clinicA,
    bId: IDS.clinicB,
    allowedRoles: ['super_admin', 'admin', 'manager'],
  },
  {
    // BUG012: this query had no @Auth() at all before this fix.
    domain: 'blocks',
    what: 'spacerBlocks',
    query: `{ spacerBlocks { id } }`,
    ids: (d) => (d.spacerBlocks ?? []).map((x: any) => x.id),
    aId: IDS.spacerBlockA,
    bId: IDS.spacerBlockB,
    allowedRoles: ['super_admin', 'admin', 'manager'],
  },
  {
    // 'manager' is deliberately excluded — dashboard.resolver.ts's real
    // @Auth() list is admin/super_admin/staff only.
    domain: 'dashboard',
    what: 'dashboard.upcoming_appointments',
    query: `{ dashboard { upcoming_appointments { id } } }`,
    ids: (d) => (d.dashboard?.upcoming_appointments ?? []).map((x: any) => x.id),
    aId: IDS.appointmentA,
    bId: IDS.appointmentB,
    allowedRoles: ['super_admin', 'admin', 'staff'],
  },
  {
    // Same underlying Products rows the 'products' case above already
    // covers, via a different resolver/type — ungated like its sibling.
    domain: 'services',
    what: 'services',
    query: `{ services { id } }`,
    ids: (d) => (d.services ?? []).map((x: any) => x.id),
    aId: IDS.productA,
    bId: IDS.productB,
    allowedRoles: ['super_admin', 'admin', 'manager', 'clinician', 'staff', 'patient'],
  },
];

/** Domains covered by this matrix — read by matrix-coverage.int-spec.ts. */
export const COVERED_DOMAINS = Array.from(new Set(CASES.map((c) => c.domain)));

