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
} as const;

/** Every table this fixture writes, in safe truncation order (children first). */
const TABLES = [
  'MessageParticipants',
  'Messages',
  'MessageThreads',
  'AppointmentPayments',
  'AppointmentStatusLogs',
  'Reviews',
  'Appointments',
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
      { id: IDS.patientA, first_name: 'Pat', last_name: 'AOrg', date_of_birth: new Date('1990-01-01'), email: 'pat@org-a.test', phone: '+914444444441', address: '2 A Road' },
      { id: IDS.patientB, first_name: 'Pat', last_name: 'BOrg', date_of_birth: new Date('1990-01-01'), email: 'pat@org-b.test', phone: '+914444444442', address: '2 B Road' },
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
}
