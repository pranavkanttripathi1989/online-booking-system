import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Seed for the isolated e2e stack (project-plans/06-execution-plan.md P1.5,
 * F-28 — "the development database is the test database"). Runs against
 * `medibook_e2e` (postgres_e2e, tmpfs) on every `backend_e2e` (re)start —
 * see docker-compose.yml's `e2e` profile. Always seeds a genuinely fresh
 * database, so unlike prisma/seed.ts (idempotent findFirst/upsert, because
 * the dev DB persists and is reseeded onto repeatedly) this is a straight
 * create pass.
 *
 * Two jobs in one file:
 *  1. The same identity/org/RBAC scaffolding as prisma/seed.ts (roles,
 *     permissions catalog, 2 orgs, 5 demo accounts, email templates) so
 *     every e2e spec's loginAs() and every admin/RBAC-adjacent spec has the
 *     same baseline the dev DB already provides.
 *  2. Real clinical/booking volume dev's manual seed never had: ~5
 *     clinicians, ~200 patients, ~2,000 appointments across a rolling date
 *     range, some payments, some messages. One clinician is deliberately
 *     NOT a fresh id -- see FIXED_CLINICIAN_ID below.
 */

const prisma = new PrismaClient();

// Matches frontend/src/pages/auth/login.jsx's DEMO_ACCOUNTS and
// prisma/seed.ts exactly, so the same login buttons / loginAs() helper work
// unchanged against this stack.
const DEMO_ACCOUNTS = [
  { email: 'admin@medibook.dev', password: 'Admin1234!', role: 'admin', first_name: 'Admin', last_name: 'User', phone: '+919810000001' },
  { email: 'manager@medibook.dev', password: 'Mgr1234!', role: 'manager', first_name: 'Sarah', last_name: 'Manager', phone: '+919810000002' },
  { email: 'clinician@medibook.dev', password: 'Cln1234!', role: 'clinician', first_name: 'Alex', last_name: 'Clinician', phone: '+919810000003' },
  { email: 'receptionist@medibook.dev', password: 'Rec1234!', role: 'staff', first_name: 'Jamie', last_name: 'Reception', phone: '+919810000004' },
  { email: 'patient@medibook.dev', password: 'Pat1234!', role: 'patient', first_name: 'Priya', last_name: 'Patient', phone: '+919810000005' },
];

const ROLES = ['admin', 'super_admin', 'manager', 'clinician', 'staff', 'patient'];

const EMAIL_TEMPLATES = [
  { name: 'Appointment Confirmation', type: 'appointment_confirmation' as const, subject: 'Your appointment is confirmed — {{patient_name}}', body: 'Dear {{patient_name}},\n\nYour appointment with {{clinician_name}} on {{date}} at {{time}} has been confirmed.\n\nThank you,\nHealthSync Team', variables: ['patient_name', 'clinician_name', 'date', 'time'] },
  { name: 'Appointment Reminder', type: 'appointment_reminder' as const, subject: 'Reminder: Your appointment tomorrow — {{patient_name}}', body: 'Dear {{patient_name}},\n\nThis is a reminder of your appointment tomorrow with {{clinician_name}} at {{time}}.\n\nHealthSync Team', variables: ['patient_name', 'clinician_name', 'time'] },
  { name: 'Appointment Cancellation', type: 'appointment_cancellation' as const, subject: 'Appointment Cancelled — {{patient_name}}', body: 'Dear {{patient_name}},\n\nYour appointment on {{date}} has been cancelled.\n\nHealthSync Team', variables: ['patient_name', 'date'] },
  { name: 'Password Reset', type: 'password_reset' as const, subject: 'Reset your HealthSync password', body: 'Hi {{name}},\n\nClick to reset your password:\n{{reset_link}}\n\nHealthSync Team', variables: ['name', 'reset_link'] },
  { name: 'Welcome Email', type: 'welcome' as const, subject: 'Welcome to HealthSync, {{name}}!', body: 'Dear {{name}},\n\nWelcome to HealthSync.\n\nHealthSync Team', variables: ['name'] },
];

