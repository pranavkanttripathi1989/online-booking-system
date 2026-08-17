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
