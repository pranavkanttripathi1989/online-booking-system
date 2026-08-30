import { PrismaClient } from '@prisma/client';

/**
 * The deterministic two-tenant world every tenancy assertion runs against.
 *
 * `prisma/seed.ts` already establishes a two-org boundary for manual QA
 * (`city-heart` / `westside-health`) and the reasoning there applies here: you
 * cannot prove isolation against a single tenant, because "sees everything" and
 * "sees its own" produce identical output. This fixture is the automated
 * equivalent — isolated from the dev database, with fixed ids so an assertion
 * can name the exact row that must NOT appear.
 *
 * Every entity exists in BOTH orgs. A test that reads as org A asserts it sees
 * A's id and, critically, that B's id is absent — not merely that the result is
 * non-empty, which a leaking query would also satisfy.
 */

const u = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`;

export const IDS = {
  orgA: u('a01'),
  orgB: u('b01'),

  roleSuperAdmin: u('r01'),
  roleAdmin: u('r02'),
  roleManager: u('r03'),
  roleClinician: u('r04'),
  roleStaff: u('r05'),
  rolePatient: u('r06'),

  clinicA: u('a02'),
  clinicB: u('b02'),
  roomA: u('a03'),
  roomB: u('b03'),
  clinicianA: u('a04'),
  clinicianB: u('b04'),
  patientA: u('a05'),
  patientB: u('b05'),
  categoryA: u('a06'),
  categoryB: u('b06'),
  productA: u('a07'),
  productB: u('b07'),
  appointmentA: u('a08'),
  appointmentB: u('b08'),
  paymentA: u('a09'),
  paymentB: u('b09'),
  threadA: u('a10'),
  threadB: u('b10'),

  // Two per org, deliberately. `testResultLinked*` has a patient_id;
  // `testResultFree*` has patient_id NULL, which CLAUDE.md documents as the
  // common shape (TestResults.patient is free text, patient_id an optional FK).
  // The null-patient_id row is the one that slips past the self-scope check in
  // test-results.service.ts findOne — see BUG006.
  testResultLinkedA: u('a11'),
  testResultLinkedB: u('b11'),
  testResultFreeA: u('a12'),
  testResultFreeB: u('b12'),

  // Users. The suffix names the org; `NoOrg` is the self-registered archetype.
  userSuperAdmin: u('u01'),
  userAdmin: u('u02'),
  userManagerA: u('u03'),
  userClinicianA: u('u04'),
  userStaffA: u('u05'),
  userPatientA: u('u06'),
  userManagerB: u('u07'),
  userPatientNoOrg: u('u08'),

  // Non-actor members, one per org. Directory-style reads
  // (messageableContacts) exclude the caller themselves, so an assertion
  // target that is also an actor would be self-excluded and read as a leak
  // where there is none. These two are never used as callers.
  userExtraA: u('u09'),
  userExtraB: u('u10'),

  // BUG012 — the 4 tables added to close the tenancy matrix's remaining
  // KNOWN_GAPS domains that actually fit its same-org-sees-same-row shape
  // (reviews, cancellation-rules, availability, blocks). `notifications` is
  // scoped by specific user_id, not org, so it's EXEMPT instead — no
  // fixture rows needed for it here.
  reviewA: u('c01'),
  reviewB: u('c02'),
  cancellationRuleA: u('c03'),
  cancellationRuleB: u('c04'),
  clinicianAvailabilityA: u('c05'),
  clinicianAvailabilityB: u('c06'),
  spacerBlockA: u('c07'),
  spacerBlockB: u('c08'),

  // REQ017/REQ020 -- resources and encounters domains. Added when REQ020's
  // matrix-coverage pass discovered `resources` (REQ017) had shipped without
  // ever being classified in this matrix -- both close together here.
  resourceA: u('d01'),
  resourceB: u('d02'),
  encounterA: u('d03'),
  encounterB: u('d04'),
  drugA: u('d05'),
  drugB: u('d06'),
  prescriptionA: u('d07'),
  prescriptionB: u('d08'),
  // REQ019 -- queue domain.
  queueEntryA: u('d09'),
  queueEntryB: u('d10'),
  // REQ051 -- checklist domain.
  checklistItemA: u('d13'),
  checklistItemB: u('d14'),
  // REQ052 -- intake-fields domain.
  intakeFieldA: u('d15'),
  intakeFieldB: u('d16'),
  // REQ054 -- packages domain.
  packageA: u('d17'),
  packageB: u('d18'),
  // REQ055 -- branch-overrides domain.
  branchOverrideA: u('d19'),
  branchOverrideB: u('d20'),
  // REQ056 -- discount-approval-requests domain.
  discountRequestA: u('d21'),
  discountRequestB: u('d22'),
  // REQ058 -- canned-replies domain.
  cannedReplyA: u('d23'),
  cannedReplyB: u('d24'),
  // REQ014 -- departments domain.
  departmentA: u('d11'),
  departmentB: u('d12'),
  // REQ029 -- a dedicated *completed* appointment per org for
  // getAppointmentStats' topClinicians/revenueByClinic fields, which only
  // populate from completed appointments -- appointmentA/B above default to
  // 'scheduled' and are relied on as such by other domain-cases (e.g.
  // dashboard.upcoming_appointments), so not reused/mutated here.
  analyticsApptA: u('d13'),
  analyticsApptB: u('d14'),

  // REQ018/034/030/031/015/029 (2026-08-25 8-slice pass) -- eight new
  // resolver domains classified into the tenancy matrix in the same pass
  // that built them, not retrofitted later.
  bookingWidgetA: u('e01'),
  bookingWidgetB: u('e02'),
  consentA: u('e03'),
  consentB: u('e04'),
  rightsRequestA: u('e18'),
  rightsRequestB: u('e19'),
  drugBatchA: u('e05'),
  drugBatchB: u('e06'),
  webhookEndpointA: u('e07'),
  webhookEndpointB: u('e08'),
  payer1: u('e09'), // global reference data -- one row, referenced by both orgs' empanelments/policies
  payerEmpanelmentA: u('e10'),
  payerEmpanelmentB: u('e11'),
  patientPolicyA: u('e12'),
  patientPolicyB: u('e13'),
  apiKeyA: u('e14'),
  apiKeyB: u('e15'),
  scheduledReportA: u('e16'),
  scheduledReportB: u('e17'),
  // REQ080 -- tasks domain.
  taskA: u('f01'),
  taskB: u('f02'),
  // REQ106 -- waitlist domain.
  waitlistEntryA: u('f03'),
  waitlistEntryB: u('f04'),
  // REQ163 (P2-10) -- appointment-series domain.
  appointmentSeriesA: u('g01'),
  appointmentSeriesB: u('g02'),
  // Patient Membership Plans -- membership-plans domain.
  membershipPlanA: u('h01'),
  membershipPlanB: u('h02'),
} as const;

/** Every table this fixture writes, in safe truncation order (children first). */
const TABLES = [
  'ScheduledReports',
  'ApiKeys',
  'PatientInsurancePolicies',
  'PayerEmpanelments',
  'Payers',
  'WebhookDeliveryLog',
  'WebhookEndpoints',
  'StockMovements',
  'DrugBatches',
  'RightsRequests',
  'Consents',
  'BookingWidgetConfig',
  'MessageParticipants',
  'Messages',
  'MessageThreads',
  'AppointmentPayments',
  'AppointmentStatusLogs',
  'Reviews',
  'EncounterAddenda',
  'EncounterNotes',
  'Diagnoses',
  'Attachments',
  'PrescriptionItems',
  'Prescriptions',
  'QueueEvents',
  'QueueEntries',
  'Encounters',
  'Resources',
  'Departments',
  'Drugs',
  'Appointments',
  'AppointmentSeries',
  'PatientMemberships',
  'MembershipPlans',
  'TestResults',
  'ClinicianServices',
  'ClinicianLanguages',
  'ClinicianAvailability',
  'LunchBreaks',
  'SpacerBlocks',
  'RoomBlocks',
  'ProductCancellationRules',
  'ProductVariations',
  'Products',
  'ProductSubcategories',
  'ProductCategories',
  'Rooms',
  'Clinicians',
  'Patients',
  'RolePermissions',
  'Notifications',
  'NotificationPreferences',
  'AuditLogs',
  'UserProfiles',
  'UserRoles',
  'Clinics',
  'NotificationProviderConfig',
  'PaymentTransactions',
  'OrganizationSubscriptions',
  'StripeConfigurations',
  'ClientOrganizations',
  'Users',
];

export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  // TRUNCATE ... CASCADE in one statement so FK order cannot bite, and RESTART
  // IDENTITY so nothing carries over between runs.
  const list = TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
}

// bcrypt hash of 'Integration1234!' — precomputed rather than hashed at fixture
// time because bcrypt at the app's cost factor is slow and no test logs in with
// a password (actors carry pre-signed JWTs; see actors.ts).
const PASSWORD_HASH = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

export async function buildFixture(prisma: PrismaClient): Promise<void> {
  await resetDatabase(prisma);

  // Roles are global (client_org_id null), matching prisma/seed.ts.
  await prisma.userRoles.createMany({
    data: [
      { id: IDS.roleSuperAdmin, name: 'super_admin', is_system: true },
      { id: IDS.roleAdmin, name: 'admin', is_system: true },
      { id: IDS.roleManager, name: 'manager', is_system: true },
      { id: IDS.roleClinician, name: 'clinician', is_system: true },
      { id: IDS.roleStaff, name: 'staff', is_system: true },
      { id: IDS.rolePatient, name: 'patient', is_system: true },
    ],
  });

  await prisma.clientOrganizations.createMany({
    data: [
      { id: IDS.orgA, name: 'Org A Health', code: 'org-a', contact_email: 'a@example.test' },
      { id: IDS.orgB, name: 'Org B Health', code: 'org-b', contact_email: 'b@example.test' },
    ],
  });

  await prisma.clinics.createMany({
    data: [
      { id: IDS.clinicA, name: 'Clinic A', address: '1 A Road', phone: '+911111111111', email: 'clinic-a@example.test', client_org_id: IDS.orgA },
      { id: IDS.clinicB, name: 'Clinic B', address: '1 B Road', phone: '+912222222222', email: 'clinic-b@example.test', client_org_id: IDS.orgB },
    ],
  });

  await prisma.rooms.createMany({
    data: [
      { id: IDS.roomA, clinic_id: IDS.clinicA, room_number: 'A-101' },
      { id: IDS.roomB, clinic_id: IDS.clinicB, room_number: 'B-101' },
    ],
  });

  await prisma.clinicians.createMany({
    data: [
      { id: IDS.clinicianA, clinic_id: IDS.clinicA, first_name: 'Ada', last_name: 'AOrg', clinician_type: 'doctor', email: 'ada@org-a.test', phone: '+913333333331' },
      { id: IDS.clinicianB, clinic_id: IDS.clinicB, first_name: 'Bo', last_name: 'BOrg', clinician_type: 'doctor', email: 'bo@org-b.test', phone: '+913333333332' },
    ],
  });

  await prisma.patients.createMany({
    data: [
      { id: IDS.patientA, client_org_id: IDS.orgA, first_name: 'Pat', last_name: 'AOrg', date_of_birth: new Date('1990-01-01'), email: 'pat@org-a.test', phone: '+914444444441', address: '2 A Road' },
      { id: IDS.patientB, client_org_id: IDS.orgB, first_name: 'Pat', last_name: 'BOrg', date_of_birth: new Date('1990-01-01'), email: 'pat@org-b.test', phone: '+914444444442', address: '2 B Road' },
    ],
  });

  await prisma.productCategories.createMany({
    data: [
      { id: IDS.categoryA, name: 'Category A', client_org_id: IDS.orgA, clinic_id: IDS.clinicA },
      { id: IDS.categoryB, name: 'Category B', client_org_id: IDS.orgB, clinic_id: IDS.clinicB },
    ],
  });

  await prisma.products.createMany({
    data: [
      { id: IDS.productA, name: 'Service A', product_type: 'simple', sku: 'SKU-A-1', price: 50000, duration_minutes: 30, client_org_id: IDS.orgA, clinic_id: IDS.clinicA, category_id: IDS.categoryA },
      { id: IDS.productB, name: 'Service B', product_type: 'simple', sku: 'SKU-B-1', price: 60000, duration_minutes: 30, client_org_id: IDS.orgB, clinic_id: IDS.clinicB, category_id: IDS.categoryB },
    ],
  });

  // Users + profiles. UserProfiles.id is the shared PK with Users.
  const users: Array<{
    id: string; role: string; email: string; phone: string;
    org: string | null; clinician?: string; patient?: string; clinic?: string;
  }> = [
    { id: IDS.userSuperAdmin, role: IDS.roleSuperAdmin, email: 'superadmin@platform.test', phone: '+915000000001', org: null },
    { id: IDS.userAdmin, role: IDS.roleAdmin, email: 'admin@platform.test', phone: '+915000000002', org: null },
    { id: IDS.userManagerA, role: IDS.roleManager, email: 'manager@org-a.test', phone: '+915000000003', org: IDS.orgA, clinic: IDS.clinicA },
    { id: IDS.userClinicianA, role: IDS.roleClinician, email: 'clinician@org-a.test', phone: '+915000000004', org: IDS.orgA, clinic: IDS.clinicA, clinician: IDS.clinicianA },
    { id: IDS.userStaffA, role: IDS.roleStaff, email: 'staff@org-a.test', phone: '+915000000005', org: IDS.orgA, clinic: IDS.clinicA },
    { id: IDS.userPatientA, role: IDS.rolePatient, email: 'patient@org-a.test', phone: '+915000000006', org: IDS.orgA, patient: IDS.patientA },
    { id: IDS.userManagerB, role: IDS.roleManager, email: 'manager@org-b.test', phone: '+915000000007', org: IDS.orgB, clinic: IDS.clinicB },
    // The archetype that matters most. Exactly what auth.service.ts register()
    // produces for anyone on the public internet: patient role, NO org, NO
    // patient_id link.
    { id: IDS.userPatientNoOrg, role: IDS.rolePatient, email: 'selfsignup@nowhere.test', phone: '+915000000008', org: null },
    { id: IDS.userExtraA, role: IDS.roleStaff, email: 'extra@org-a.test', phone: '+915000000009', org: IDS.orgA, clinic: IDS.clinicA },
    { id: IDS.userExtraB, role: IDS.roleStaff, email: 'extra@org-b.test', phone: '+915000000010', org: IDS.orgB, clinic: IDS.clinicB },
  ];

  await prisma.users.createMany({ data: users.map((x) => ({ id: x.id })) });
  await prisma.userProfiles.createMany({
    data: users.map((x) => ({
      id: x.id,
      role_id: x.role,
      first_name: 'Test',
      last_name: x.email.split('@')[0],
      email: x.email,
      password: PASSWORD_HASH,
      phone: x.phone,
      client_org_id: x.org,
      clinic_id: x.clinic ?? null,
      clinician_id: x.clinician ?? null,
      patient_id: x.patient ?? null,
    })),
  });

  const when = new Date('2026-09-01T10:00:00.000Z');
  await prisma.appointments.createMany({
    data: [
      { id: IDS.appointmentA, clinic_id: IDS.clinicA, room_id: IDS.roomA, clinician_id: IDS.clinicianA, patient_id: IDS.patientA, appointment_date: when, appointment_time: when, reason: 'Checkup A', product_id: IDS.productA },
      { id: IDS.appointmentB, clinic_id: IDS.clinicB, room_id: IDS.roomB, clinician_id: IDS.clinicianB, patient_id: IDS.patientB, appointment_date: when, appointment_time: when, reason: 'Checkup B', product_id: IDS.productB },
      // REQ029 -- completed, so getAppointmentStats' topClinicians/revenueByClinic populate.
      // A different time slot from appointmentA/B above -- same clinician,
      // same day would collide with the real Postgres no-overlap EXCLUDE
      // constraint (appointments_no_overlapping_booking), confirmed live.
      { id: IDS.analyticsApptA, clinic_id: IDS.clinicA, room_id: IDS.roomA, clinician_id: IDS.clinicianA, patient_id: IDS.patientA, appointment_date: when, appointment_time: new Date('2026-09-01T14:00:00.000Z'), reason: 'Analytics A', product_id: IDS.productA, status: 'completed' },
      { id: IDS.analyticsApptB, clinic_id: IDS.clinicB, room_id: IDS.roomB, clinician_id: IDS.clinicianB, patient_id: IDS.patientB, appointment_date: when, appointment_time: new Date('2026-09-01T14:00:00.000Z'), reason: 'Analytics B', product_id: IDS.productB, status: 'completed' },
    ],
  });

  // REQ163 (P2-10) -- one appointment series per org.
  await prisma.appointmentSeries.createMany({
    data: [
      { id: IDS.appointmentSeriesA, client_org_id: IDS.orgA, clinic_id: IDS.clinicA, patient_id: IDS.patientA, name: 'Fixture series A', created_by_user_id: IDS.userManagerA },
      { id: IDS.appointmentSeriesB, client_org_id: IDS.orgB, clinic_id: IDS.clinicB, patient_id: IDS.patientB, name: 'Fixture series B', created_by_user_id: IDS.userManagerB },
    ],
  });

  await prisma.appointmentPayments.createMany({
    data: [
      { id: IDS.paymentA, appointment_id: IDS.appointmentA, patient_id: IDS.patientA, clinic_id: IDS.clinicA, client_org_id: IDS.orgA, amount: 50000, status: 'succeeded' },
      { id: IDS.paymentB, appointment_id: IDS.appointmentB, patient_id: IDS.patientB, clinic_id: IDS.clinicB, client_org_id: IDS.orgB, amount: 60000, status: 'succeeded' },
    ],
  });

  await prisma.testResults.createMany({
    data: [
      { id: IDS.testResultLinkedA, patient_name: 'Pat AOrg', patient_id: IDS.patientA, test_name: 'CBC A', test_type: 'blood', ordered_by_name: 'Dr A', ordered_by_user_id: IDS.userClinicianA },
      { id: IDS.testResultLinkedB, patient_name: 'Pat BOrg', patient_id: IDS.patientB, test_name: 'CBC B', test_type: 'blood', ordered_by_name: 'Dr B', ordered_by_user_id: IDS.userManagerB },
      { id: IDS.testResultFreeA, patient_name: 'Walk-in A', patient_id: null, test_name: 'Lipid A', test_type: 'blood', ordered_by_name: 'Dr A', ordered_by_user_id: IDS.userClinicianA },
      { id: IDS.testResultFreeB, patient_name: 'Walk-in B', patient_id: null, test_name: 'Lipid B', test_type: 'blood', ordered_by_name: 'Dr B', ordered_by_user_id: IDS.userManagerB },
    ],
  });

  await prisma.messageThreads.createMany({
    data: [
      { id: IDS.threadA, client_org_id: IDS.orgA, last_message: 'hello from A' },
      { id: IDS.threadB, client_org_id: IDS.orgB, last_message: 'hello from B' },
    ],
  });
  await prisma.messageParticipants.createMany({
    data: [
      { thread_id: IDS.threadA, user_id: IDS.userManagerA },
      { thread_id: IDS.threadA, user_id: IDS.userClinicianA },
      { thread_id: IDS.threadB, user_id: IDS.userManagerB },
    ],
  });

  // BUG012 — fixture rows for the 5 domains closing the tenancy matrix's
  // remaining KNOWN_GAPS (reviews, cancellation-rules, availability, blocks,
  // notifications).
  await prisma.reviews.createMany({
    data: [
      { id: IDS.reviewA, appointment_id: IDS.appointmentA, patient_id: IDS.patientA, clinician_id: IDS.clinicianA, clinic_id: IDS.clinicA, stars: 5, comment: 'Great visit, org A' },
      { id: IDS.reviewB, appointment_id: IDS.appointmentB, patient_id: IDS.patientB, clinician_id: IDS.clinicianB, clinic_id: IDS.clinicB, stars: 4, comment: 'Good visit, org B' },
    ],
  });

  // clinic-scoped, not product-scoped -- ProductCancellationRules_scope_check
  // forbids setting product_id and clinic_id together.
  await prisma.productCancellationRules.createMany({
    data: [
      { id: IDS.cancellationRuleA, name: 'Standard cancellation A', clinic_id: IDS.clinicA, client_org_id: IDS.orgA, fee_type: 'fixed', fee_amount: 5000 },
      { id: IDS.cancellationRuleB, name: 'Standard cancellation B', clinic_id: IDS.clinicB, client_org_id: IDS.orgB, fee_type: 'fixed', fee_amount: 6000 },
    ],
  });

  await prisma.clinicianAvailability.createMany({
    data: [
      { id: IDS.clinicianAvailabilityA, clinician_id: IDS.clinicianA, clinic_id: IDS.clinicA, day_of_week: 1, start_time: '09:00', end_time: '17:00' },
      { id: IDS.clinicianAvailabilityB, clinician_id: IDS.clinicianB, clinic_id: IDS.clinicB, day_of_week: 1, start_time: '09:00', end_time: '17:00' },
    ],
  });

  await prisma.spacerBlocks.createMany({
    data: [
      { id: IDS.spacerBlockA, clinician_id: IDS.clinicianA, clinic_id: IDS.clinicA, start_time: new Date('1970-01-01T12:00:00.000Z'), end_time: new Date('1970-01-01T12:15:00.000Z'), reason: 'prep time A' },
      { id: IDS.spacerBlockB, clinician_id: IDS.clinicianB, clinic_id: IDS.clinicB, start_time: new Date('1970-01-01T12:00:00.000Z'), end_time: new Date('1970-01-01T12:15:00.000Z'), reason: 'prep time B' },
    ],
  });

  // REQ017 -- a bookable org-level asset, one per org.
  await prisma.resources.createMany({
    data: [
      { id: IDS.resourceA, client_org_id: IDS.orgA, clinic_id: IDS.clinicA, name: 'ECG Machine A' },
      { id: IDS.resourceB, client_org_id: IDS.orgB, clinic_id: IDS.clinicB, name: 'ECG Machine B' },
    ],
  });

  // REQ014 -- a specialty grouping, one per org.
  await prisma.departments.createMany({
    data: [
      { id: IDS.departmentA, client_org_id: IDS.orgA, clinic_id: IDS.clinicA, name: 'Cardiology A' },
      { id: IDS.departmentB, client_org_id: IDS.orgB, clinic_id: IDS.clinicB, name: 'Cardiology B' },
    ],
  });

  // REQ020 -- one encounter per org, tied to that org's appointment.
  await prisma.encounters.createMany({
    data: [
      { id: IDS.encounterA, client_org_id: IDS.orgA, appointment_id: IDS.appointmentA, patient_id: IDS.patientA, clinician_id: IDS.clinicianA },
      { id: IDS.encounterB, client_org_id: IDS.orgB, appointment_id: IDS.appointmentB, patient_id: IDS.patientB, clinician_id: IDS.clinicianB },
    ],
  });

  // REQ016/REQ044 -- one org-owned drug per org (not the null/platform-seeded
  // shared shape) so the matrix has a real per-org row to isolate. Found and
  // closed during REQ020's own matrix-coverage pass (drugs shipped without a
  // matrix row at all).
  await prisma.drugs.createMany({
    data: [
      { id: IDS.drugA, client_org_id: IDS.orgA, name: 'OrgA Custom Drug' },
      { id: IDS.drugB, client_org_id: IDS.orgB, name: 'OrgB Custom Drug' },
    ],
  });

  // REQ021 -- one prescription per org, issued from that org's encounter.
  await prisma.prescriptions.createMany({
    data: [
      { id: IDS.prescriptionA, encounter_id: IDS.encounterA, patient_id: IDS.patientA, clinician_id: IDS.clinicianA },
      { id: IDS.prescriptionB, encounter_id: IDS.encounterB, patient_id: IDS.patientB, clinician_id: IDS.clinicianB },
    ],
  });

  // REQ019 -- one checked-in queue entry per org, scoped via
  // clinic.client_org_id (QueueEntries has no client_org_id of its own,
  // same shape as Appointments itself).
  await prisma.queueEntries.createMany({
    data: [
      { id: IDS.queueEntryA, appointment_id: IDS.appointmentA, clinic_id: IDS.clinicA, clinician_id: IDS.clinicianA },
      { id: IDS.queueEntryB, appointment_id: IDS.appointmentB, clinic_id: IDS.clinicB, clinician_id: IDS.clinicianB },
    ],
  });

  // REQ051 -- one clinic-wide checklist item per org.
  await prisma.checklistItems.createMany({
    data: [
      { id: IDS.checklistItemA, clinic_id: IDS.clinicA, label: 'Consent form' },
      { id: IDS.checklistItemB, clinic_id: IDS.clinicB, label: 'Consent form' },
    ],
  });

  // REQ052 -- one clinic-wide intake field per org.
  await prisma.clinicIntakeFieldConfig.createMany({
    data: [
      { id: IDS.intakeFieldA, clinic_id: IDS.clinicA, key: 'current_medications', label: 'Current medications' },
      { id: IDS.intakeFieldB, clinic_id: IDS.clinicB, key: 'current_medications', label: 'Current medications' },
    ],
  });

  // REQ054 -- one package per org.
  await prisma.packages.createMany({
    data: [
      { id: IDS.packageA, client_org_id: IDS.orgA, clinic_id: IDS.clinicA, name: '10-Session Physio', total_sittings: 10, price_paise: 500000 },
      { id: IDS.packageB, client_org_id: IDS.orgB, clinic_id: IDS.clinicB, name: '10-Session Physio', total_sittings: 10, price_paise: 500000 },
    ],
  });

  // Patient Membership Plans -- one plan per org.
  await prisma.membershipPlans.createMany({
    data: [
      { id: IDS.membershipPlanA, client_org_id: IDS.orgA, clinic_id: IDS.clinicA, name: 'Wellness Basic', price_monthly_paise: 49900 },
      { id: IDS.membershipPlanB, client_org_id: IDS.orgB, clinic_id: IDS.clinicB, name: 'Wellness Basic', price_monthly_paise: 49900 },
    ],
  });

  // REQ055 -- one branch override per org, on the existing productA/B fixtures.
  await prisma.productBranchOverrides.createMany({
    data: [
      { id: IDS.branchOverrideA, client_org_id: IDS.orgA, clinic_id: IDS.clinicA, product_id: IDS.productA, mode: 'override', override_price: 30000 },
      { id: IDS.branchOverrideB, client_org_id: IDS.orgB, clinic_id: IDS.clinicB, product_id: IDS.productB, mode: 'override', override_price: 40000 },
    ],
  });

  // REQ058 -- one canned reply per org.
  await prisma.cannedReplies.createMany({
    data: [
      { id: IDS.cannedReplyA, client_org_id: IDS.orgA, created_by_user_id: IDS.userManagerA, title: 'Reminder', body: 'Please arrive 10 minutes early.' },
      { id: IDS.cannedReplyB, client_org_id: IDS.orgB, created_by_user_id: IDS.userManagerB, title: 'Reminder', body: 'Please arrive 10 minutes early.' },
    ],
  });

  // REQ056 -- one pending discount-approval request per org, on the
  // existing appointmentA/B fixtures.
  await prisma.discountApprovalRequests.createMany({
    data: [
      {
        id: IDS.discountRequestA, appointment_id: IDS.appointmentA, clinic_id: IDS.clinicA, client_org_id: IDS.orgA,
        requested_by_user_id: IDS.userStaffA, discount_amount: 150000, discount_reason: 'fixture', expected_amount_paise: 500000,
        tenders_json: [{ tender_type: 'cash', amountPaise: 350000, reference: null }],
      },
      {
        id: IDS.discountRequestB, appointment_id: IDS.appointmentB, clinic_id: IDS.clinicB, client_org_id: IDS.orgB,
        requested_by_user_id: IDS.userManagerB, discount_amount: 150000, discount_reason: 'fixture', expected_amount_paise: 500000,
        tenders_json: [{ tender_type: 'cash', amountPaise: 350000, reference: null }],
      },
    ],
  });

  // REQ018 (US-BOOK-05) -- one widget config per org.
  await prisma.bookingWidgetConfig.createMany({
    data: [
      { id: IDS.bookingWidgetA, client_org_id: IDS.orgA, clinic_id: IDS.clinicA, allowed_origins: ['https://a.example.test'], short_link_slug: 'widget-a' },
      { id: IDS.bookingWidgetB, client_org_id: IDS.orgB, clinic_id: IDS.clinicB, allowed_origins: ['https://b.example.test'], short_link_slug: 'widget-b' },
    ],
  });

  // REQ034 -- one consent per org.
  await prisma.consents.createMany({
    data: [
      { id: IDS.consentA, patient_id: IDS.patientA, client_org_id: IDS.orgA, purpose: 'treatment', granted: true, notice_version: 'v1' },
      { id: IDS.consentB, patient_id: IDS.patientB, client_org_id: IDS.orgB, purpose: 'treatment', granted: true, notice_version: 'v1' },
    ],
  });

  // REQ034 -- one rights request per org (the domain's only no-args list
  // query, so this is the CASES entry rather than patientConsents, which
  // requires a patient_id argument that doesn't fit the matrix's generic
  // no-args-list shape).
  await prisma.rightsRequests.createMany({
    data: [
      { id: IDS.rightsRequestA, patient_id: IDS.patientA, client_org_id: IDS.orgA, type: 'access', sla_due_at: new Date('2027-01-01') },
      { id: IDS.rightsRequestB, patient_id: IDS.patientB, client_org_id: IDS.orgB, type: 'access', sla_due_at: new Date('2027-01-01') },
    ],
  });

  // REQ022 -- one drug batch per org, against the drugA/drugB rows created above.
  await prisma.drugBatches.createMany({
    data: [
      { id: IDS.drugBatchA, drug_id: IDS.drugA, clinic_id: IDS.clinicA, client_org_id: IDS.orgA, batch_number: 'BATCH-A-1', expiry_date: new Date('2027-01-01'), quantity_received: 100, quantity_remaining: 100 },
      { id: IDS.drugBatchB, drug_id: IDS.drugB, clinic_id: IDS.clinicB, client_org_id: IDS.orgB, batch_number: 'BATCH-B-1', expiry_date: new Date('2027-01-01'), quantity_received: 100, quantity_remaining: 100 },
    ],
  });

  // REQ030 -- one webhook endpoint per org. `secret` is a fixture-only
  // placeholder string, never decrypted by any matrix assertion.
  await prisma.webhookEndpoints.createMany({
    data: [
      { id: IDS.webhookEndpointA, client_org_id: IDS.orgA, url: 'https://a.example.test/webhook', secret: 'fixture-secret-a', event_types_json: ['appointment.created'], created_by_user_id: IDS.userManagerA },
      { id: IDS.webhookEndpointB, client_org_id: IDS.orgB, url: 'https://b.example.test/webhook', secret: 'fixture-secret-b', event_types_json: ['appointment.created'], created_by_user_id: IDS.userManagerB },
    ],
  });

  // REQ031 -- Payers is global reference data (no client_org_id, like
  // Languages) -- one shared row. PayerEmpanelments/PatientInsurancePolicies
  // are the genuinely tenant-scoped part of this domain, one pair each.
  await prisma.payers.create({ data: { id: IDS.payer1, name: 'Fixture Insurer', payer_type: 'insurer' } });
  await prisma.payerEmpanelments.createMany({
    data: [
      { id: IDS.payerEmpanelmentA, payer_id: IDS.payer1, clinic_id: IDS.clinicA, client_org_id: IDS.orgA, start_date: new Date('2026-01-01') },
      { id: IDS.payerEmpanelmentB, payer_id: IDS.payer1, clinic_id: IDS.clinicB, client_org_id: IDS.orgB, start_date: new Date('2026-01-01') },
    ],
  });
  await prisma.patientInsurancePolicies.createMany({
    data: [
      { id: IDS.patientPolicyA, patient_id: IDS.patientA, client_org_id: IDS.orgA, payer_id: IDS.payer1, policy_number: 'POL-A-1', policy_holder_name: 'Patient A', valid_from: new Date('2026-01-01') },
      { id: IDS.patientPolicyB, patient_id: IDS.patientB, client_org_id: IDS.orgB, payer_id: IDS.payer1, policy_number: 'POL-B-1', policy_holder_name: 'Patient B', valid_from: new Date('2026-01-01') },
    ],
  });

  // REQ015 (US-SEC-08) -- one API key per org.
  await prisma.apiKeys.createMany({
    data: [
      { id: IDS.apiKeyA, client_org_id: IDS.orgA, key_prefix: 'mbk_fixturea', key_hash: 'fixture-hash-a', name: 'Fixture Key A', created_by_user_id: IDS.userManagerA },
      { id: IDS.apiKeyB, client_org_id: IDS.orgB, key_prefix: 'mbk_fixtureb', key_hash: 'fixture-hash-b', name: 'Fixture Key B', created_by_user_id: IDS.userManagerB },
    ],
  });

  // REQ029 (US-RPT-03) -- one scheduled report per org.
  await prisma.scheduledReports.createMany({
    data: [
      { id: IDS.scheduledReportA, client_org_id: IDS.orgA, clinic_id: IDS.clinicA, report_type: 'daily_collections', recipients_json: ['a@example.test'], cadence: 'daily', channel: 'email', created_by_user_id: IDS.userManagerA },
      { id: IDS.scheduledReportB, client_org_id: IDS.orgB, clinic_id: IDS.clinicB, report_type: 'daily_collections', recipients_json: ['b@example.test'], cadence: 'daily', channel: 'email', created_by_user_id: IDS.userManagerB },
    ],
  });

  // REQ080 -- one internal follow-up task per org.
  await prisma.tasks.createMany({
    data: [
      { id: IDS.taskA, client_org_id: IDS.orgA, subject: 'Fixture task A', created_by_user_id: IDS.userManagerA },
      { id: IDS.taskB, client_org_id: IDS.orgB, subject: 'Fixture task B', created_by_user_id: IDS.userManagerB },
    ],
  });

  // REQ106 -- one waiting waitlist entry per org.
  await prisma.waitlistEntries.createMany({
    data: [
      { id: IDS.waitlistEntryA, client_org_id: IDS.orgA, clinic_id: IDS.clinicA, clinician_id: IDS.clinicianA, patient_id: IDS.patientA, waitlist_date: new Date('2026-09-01T00:00:00.000Z'), position: 1 },
      { id: IDS.waitlistEntryB, client_org_id: IDS.orgB, clinic_id: IDS.clinicB, clinician_id: IDS.clinicianB, patient_id: IDS.patientB, waitlist_date: new Date('2026-09-01T00:00:00.000Z'), position: 1 },
    ],
  });
}