// admin-languages.spec.js / admin-lookups.spec.js expect these to already
// exist -- reference tables, not the free-text values on Clinicians/Rooms.
const LANGUAGES = [
  { name: 'English', code: 'en', is_default: true },
  { name: 'Hindi', code: 'hi', is_default: false },
];
const CLINICIAN_TYPES = ['General Physician', 'Pediatrician', 'Dermatologist', 'Cardiologist'];
const ROOM_TYPES = ['Consultation Room'];

// The one id that must NOT be freshly generated: 8 existing e2e specs
// (public-booking, booking-payment, clinician-portal, manager-clinicians-
// patients, calendar, manager-appointments, manager-availability-blocks)
// hardcode this exact clinician id and the name "Sarah Mitchell" — this
// seed adds volume around that existing contract, it doesn't replace it.
const FIXED_CLINICIAN_ID = '8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7';

const PASSWORD_HASH_CACHE: Record<string, string> = {};
async function hash(pw: string) {
  if (!PASSWORD_HASH_CACHE[pw]) PASSWORD_HASH_CACHE[pw] = await bcrypt.hash(pw, 12);
  return PASSWORD_HASH_CACHE[pw];
}

function daysFromNow(days: number, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log('[seed-e2e] roles...');
  const roleRecords: Record<string, string> = {};
  for (const name of ROLES) {
    const row = await prisma.userRoles.create({ data: { name, description: `${name} role`, is_system: true } });
    roleRecords[name] = row.id;
  }

  console.log('[seed-e2e] permissions catalog...');
  const PERMISSION_RESOURCES = ['appointments', 'patients', 'clinicians', 'clinics', 'rooms', 'products', 'billing', 'reviews', 'messages', 'roles', 'settings', 'reports'];
  const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete', 'export'];
  await prisma.permissions.createMany({
    data: PERMISSION_RESOURCES.flatMap((resource) =>
      PERMISSION_ACTIONS.map((action) => ({
        name: `${resource}.${action}`,
        resource,
        action,
        description: `${action[0].toUpperCase()}${action.slice(1)} ${resource}`,
      })),
    ),
  });

  console.log('[seed-e2e] organizations...');
  const primaryOrg = await prisma.clientOrganizations.create({
    data: {
      name: 'City Heart Clinic Group', code: 'city-heart', contact_email: 'ops@cityheart.dev', contact_phone: '+919876500000',
      address_structured: { line1: '12 MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', country: 'India' },
      onboarding_status: 'completed',
    },
  });
  const foreignOrg = await prisma.clientOrganizations.create({
    data: {
      name: 'Westside Health Group', code: 'westside-health', contact_email: 'ops@westsidehealth.dev', contact_phone: '+919812345678',
      address_structured: { line1: '45 FC Road', city: 'Pune', state: 'Maharashtra', pincode: '411005', country: 'India' },
      onboarding_status: 'completed',
    },
  });

  console.log('[seed-e2e] demo accounts...');
  for (const account of DEMO_ACCOUNTS) {
    const orgIdForAccount = account.role === 'admin' ? null : primaryOrg.id;
    const user = await prisma.users.create({ data: {} });
    await prisma.userProfiles.create({
      data: {
        id: user.id, email: account.email, password: await hash(account.password),
        first_name: account.first_name, last_name: account.last_name, phone: account.phone,
        role_id: roleRecords[account.role], client_org_id: orgIdForAccount,
      },
    });
  }

  console.log('[seed-e2e] email templates...');
  await prisma.emailTemplates.createMany({
    data: EMAIL_TEMPLATES.map((t) => ({ name: t.name, template_type: t.type, subject: t.subject, body: t.body, variables: t.variables })),
  });

  console.log('[seed-e2e] reference data (languages, clinician types, room types)...');
  await prisma.languages.createMany({ data: LANGUAGES });
  await prisma.clinicianTypeModel.createMany({ data: CLINICIAN_TYPES.map((name) => ({ name })) });
  await prisma.roomTypeModel.createMany({ data: ROOM_TYPES.map((name) => ({ name })) });

  console.log('[seed-e2e] clinics + rooms...');
  const clinicA = await prisma.clinics.create({
    data: { name: 'MG Road Clinic', address: '12 MG Road', city: 'Bengaluru', postcode: '560001', phone: '+919876500001', email: 'mgroad@cityheart.dev', timezone: 'Asia/Kolkata', client_org_id: primaryOrg.id },
  });
  const clinicA2 = await prisma.clinics.create({
    data: { name: 'Koramangala Health Center', address: '100 Koramangala', city: 'Bengaluru', postcode: '560034', phone: '+919876500002', email: 'koramangala@cityheart.dev', timezone: 'Asia/Kolkata', client_org_id: primaryOrg.id },
  });
  const clinicB = await prisma.clinics.create({
    data: { name: 'Westside FC Road Clinic', address: '45 FC Road', city: 'Pune', postcode: '411005', phone: '+919812345679', email: 'fcroad@westsidehealth.dev', timezone: 'Asia/Kolkata', client_org_id: foreignOrg.id },
  });
  const roomA1 = await prisma.rooms.create({ data: { clinic_id: clinicA.id, room_number: '101', capacity: 2 } });
  const roomA2 = await prisma.rooms.create({ data: { clinic_id: clinicA2.id, room_number: '201', capacity: 2 } });
  const roomB1 = await prisma.rooms.create({ data: { clinic_id: clinicB.id, room_number: '301', capacity: 2 } });

  console.log('[seed-e2e] clinicians...');
  const sarah = await prisma.clinicians.create({
    data: { id: FIXED_CLINICIAN_ID, clinic_id: clinicA.id, first_name: 'Sarah', last_name: 'Mitchell', clinician_type: 'General Physician', email: 'sarah.mitchell@cityheart.dev', phone: '+919876500010', bio: 'Experienced GP', is_active: true },
  });
  const otherClinicianSeed = [
    { first_name: 'Rohan', last_name: 'Verma', clinician_type: 'Pediatrician', clinic_id: clinicA.id, email: 'rohan.verma@cityheart.dev', phone: '+919876500011' },
    { first_name: 'Kavita', last_name: 'Rao', clinician_type: 'Dermatologist', clinic_id: clinicA2.id, email: 'kavita.rao@cityheart.dev', phone: '+919876500012' },
    { first_name: 'Imran', last_name: 'Sheikh', clinician_type: 'Cardiologist', clinic_id: clinicA2.id, email: 'imran.sheikh@cityheart.dev', phone: '+919876500013' },
    { first_name: 'Deepa', last_name: 'Nair', clinician_type: 'General Physician', clinic_id: clinicB.id, email: 'deepa.nair@westsidehealth.dev', phone: '+919812345690' },
  ];
  const otherClinicians = [];
  for (const c of otherClinicianSeed) {
    otherClinicians.push(await prisma.clinicians.create({ data: { ...c, is_active: true } }));
  }
  const allClinicians = [sarah, ...otherClinicians];

  console.log('[seed-e2e] clinician availability...');
  // Sarah gets every day of the week (BUG011 -- booking-payment.spec.js
  // needs a real slot regardless of which day it happens to run).
  await prisma.clinicianAvailability.createMany({
    data: [0, 1, 2, 3, 4, 5, 6].map((dow) => ({
      clinician_id: sarah.id, clinic_id: clinicA.id, day_of_week: dow, start_time: '09:00', end_time: '17:00', recurrence_type: 'weekly',
    })),
  });
  // Everyone else: Mon-Fri.
  await prisma.clinicianAvailability.createMany({
    data: otherClinicians.flatMap((c) =>
      [1, 2, 3, 4, 5].map((dow) => ({ clinician_id: c.id, clinic_id: c.clinic_id, day_of_week: dow, start_time: '09:00', end_time: '17:00', recurrence_type: 'weekly' })),
    ),
  });

  console.log('[seed-e2e] spacer block...');
  await prisma.spacerBlocks.create({
    data: { clinician_id: sarah.id, clinic_id: clinicA.id, start_time: new Date('1970-01-01T12:00:00.000Z'), end_time: new Date('1970-01-01T12:15:00.000Z'), reason: 'prep time', recurrence_type: 'single' },
  });

  console.log('[seed-e2e] products / services...');
  const categoryA = await prisma.productCategories.create({ data: { name: 'Consultations', client_org_id: primaryOrg.id, clinic_id: clinicA.id } });
  const generalConsult = await prisma.products.create({
    data: { name: 'General Consultation', description: 'Standard 30-minute consultation', product_type: 'simple', sku: 'E2E-SKU-GEN', price: 50000, duration_minutes: 30, client_org_id: primaryOrg.id, clinic_id: clinicA.id, category_id: categoryA.id },
  });
  const specialistConsult = await prisma.products.create({
    data: { name: 'Specialist Consultation', description: 'Extended consultation', product_type: 'simple', sku: 'E2E-SKU-SPEC', price: 80000, duration_minutes: 45, client_org_id: primaryOrg.id, clinic_id: clinicA.id, category_id: categoryA.id },
  });
  await prisma.clinicianServices.createMany({
    data: allClinicians.map((c) => ({ clinician_id: c.id, product_id: generalConsult.id })),
  });
  await prisma.clinicianServices.create({ data: { clinician_id: sarah.id, product_id: specialistConsult.id } });
  // manager-services.spec.js: expects a clinic-LESS ("GP Consultation" has
  // no clinic_id, matching context/open-questions.md #2's existing gap
  // pattern -- it's invisible to an org-scoped manager, visible to an
  // org-less admin) service at exactly this name/price.
  //
  // finances.spec.js / manager-analytics.spec.js ALSO need "GP Consultation"
  // / "₹499" to appear, but via a completely different data path: the
  // finances page and dashboard join appointment -> product (see
  // appointment-payments.service.ts's `include: { appointment: { include:
  // { product: true } } }`), not the raw Products table -- creating this
  // row alone does nothing for either spec unless a real appointment/
  // payment actually references it. Confirmed live (BUG018): every one of
  // the 2000 bulk-seeded appointments used `generalConsult` instead, so
  // neither spec's assertion could ever pass no matter how this product was
  // named. Fixed below by routing Anita's own fixture appointment through
  // this product instead.
  const gpConsult = await prisma.products.create({
    data: { name: 'GP Consultation', description: 'General practice consultation', product_type: 'simple', sku: 'E2E-SKU-GP', price: 49900, duration_minutes: 30, client_org_id: primaryOrg.id },
  });

  console.log('[seed-e2e] ~200 patients...');
  const PATIENT_COUNT = 200;
  const patientRows = [];
  for (let i = 2; i <= PATIENT_COUNT; i++) {
    patientRows.push({
      first_name: 'E2E', last_name: `Patient${String(i).padStart(4, '0')}`,
      date_of_birth: new Date(1970 + (i % 40), i % 12, (i % 27) + 1),
      email: `e2e.patient${i}@e2e.dev`, phone: `+9198101${String(i).padStart(5, '0')}`,
      address: `${i} Test Road, Bengaluru`,
    });
  }
  await prisma.patients.createMany({ data: patientRows });
  // Anita is the fixed fixture several specs assert on by name -- created
  // in its own call AFTER the bulk 199 (not patient #1 of a single
  // createMany, where every row in one multi-row INSERT shares the same
  // created_at and tie-break order is implementation detail, not something
  // to depend on) so she's provably the most recent row and lands on the
  // default (newest-first) page of a 200-patient, now genuinely paginated,
  // list -- confirmed live: patient #1 in the original ordering fell off
  // page 1 entirely once real pagination kicked in.
  const anita = await prisma.patients.create({
    data: { first_name: 'Anita', last_name: 'Sharma', date_of_birth: new Date('1988-04-12'), email: 'anita.sharma@e2e.dev', phone: '+919810100001', address: '1 MG Road, Bengaluru' },
  });
  const patients = await prisma.patients.findMany({ select: { id: true, first_name: true, last_name: true }, orderBy: { created_at: 'asc' } });

  console.log('[seed-e2e] ~2000 appointments across a rolling date range...');
  const APPOINTMENT_COUNT = 2000;
  const appointmentRows = [];

  // Anita's own appointment with Sarah, dated "today" so it's inside
  // calendar/index.jsx's default month view and appointments/index.jsx's
  // "All" tab -- both real, live assertions across existing specs.
  appointmentRows.push({
    clinic_id: clinicA.id, room_id: roomA1.id, clinician_id: sarah.id, patient_id: anita.id,
    appointment_date: daysFromNow(0), appointment_time: daysFromNow(0, 10, 0),
    duration_minutes: 30, status: 'scheduled', reason: 'Annual checkup', product_id: gpConsult.id,
  });

  // BUG017 (this session) added a real DB-level EXCLUDE constraint on both
  // clinician_id and room_id overlaps -- this loop's original slot formula
  // (day/hour/minute derived from `i % 91`/`i % 8`/`i % 2`) repeats every
  // 91*8*2 = 1,456 iterations, well inside APPOINTMENT_COUNT = 2000, and
  // *every* clinician at a given clinic shares that clinic's single room
  // (see the room_id ternary below), so any two appointments landing on the
  // same repeated slot at the same clinic collide on room_id regardless of
  // which clinician they're for. Confirmed live: backend_e2e crash-looped
  // on a real 23P01 exclusion violation the first time this ran against
  // the new constraint. Fixed by tracking a running per-room slot counter
  // instead of deriving the slot from the shared global `i` -- each room's
  // Nth appointment gets a distinct slot number, so no two appointments in
  // the same room can ever land on the same (day, hour, minute).
  //
  // That alone still collided a second time, also confirmed live: Anita's
  // manual appointment above (Sarah, roomA1, day 0/10:00) is pushed outside
  // this counter's bookkeeping, so the loop's own counter-derived sequence
  // eventually re-derives that exact same (room, day, hour, minute) for
  // Sarah again -- a clinician-level violation, not a room one this time.
  // `reservedRoomSlots` skips any counter-derived slot that collides with a
  // manually-pushed appointment's slot, in whichever room it used.
  const reservedRoomSlots = new Set<string>([`${roomA1.id}|0|10|0`]);
  const slotCounterByRoom: Record<string, number> = {};
  function nextRoomSlot(roomId: string) {
    let n = slotCounterByRoom[roomId] ?? 0;
    let dayOffset: number, hour: number, minute: number, key: string;
    do {
      dayOffset = (n % 91) - 30; // -30..+60 days
      hour = 9 + (Math.floor(n / 91) % 8); // 09:00-16:00
      minute = Math.floor(n / (91 * 8)) % 2 === 0 ? 0 : 30;
      key = `${roomId}|${dayOffset}|${hour}|${minute}`;
      n++;
    } while (reservedRoomSlots.has(key));
    slotCounterByRoom[roomId] = n;
    return { dayOffset, hour, minute };
  }
  for (let i = 1; i < APPOINTMENT_COUNT; i++) {
    const clinician = allClinicians[i % allClinicians.length];
    const patient = patients[i % patients.length];
    const roomId = clinician.clinic_id === clinicA.id ? roomA1.id : clinician.clinic_id === clinicA2.id ? roomA2.id : roomB1.id;
    const { dayOffset, hour, minute } = nextRoomSlot(roomId);
    const status = i % 20 === 0 ? 'no_show' : i % 7 === 0 ? 'cancelled' : dayOffset < 0 ? 'completed' : 'scheduled';
    appointmentRows.push({
      clinic_id: clinician.clinic_id, room_id: roomId,
      clinician_id: clinician.id, patient_id: patient.id,
      appointment_date: daysFromNow(dayOffset), appointment_time: daysFromNow(dayOffset, hour, minute),
      duration_minutes: 30, status, reason: 'Consultation', product_id: generalConsult.id,
    });
  }
  // createMany in batches -- 2000 rows in one call is fine for Postgres, but
  // chunking keeps any single query well clear of parameter-count limits.
  const CHUNK = 500;
  for (let i = 0; i < appointmentRows.length; i += CHUNK) {
    await prisma.appointments.createMany({ data: appointmentRows.slice(i, i + CHUNK) as any });
  }

  console.log('[seed-e2e] a realistic slice of payments...');
  // `product_id` in the select, not just for filtering: a payment's amount
  // must match its own appointment's real product price (49900 for Anita's
  // GP Consultation row, 50000 for every General Consultation row) -- a
  // flat 50000 for every payment regardless of product would itself have
  // been a second, independent way finances.spec.js's "₹499" line-item
  // assertion could never pass, on top of the product_id mismatch above.
  //
  // No `orderBy` here means Postgres is free to return these 600 rows in
  // any physical order it likes -- confirmed live, it did not reliably
  // include Anita's row (inserted first, but with no ORDER BY that's not
  // a guarantee `take` respects). Building her payment explicitly, rather
  // than hoping an unordered sample of 600 out of 2001 rows happens to
  // include the one specific row three separate specs depend on.
  // Anita ends up with more than one appointment -- she's also in the
  // `patients` array the bulk loop cycles through via `patients[i %
  // patients.length]`, so `findFirst({ where: { patient_id: anita.id } })`
  // with no further filter is not guaranteed to return her manually-pushed
  // GP Consultation row specifically. Confirmed live: it returned a
  // General-Consultation bulk-loop row instead the first time this was
  // tried. `product_id: gpConsult.id` disambiguates -- only her manual row
  // has it.
  const anitaAppointment = await prisma.appointments.findFirst({ where: { patient_id: anita.id, product_id: gpConsult.id }, select: { id: true, clinic_id: true } });
  const appointments = await prisma.appointments.findMany({ where: { patient_id: { not: anita.id } }, select: { id: true, patient_id: true, clinic_id: true, status: true, product_id: true }, take: 600 });
  const paidRows = [
    { appointment_id: anitaAppointment!.id, patient_id: anita.id, clinic_id: anitaAppointment!.clinic_id, client_org_id: primaryOrg.id, amount: 49900, status: 'succeeded' as const },
    ...appointments
      .filter((a, i) => a.status !== 'cancelled' && i % 2 === 0)
      .map((a) => ({ appointment_id: a.id, patient_id: a.patient_id, clinic_id: a.clinic_id, client_org_id: primaryOrg.id, amount: a.product_id === gpConsult.id ? 49900 : 50000, status: 'succeeded' as const })),
  ];
  for (let i = 0; i < paidRows.length; i += CHUNK) {
    await prisma.appointmentPayments.createMany({ data: paidRows.slice(i, i + CHUNK) });
  }

  console.log('[seed-e2e] messages...');
  const [adminUser, managerUser] = await prisma.userProfiles.findMany({ where: { email: { in: ['admin@medibook.dev', 'manager@medibook.dev'] } } });
  const thread = await prisma.messageThreads.create({ data: { client_org_id: primaryOrg.id, last_message: 'See you at 10am.' } });
  await prisma.messageParticipants.createMany({
    data: [{ thread_id: thread.id, user_id: adminUser.id }, { thread_id: thread.id, user_id: managerUser.id, unread_count: 1 }],
  });
  await prisma.messages.createMany({
    data: [
      { thread_id: thread.id, from_id: adminUser.id, body: 'Morning -- can you cover the front desk at 10?' },
      { thread_id: thread.id, from_id: managerUser.id, body: 'See you at 10am.' },
    ],
  });

  console.log('[seed-e2e] test results...');
  // test-results.spec.js expects this exact name/test -- patient_name is
  // free text on this model (see the model's own comment: no real patient
  // picker exists in the Order-Test dialog), not linked to a real Patients row.
  //
  // ordered_by_user_id (not just the free-text ordered_by_name) is required
  // for this row to actually be visible at all -- test-results.service.ts's
  // findAll() scopes by `orgScopeVia(user, 'ordered_by')`, a real relation
  // to UserProfiles.client_org_id. Confirmed live: omitting it left the row
  // permanently invisible to every org-scoped caller (testResults always
  // returned []), even though the row existed in the database the whole
  // time -- the seed script's own docstring never mentioned this field, and
  // it's easy to assume the free-text ordered_by_name alone is enough.
  await prisma.testResults.create({
    data: {
      patient_name: 'Priya Sharma', test_name: 'Blood Test', test_type: 'blood',
      ordered_by_name: 'Sarah Manager', ordered_by_user_id: managerUser.id,
      status: 'completed', values: [{ name: 'Hemoglobin', value: '13.5', ref: '12-16', flag: 'normal' }],
    },
  });

  console.log('[seed-e2e] done.');
  console.log(`  clinicians: ${allClinicians.length}, patients: ${patients.length}, appointments: ${appointmentRows.length}, payments: ${paidRows.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
