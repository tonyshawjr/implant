import { PrismaClient } from '@prisma/client';
import { Argon2id } from 'oslo/password';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating admin user...');

  const hasher = new Argon2id();
  const passwordHash = await hasher.hash('admin123');

  // Create super admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@squeez.media' },
    update: {
      passwordHash,
      isActive: true
    },
    create: {
      id: crypto.randomUUID(),
      email: 'admin@squeez.media',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'super_admin',
      isActive: true,
      emailVerifiedAt: new Date()
    }
  });

  console.log('\n========================================');
  console.log('ADMIN CREATED SUCCESSFULLY');
  console.log('========================================');
  console.log('Email: admin@squeez.media');
  console.log('Password: admin123');
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
