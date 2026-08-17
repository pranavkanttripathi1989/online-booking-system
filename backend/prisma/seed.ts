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

  console.log('Seeding demo accounts...');
  for (const account of DEMO_ACCOUNTS) {
    const existing = await prisma.userProfiles.findUnique({ where: { email: account.email } });
    if (existing) {
      if (!existing.phone) {
        await prisma.userProfiles.update({ where: { id: existing.id }, data: { phone: account.phone } });
        console.log(`  updated phone: ${account.email}`);
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
