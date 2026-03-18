import { AccountStatus, Role } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../lib/password.js';

async function main() {
  const email = env.DEFAULT_ADMIN_EMAIL.toLowerCase();
  const existing = await prisma.account.findUnique({ where: { email } });

  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  const admin = await prisma.account.create({
    data: {
      name: env.DEFAULT_ADMIN_NAME,
      email,
      password: await hashPassword(env.DEFAULT_ADMIN_PASSWORD),
      role: Role.ADMIN,
      status: AccountStatus.ACTIVE
    }
  });

  console.log(`Admin created with id: ${admin.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });