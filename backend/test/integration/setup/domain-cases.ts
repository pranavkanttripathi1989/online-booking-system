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
    // REQ029 (US-RPT-04) -- getAppointmentStats had no matrix coverage at
    // all before this (only getClinics did). AppointmentStats returns one
    // aggregate object per call, not a bare id-bearing list, so topClinicians
    // (populated only from completed appointments -- see the dedicated
    // analyticsApptA/B fixture rows) is the comparable id list, mirroring
    // how the 'dashboard' domain-case above picks a nested array field
    // rather than trying to id the whole aggregate.
    domain: 'analytics',
    what: 'getAppointmentStats.topClinicians',
    query: `{ getAppointmentStats(startDate: "2026-08-25", endDate: "2026-09-05") { topClinicians { id } } }`,
    ids: (d) => (d.getAppointmentStats?.topClinicians ?? []).map((x: any) => x.id),
    aId: IDS.clinicianA,
    bId: IDS.clinicianB,
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
  {
    // REQ017 shipped this domain without ever adding a matrix row --
    // discovered and closed during REQ020's own matrix-coverage pass.
    domain: 'resources',
    what: 'resources',
    query: `{ resources { id } }`,
    ids: (d) => (d.resources ?? []).map((x: any) => x.id),
    aId: IDS.resourceA,
    bId: IDS.resourceB,
    allowedRoles: ['super_admin', 'admin', 'manager', 'staff'],
  },
  {
    // REQ014 (US-ORG-03) -- same own-client_org_id shape as resources above.
    domain: 'departments',
    what: 'departments',
    query: `{ departments { id } }`,
    ids: (d) => (d.departments ?? []).map((x: any) => x.id),
    aId: IDS.departmentA,
    bId: IDS.departmentB,
    allowedRoles: ['super_admin', 'admin', 'manager', 'staff'],
  },
  {
    // REQ020. clinician_id self-scoping happens to coincide with org
    // scoping in this one-clinician-per-org fixture, so a clinicianA/
    // clinicianB actor's "ownOrgOnly" expectation is satisfied either way.
    domain: 'encounters',
    what: 'encounters',
    query: `{ encounters { id } }`,
    ids: (d) => (d.encounters ?? []).map((x: any) => x.id),
    aId: IDS.encounterA,
    bId: IDS.encounterB,
    allowedRoles: ['super_admin', 'admin', 'manager', 'clinician', 'staff'],
  },
  {
    // REQ016/REQ044 shipped this domain without a matrix row -- discovered
    // and closed during REQ020's own matrix-coverage pass, alongside
    // 'resources'. drugs() also returns platform-seeded (client_org_id
    // null) rows to every org, but the fixture's drugA/drugB are org-owned,
    // so isolation is still real to assert.
    domain: 'drugs',
    what: 'drugs',
    query: `{ drugs { id } }`,
    ids: (d) => (d.drugs ?? []).map((x: any) => x.id),
    aId: IDS.drugA,
    bId: IDS.drugB,
    allowedRoles: ['super_admin', 'admin', 'manager', 'clinician', 'staff', 'patient'],
  },
  {
    // REQ021. Scoped indirectly via encounter.client_org_id (Prescriptions
    // has no client_org_id of its own), same shape as 'encounters'.
    domain: 'prescriptions',
    what: 'prescriptions',
    query: `{ prescriptions { id } }`,
    ids: (d) => (d.prescriptions ?? []).map((x: any) => x.id),
    aId: IDS.prescriptionA,
    bId: IDS.prescriptionB,
    allowedRoles: ['super_admin', 'admin', 'manager', 'clinician', 'staff'],
  },
  {
    // REQ019. Scoped indirectly via clinic.client_org_id (QueueEntries has
    // no client_org_id of its own), same shape as Appointments itself.
    domain: 'queue',
    what: 'queueEntries',
    query: `{ queueEntries { id } }`,
    ids: (d) => (d.queueEntries ?? []).map((x: any) => x.id),
    aId: IDS.queueEntryA,
    bId: IDS.queueEntryB,
    allowedRoles: ['super_admin', 'admin', 'manager', 'clinician', 'staff'],
  },
  {
    // REQ018 (US-BOOK-05). Own client_org_id, same shape as departments/resources.
    domain: 'booking-widget',
    what: 'bookingWidgetConfigs',
    query: `{ bookingWidgetConfigs { id } }`,
    ids: (d) => (d.bookingWidgetConfigs ?? []).map((x: any) => x.id),
    aId: IDS.bookingWidgetA,
    bId: IDS.bookingWidgetB,
    allowedRoles: ['super_admin', 'admin', 'manager'],
  },
  {
    // REQ034. rightsRequests is the domain's only no-args list query
    // (patientConsents requires a patient_id argument, which doesn't fit
    // this matrix's generic shape) -- see fixture.ts's own comment.
    domain: 'consent',
    what: 'rightsRequests',
    query: `{ rightsRequests { id } }`,
    ids: (d) => (d.rightsRequests ?? []).map((x: any) => x.id),
    aId: IDS.rightsRequestA,
    bId: IDS.rightsRequestB,
    allowedRoles: ['super_admin', 'admin', 'manager'],
  },
  {
    // REQ022. Own client_org_id.
    domain: 'pharmacy',
    what: 'drugBatches',
    query: `{ drugBatches { id } }`,
    ids: (d) => (d.drugBatches ?? []).map((x: any) => x.id),
    aId: IDS.drugBatchA,
    bId: IDS.drugBatchB,
    allowedRoles: ['super_admin', 'admin', 'manager', 'staff'],
  },
  {
    // REQ030. Own client_org_id.
    domain: 'webhooks',
    what: 'webhookEndpoints',
    query: `{ webhookEndpoints { id } }`,
    ids: (d) => (d.webhookEndpoints ?? []).map((x: any) => x.id),
    aId: IDS.webhookEndpointA,
    bId: IDS.webhookEndpointB,
    allowedRoles: ['super_admin', 'admin', 'manager'],
  },
  {
    // REQ031. payerEmpanelments is the tenant-scoped half of this domain
    // (Payers itself is global reference data, like Languages -- see
    // matrix-coverage.int-spec.ts's EXEMPT list).
    domain: 'insurance',
    what: 'payerEmpanelments',
    query: `{ payerEmpanelments { id } }`,
    ids: (d) => (d.payerEmpanelments ?? []).map((x: any) => x.id),
    aId: IDS.payerEmpanelmentA,
    bId: IDS.payerEmpanelmentB,
    allowedRoles: ['super_admin', 'admin', 'manager', 'staff'],
  },
  {
    // REQ015 (US-SEC-08). Own client_org_id.
    domain: 'api-keys',
    what: 'apiKeys',
    query: `{ apiKeys { id } }`,
    ids: (d) => (d.apiKeys ?? []).map((x: any) => x.id),
    aId: IDS.apiKeyA,
    bId: IDS.apiKeyB,
    allowedRoles: ['super_admin', 'admin', 'manager'],
  },
  {
    // REQ029 (US-RPT-03). Own client_org_id.
    domain: 'scheduled-reports',
    what: 'scheduledReports',
    query: `{ scheduledReports { id } }`,
    ids: (d) => (d.scheduledReports ?? []).map((x: any) => x.id),
    aId: IDS.scheduledReportA,
    bId: IDS.scheduledReportB,
    allowedRoles: ['super_admin', 'admin', 'manager'],
  },
];

/** Domains covered by this matrix — read by matrix-coverage.int-spec.ts. */
export const COVERED_DOMAINS = Array.from(new Set(CASES.map((c) => c.domain)));

