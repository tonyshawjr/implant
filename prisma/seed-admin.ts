import { PrismaClient } from '@prisma/client';
import { Argon2id } from 'oslo/password';
import { randomBytes } from 'crypto';
import { writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

// Generate a secure random password
function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const bytes = randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[bytes[i] % charset.length];
  }
  return password;
}

// Get password from environment or generate a secure one
function getSeedPassword(): string {
  const envPassword = process.env.SEED_PASSWORD;
  if (envPassword && envPassword.length >= 8) {
    return envPassword;
  }
  return generateSecurePassword();
}

async function main() {
  console.log('Creating admin user...');

  const password = getSeedPassword();
  const hasher = new Argon2id();
  const passwordHash = await hasher.hash(password);

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

  // Write credentials to file instead of console
  const credentialsPath = join(__dirname, 'seed-credentials.txt');
  const timestamp = new Date().toISOString();
  const content = `# Admin Seed Credentials - Generated ${timestamp}
# WARNING: This file contains sensitive credentials. Keep it secure and delete after use.

Email: admin@squeez.media
Password: ${password}

# Delete this file after noting the credentials!
`;

  writeFileSync(credentialsPath, content, { mode: 0o600 }); // Restrictive permissions

  console.log('\n========================================');
  console.log('ADMIN CREATED SUCCESSFULLY');
  console.log('========================================');
  console.log('Email: admin@squeez.media');
  console.log(`Credentials written to: ${credentialsPath}`);
  console.log('WARNING: Delete this file after noting the credentials!');
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
