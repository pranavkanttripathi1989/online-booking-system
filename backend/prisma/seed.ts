import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Matches frontend/src/pages/auth/login.jsx's DEMO_ACCOUNTS exactly, so the
// same 5 demo buttons work against a real backend instead of the mock fallback.
const DEMO_ACCOUNTS = [
  { email: 'admin@medibook.dev', password: 'Admin1234!', role: 'admin', first_name: 'Admin', last_name: 'User', phone: '+919810000001' },
  { email: 'manager@medibook.dev', password: 'Mgr1234!', role: 'manager', first_name: 'Sarah', last_name: 'Manager', phone: '+919810000002' },
  { email: 'clinician@medibook.dev', password: 'Cln1234!', role: 'clinician', first_name: 'Alex', last_name: 'Clinician', phone: '+919810000003' },
  { email: 'receptionist@medibook.dev', password: 'Rec1234!', role: 'staff', first_name: 'Jamie', last_name: 'Reception', phone: '+919810000004' },
  { email: 'patient@medibook.dev', password: 'Pat1234!', role: 'patient', first_name: 'Priya', last_name: 'Patient', phone: '+919810000005' },
];

const ROLES = ['admin', 'super_admin', 'manager', 'clinician', 'staff', 'patient'];

// SECURITY-TESTING GAP FIX (2026-08-19): a QA-audit pass found that
// ClientOrganizations rows existed in the dev DB (created ad hoc via the
// Organizations module, not by this script) but NOTHING was ever linked to
// them -- every demo account and every seeded clinic had client_org_id:
// null. That meant every tenant/self-scoping fix made during that pass could
// only be live-verified via the "org-less caller sees everything" bypass
// path, never against a real two-tenant boundary (only the mocked unit
// tests actually exercised rejection). Fixing this here so `docker exec
// medibook_backend npx prisma db seed` on a fresh or existing DB always
// establishes a real, live-testable tenant boundary: `city-heart` is the
// "home" org every demo account/clinic belongs to; `westside-health` is a
// second, deliberately separate org existing purely so a cross-tenant
// negative test (manager from city-heart querying/mutating westside-health
// data) has something real to run against.
const PRIMARY_ORG_CODE = 'city-heart';
const FOREIGN_ORG_CODE = 'westside-health';

// Mirrors admin/EmailTemplates.jsx's MOCK_EMAIL_TEMPLATES exactly (name/type/
// subject/body/variables) so the real backend serves the same realistic
// content the page already assumed via its mock fallback — per
// backend-implementation-plan.md Phase 9's own note that templates are
// seed-created, not user-created (no createEmailTemplate mutation exists).
const EMAIL_TEMPLATES = [
  { name: 'Appointment Confirmation', type: 'appointment_confirmation' as const, subject: 'Your appointment is confirmed — {{patient_name}}', body: 'Dear {{patient_name}},\n\nYour appointment with {{clinician_name}} on {{date}} at {{time}} has been confirmed.\n\nLocation: {{clinic_name}}\n\nThank you,\nHealthSync Team', variables: ['patient_name', 'clinician_name', 'date', 'time', 'clinic_name'] },
  { name: 'Appointment Reminder', type: 'appointment_reminder' as const, subject: 'Reminder: Your appointment tomorrow — {{patient_name}}', body: 'Dear {{patient_name}},\n\nThis is a reminder that you have an appointment tomorrow with {{clinician_name}} at {{time}}.\n\nThank you,\nHealthSync Team', variables: ['patient_name', 'clinician_name', 'time'] },
  { name: 'Appointment Cancellation', type: 'appointment_cancellation' as const, subject: 'Appointment Cancelled — {{patient_name}}', body: 'Dear {{patient_name}},\n\nYour appointment on {{date}} has been cancelled.\n\nTo reschedule, please visit our website.\n\nHealthSync Team', variables: ['patient_name', 'date'] },
  { name: 'Password Reset', type: 'password_reset' as const, subject: 'Reset your HealthSync password', body: 'Hi {{name}},\n\nClick the link below to reset your password:\n{{reset_link}}\n\nThis link expires in 1 hour.\n\nHealthSync Team', variables: ['name', 'reset_link'] },
  { name: 'Welcome Email', type: 'welcome' as const, subject: 'Welcome to HealthSync, {{name}}!', body: 'Dear {{name}},\n\nWelcome to HealthSync. Your account has been created successfully.\n\nLogin at: {{login_url}}\n\nHealthSync Team', variables: ['name', 'login_url'] },
];

async function main() {
  console.log('Seeding roles...');
  const roleRecords: Record<string, { id: string; name: string }> = {};
  for (const name of ROLES) {
    // Prisma's compound-unique `where` doesn't accept `null` for a nullable
    // field in this version, so this is a manual findFirst+create instead of upsert.
    const existingRole = await prisma.userRoles.findFirst({ where: { client_org_id: null, name } });
    roleRecords[name] =
      existingRole ??
      (await prisma.userRoles.create({ data: { name, description: `${name} role`, is_system: true } }));
  }

  // Permissions catalog: schema.prisma has always had the right primitives
  // (Permissions/RolePermissions) for admin/Roles.jsx's custom-role builder,
  // but the table itself was never seeded -- the resource/action taxonomy
  // below matches frontend/src/mocks/data/permissions.js exactly, since that
  // was the de-facto spec the real backend was built against.
  console.log('Seeding permissions catalog...');
  const PERMISSION_RESOURCES = [
    'appointments', 'patients', 'clinicians', 'clinics', 'rooms',
    'products', 'billing', 'reviews', 'messages', 'roles', 'settings', 'reports',
  ];
  const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete', 'export'];
  for (const resource of PERMISSION_RESOURCES) {
    for (const action of PERMISSION_ACTIONS) {
      const name = `${resource}.${action}`;
      await prisma.permissions.upsert({
        where: { name },
        update: {},
        create: { name, resource, action, description: `${action.charAt(0).toUpperCase()}${action.slice(1)} ${resource.replace('_', ' ')}` },
      });
    }
  }

  console.log('Seeding tenant organizations...');
  const primaryOrg = await prisma.clientOrganizations.upsert({
    where: { code: PRIMARY_ORG_CODE },
    update: {},
    create: {
      name: 'City Heart Clinic Group',
      code: PRIMARY_ORG_CODE,
      contact_email: 'ops@cityheart.dev',
      contact_phone: '+919876500000',
      address_structured: { line1: '12 MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', country: 'India' },
      onboarding_status: 'completed',
    },
  });
  const foreignOrg = await prisma.clientOrganizations.upsert({
    where: { code: FOREIGN_ORG_CODE },
    update: {},
    create: {
      name: 'Westside Health Group',
      code: FOREIGN_ORG_CODE,
      contact_email: 'ops@westsidehealth.dev',
      contact_phone: '+919812345678',
      address_structured: { line1: '45 FC Road', line2: '', city: 'Pune', state: 'Maharashtra', pincode: '411005', country: 'India' },
      onboarding_status: 'completed',
    },
  });

  // Every existing clinic with no org yet belongs to the primary org — these
  // are the clinics the demo accounts already reference via seeded
  // appointments/availability/etc., so they must land in the SAME org the
  // demo accounts get assigned to below, not a fresh/different one.
  const backfilledClinics = await prisma.clinics.updateMany({
    where: { client_org_id: null },
    data: { client_org_id: primaryOrg.id },
  });
  if (backfilledClinics.count) console.log(`  backfilled client_org_id on ${backfilledClinics.count} existing clinic(s) -> ${primaryOrg.name}`);

  // A single clinic under the foreign org, existing purely so cross-tenant
  // rejection tests (a primary-org caller trying to reach this clinic's
  // data) have something real to run against live, not just in unit tests.
  const foreignClinicExists = await prisma.clinics.findFirst({ where: { client_org_id: foreignOrg.id } });
  if (!foreignClinicExists) {
    await prisma.clinics.create({
      data: {
        name: 'Westside FC Road Clinic',
        address: '45 FC Road',
        city: 'Pune',
        postcode: '411005',
        phone: '+919812345679',
        email: 'fcroad@westsidehealth.dev',
        timezone: 'Asia/Kolkata',
        client_org_id: foreignOrg.id,
      },
    });
    console.log(`  created cross-tenant test clinic under ${foreignOrg.name}`);
  }

  console.log('Seeding demo accounts...');
  for (const account of DEMO_ACCOUNTS) {
    // admin/super_admin are deliberately platform-wide (client_org_id: null,
    // not just absent) -- every other role belongs to the primary org.
    const orgIdForAccount = account.role === 'admin' || account.role === 'super_admin' ? null : primaryOrg.id;
    const existing = await prisma.userProfiles.findUnique({ where: { email: account.email } });
    if (existing) {
      const patch: { phone?: string; client_org_id?: string | null } = {};
      if (!existing.phone) patch.phone = account.phone;
      if (existing.client_org_id !== orgIdForAccount) patch.client_org_id = orgIdForAccount;
      if (Object.keys(patch).length) {
        await prisma.userProfiles.update({ where: { id: existing.id }, data: patch });
        console.log(`  updated (${Object.keys(patch).join(', ')}): ${account.email}`);
      } else {
        console.log(`  skip (exists): ${account.email}`);
      }
      continue;
    }
    const hashed = await bcrypt.hash(account.password, 12);
    const user = await prisma.users.create({ data: {} });
    await prisma.userProfiles.create({
      data: {
        id: user.id,
        email: account.email,
        password: hashed,
        first_name: account.first_name,
        last_name: account.last_name,
        phone: account.phone,
        role_id: roleRecords[account.role].id,
        client_org_id: orgIdForAccount,
      },
    });
    console.log(`  created: ${account.email} (${account.role})`);
  }

  console.log('Seeding email templates...');
  for (const tpl of EMAIL_TEMPLATES) {
    const existing = await prisma.emailTemplates.findFirst({ where: { template_type: tpl.type } });
    if (existing) {
      console.log(`  skip (exists): ${tpl.name}`);
      continue;
    }
    await prisma.emailTemplates.create({
      data: { name: tpl.name, template_type: tpl.type, subject: tpl.subject, body: tpl.body, variables: tpl.variables },
    });
    console.log(`  created: ${tpl.name}`);
  }

  // REQ044/REQ016 -- a small, manually-curated set of platform-seeded
  // (client_org_id: null) drugs, standing in for a real licensed drug
  // database until that sourcing decision is made (PRD Open Question 4,
  // still unresolved). schedule_class follows India's Drugs and Cosmetics
  // Rules schedule letters (H = prescription-only, H1 = stricter
  // prescription tracking, OTC = no schedule).
  console.log('Seeding drug master (platform-seeded reference data)...');
  const DRUGS = [
    { name: 'Paracetamol', composition: 'Paracetamol', strength: '500mg', form: 'Tablet', schedule_class: 'OTC', hsn: '30049099', gst_rate: 12, manufacturer: 'Generic' },
    { name: 'Amoxicillin', composition: 'Amoxicillin', strength: '500mg', form: 'Capsule', schedule_class: 'H', hsn: '30041020', gst_rate: 12, manufacturer: 'Generic' },
    { name: 'Metformin', composition: 'Metformin Hydrochloride', strength: '500mg', form: 'Tablet', schedule_class: 'H', hsn: '30049099', gst_rate: 12, manufacturer: 'Generic' },
    { name: 'Amlodipine', composition: 'Amlodipine Besylate', strength: '5mg', form: 'Tablet', schedule_class: 'H', hsn: '30049099', gst_rate: 12, manufacturer: 'Generic' },
    { name: 'Cetirizine', composition: 'Cetirizine Hydrochloride', strength: '10mg', form: 'Tablet', schedule_class: 'OTC', hsn: '30049099', gst_rate: 12, manufacturer: 'Generic' },
    { name: 'Azithromycin', composition: 'Azithromycin', strength: '500mg', form: 'Tablet', schedule_class: 'H1', hsn: '30041020', gst_rate: 12, manufacturer: 'Generic' },
  ];
  for (const drug of DRUGS) {
    const existing = await prisma.drugs.findFirst({ where: { name: drug.name, client_org_id: null } });
    if (existing) {
      console.log(`  skip (exists): ${drug.name}`);
      continue;
    }
    await prisma.drugs.create({ data: drug });
    console.log(`  created: ${drug.name}`);
  }

  // REQ045 — the self-serve onboarding wizard's plan-picker step reads this
  // table for real; it was live in the schema since Phase 3.5 but never
  // seeded, so the step always rendered empty against a real backend.
  console.log('Seeding subscription plans (onboarding wizard)...');
  const PLANS = [
    {
      name: 'Starter', description: 'For a single clinic just getting started.',
      price_monthly: 249900, price_yearly: 2499000, max_clinics: 1, max_users: 5,
      features: ['1 clinic location', 'Up to 5 staff/clinician accounts', 'Online booking & calendar', 'Email reminders', 'Basic reporting'],
    },
    {
      name: 'Pro', description: 'For growing multi-clinic practices.',
      price_monthly: 699900, price_yearly: 6999000, max_clinics: 5, max_users: 25,
      features: ['Up to 5 clinic locations', 'Up to 25 staff/clinician accounts', 'SMS + email reminders', 'Patient reviews & messaging', 'Advanced analytics', 'Razorpay payment collection'],
    },
    {
      // price 0 signals "Contact sales" — see organization-onboarding.entity.ts.
      // max_clinics/max_users are non-nullable Int columns (no "unlimited"
      // representation) — 999999 is a documented sentinel, not a real cap.
      name: 'Enterprise', description: 'For hospital groups and large chains.',
      price_monthly: 0, price_yearly: 0, max_clinics: 999999, max_users: 999999,
      features: ['Unlimited clinics & staff', 'Dedicated account manager', 'Custom integrations', 'Priority support & SLA', 'GST-compliant multi-branch invoicing'],
    },
  ];
  for (const plan of PLANS) {
    const existing = await prisma.subscriptionPlans.findUnique({ where: { name: plan.name } });
    if (existing) {
      console.log(`  skip (exists): ${plan.name}`);
      continue;
    }
    await prisma.subscriptionPlans.create({ data: plan });
    console.log(`  created: ${plan.name}`);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
