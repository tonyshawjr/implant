import { PrismaClient } from '@prisma/client';
import { Argon2id } from 'oslo/password';
import { randomBytes } from 'crypto';
import { writeFileSync, appendFileSync, existsSync } from 'fs';
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

// Write credentials to file (outside of git-tracked location or gitignored)
function writeCredentialsToFile(password: string, users: { email: string; role: string }[]): void {
  const credentialsPath = join(__dirname, 'seed-credentials.txt');
  const timestamp = new Date().toISOString();

  let content = `# Seed Credentials - Generated ${timestamp}\n`;
  content += `# WARNING: This file contains sensitive credentials. Keep it secure and delete after use.\n\n`;
  content += `Password for all seeded users: ${password}\n\n`;
  content += `Users created:\n`;

  for (const user of users) {
    content += `  - ${user.email} (${user.role})\n`;
  }

  content += `\n# Delete this file after noting the credentials!\n`;

  writeFileSync(credentialsPath, content, { mode: 0o600 }); // Restrictive permissions
  console.log(`\nCredentials written to: ${credentialsPath}`);
  console.log('WARNING: Delete this file after noting the credentials!\n');
}

const SEED_PASSWORD = getSeedPassword();

// Helper function to generate unique IDs
function generateId(): string {
  return crypto.randomUUID();
}

// Helper function to generate random phone number
function generatePhone(): string {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const lineNumber = Math.floor(Math.random() * 9000) + 1000;
  return `(${areaCode}) ${prefix}-${lineNumber}`;
}

// Helper function to generate random date within range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to generate random number in range
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper to get random item from array
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('Starting seed...');

  // Hash the seed password
  const hasher = new Argon2id();
  const passwordHash = await hasher.hash(SEED_PASSWORD);

  // Track users for credentials output
  const createdUsers: { email: string; role: string }[] = [];

  // ============================================================================
  // 1. PLANS
  // ============================================================================
  console.log('Creating plans...');

  const starterPlan = await prisma.plan.upsert({
    where: { slug: 'starter' },
    update: {},
    create: {
      id: generateId(),
      name: 'Starter',
      slug: 'starter',
      description: 'Perfect for single-location practices looking to grow',
      basePrice: 1500,
      territoryLimit: 1,
      userLimit: 3,
      features: {
        territories: 1,
        radiusMiles: 15,
        commitment: '6 months',
        features: [
          'Single city / 15-mile radius',
          'Up to 3 team members',
          'Basic analytics dashboard',
          'Email support',
          'Monthly performance reports'
        ]
      },
      isActive: true,
      sortOrder: 1
    }
  });

  const growthPlan = await prisma.plan.upsert({
    where: { slug: 'growth' },
    update: {},
    create: {
      id: generateId(),
      name: 'Growth',
      slug: 'growth',
      description: 'For practices ready to dominate their regional market',
      basePrice: 2500,
      territoryLimit: 2,
      userLimit: 10,
      features: {
        territories: 2,
        radiusMiles: 30,
        commitment: '12 months',
        features: [
          'County / 30-mile radius',
          'Up to 10 team members',
          'Advanced analytics & AI insights',
          'Priority support',
          'Weekly optimization calls',
          'Custom landing pages'
        ]
      },
      isActive: true,
      sortOrder: 2
    }
  });

  const enterprisePlan = await prisma.plan.upsert({
    where: { slug: 'enterprise' },
    update: {},
    create: {
      id: generateId(),
      name: 'Enterprise',
      slug: 'enterprise',
      description: 'For multi-location practices and DSOs seeking market dominance',
      basePrice: 4000,
      territoryLimit: 5,
      userLimit: 25,
      features: {
        territories: 5,
        radiusMiles: 50,
        commitment: '12 months',
        features: [
          'Multi-county / metro area',
          'Unlimited team members',
          'White-glove onboarding',
          'Dedicated account manager',
          'Custom AI voice profile',
          'API access',
          'Advanced competitor intelligence'
        ]
      },
      isActive: true,
      sortOrder: 3
    }
  });

  console.log('Plans created successfully');

  // ============================================================================
  // 2. ADD-ONS
  // ============================================================================
  console.log('Creating add-ons...');

  const addons = await Promise.all([
    prisma.addOn.upsert({
      where: { slug: 'ai-appointment-setter' },
      update: {},
      create: {
        id: generateId(),
        name: 'AI Appointment Setter',
        slug: 'ai-appointment-setter',
        description: 'Automated lead follow-up and appointment scheduling via SMS and email',
        addonType: 'recurring',
        price: 500,
        features: {
          includes: [
            'Automated SMS follow-up sequences',
            'AI-powered conversation handling',
            'Calendar integration',
            'Real-time appointment notifications'
          ]
        },
        isActive: true,
        sortOrder: 1
      }
    }),
    prisma.addOn.upsert({
      where: { slug: 'review-generation' },
      update: {},
      create: {
        id: generateId(),
        name: 'Review Generation',
        slug: 'review-generation',
        description: 'Automated review request campaigns to boost your online reputation',
        addonType: 'recurring',
        price: 250,
        features: {
          includes: [
            'Post-appointment review requests',
            'Multi-platform support (Google, Facebook, Yelp)',
            'Review monitoring dashboard',
            'Response templates'
          ]
        },
        isActive: true,
        sortOrder: 2
      }
    }),
    prisma.addOn.upsert({
      where: { slug: 'competitor-intelligence' },
      update: {},
      create: {
        id: generateId(),
        name: 'Competitor Intelligence',
        slug: 'competitor-intelligence',
        description: 'Monthly competitive analysis and market positioning reports',
        addonType: 'recurring',
        price: 300,
        features: {
          includes: [
            'Monthly competitor ad monitoring',
            'Market share analysis',
            'Pricing intelligence',
            'Strategic recommendations'
          ]
        },
        isActive: true,
        sortOrder: 3
      }
    }),
    prisma.addOn.upsert({
      where: { slug: 'territory-expansion' },
      update: {},
      create: {
        id: generateId(),
        name: 'Territory Expansion',
        slug: 'territory-expansion',
        description: 'Add additional exclusive territories to your coverage area',
        addonType: 'recurring',
        price: 750,
        features: {
          includes: [
            'Additional exclusive territory',
            'Full campaign coverage',
            'Dedicated landing pages',
            'Territory-specific analytics'
          ]
        },
        isActive: true,
        sortOrder: 4
      }
    }),
    prisma.addOn.upsert({
      where: { slug: 'video-ad-production' },
      update: {},
      create: {
        id: generateId(),
        name: 'Video Ad Production',
        slug: 'video-ad-production',
        description: 'Professional video ad creation for social media campaigns',
        addonType: 'one_time',
        price: 750,
        features: {
          includes: [
            'Professional video editing',
            'Motion graphics',
            'Multiple format exports',
            'Brand-aligned messaging'
          ]
        },
        isActive: true,
        sortOrder: 5
      }
    })
  ]);

  console.log('Add-ons created successfully');

  // ============================================================================
  // 3. TERRITORIES
  // ============================================================================
  console.log('Creating territories...');

  const territories = await Promise.all([
    prisma.territory.create({
      data: {
        id: generateId(),
        name: 'Austin Metro',
        city: 'Austin',
        state: 'TX',
        centerLat: 30.2672,
        centerLng: -97.7431,
        radiusMiles: 30,
        territoryType: 'metro',
        status: 'locked',
        population: 2283371,
        households: 892000,
        medianAge: 33.8,
        medianIncome: 80954,
        implantCandidates: 45667,
        competitionCount: 12,
        monthlyBasePrice: 2500,
        performanceScore: 87.5
      }
    }),
    prisma.territory.create({
      data: {
        id: generateId(),
        name: 'Denver Downtown',
        city: 'Denver',
        state: 'CO',
        centerLat: 39.7392,
        centerLng: -104.9903,
        radiusMiles: 20,
        territoryType: 'premium',
        status: 'locked',
        population: 715522,
        households: 310000,
        medianAge: 35.2,
        medianIncome: 72661,
        implantCandidates: 28621,
        competitionCount: 8,
        monthlyBasePrice: 2000,
        performanceScore: 82.3
      }
    }),
    prisma.territory.create({
      data: {
        id: generateId(),
        name: 'Phoenix North',
        city: 'Phoenix',
        state: 'AZ',
        centerLat: 33.5722,
        centerLng: -112.0901,
        radiusMiles: 25,
        territoryType: 'standard',
        status: 'locked',
        population: 1680992,
        households: 623000,
        medianAge: 42.1,
        medianIncome: 62055,
        implantCandidates: 67240,
        competitionCount: 15,
        monthlyBasePrice: 1800,
        performanceScore: 79.8
      }
    }),
    prisma.territory.create({
      data: {
        id: generateId(),
        name: 'Nashville Central',
        city: 'Nashville',
        state: 'TN',
        centerLat: 36.1627,
        centerLng: -86.7816,
        radiusMiles: 15,
        territoryType: 'standard',
        status: 'available',
        population: 689447,
        households: 298000,
        medianAge: 34.5,
        medianIncome: 59828,
        implantCandidates: 27578,
        competitionCount: 6,
        monthlyBasePrice: 1500,
        performanceScore: null
      }
    }),
    prisma.territory.create({
      data: {
        id: generateId(),
        name: 'Seattle Eastside',
        city: 'Bellevue',
        state: 'WA',
        centerLat: 47.6101,
        centerLng: -122.2015,
        radiusMiles: 20,
        territoryType: 'premium',
        status: 'available',
        population: 151854,
        households: 62000,
        medianAge: 37.8,
        medianIncome: 117779,
        implantCandidates: 12148,
        competitionCount: 4,
        monthlyBasePrice: 2200,
        performanceScore: null
      }
    }),
    prisma.territory.create({
      data: {
        id: generateId(),
        name: 'San Diego Coastal',
        city: 'San Diego',
        state: 'CA',
        centerLat: 32.7157,
        centerLng: -117.1611,
        radiusMiles: 25,
        territoryType: 'metro',
        status: 'waitlist',
        population: 1386932,
        households: 512000,
        medianAge: 35.4,
        medianIncome: 89457,
        implantCandidates: 55477,
        competitionCount: 18,
        monthlyBasePrice: 3000,
        performanceScore: null
      }
    }),
    prisma.territory.create({
      data: {
        id: generateId(),
        name: 'Atlanta North',
        city: 'Atlanta',
        state: 'GA',
        centerLat: 33.8823,
        centerLng: -84.4674,
        radiusMiles: 20,
        territoryType: 'standard',
        status: 'available',
        population: 498044,
        households: 210000,
        medianAge: 36.2,
        medianIncome: 65345,
        implantCandidates: 19922,
        competitionCount: 9,
        monthlyBasePrice: 1600,
        performanceScore: null
      }
    })
  ]);

  console.log('Territories created successfully');

  // ============================================================================
  // 4. INTERNAL USERS (Super Admin, Admin, Support)
  // ============================================================================
  console.log('Creating internal users...');

  const superAdmin = await prisma.user.create({
    data: {
      id: generateId(),
      email: 'superadmin@squeez.media',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Mitchell',
      phone: '(512) 555-0100',
      role: 'super_admin',
      isActive: true,
      emailVerifiedAt: new Date(),
      lastLoginAt: new Date(),
      loginCount: 156
    }
  });
  createdUsers.push({ email: 'superadmin@squeez.media', role: 'super_admin' });

  const adminUsers = await Promise.all([
    prisma.user.create({
      data: {
        id: generateId(),
        email: 'admin@squeez.media',
        passwordHash,
        firstName: 'Michael',
        lastName: 'Chen',
        phone: '(512) 555-0101',
        role: 'admin',
        isActive: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date(),
        loginCount: 89
      }
    }),
    prisma.user.create({
      data: {
        id: generateId(),
        email: 'jessica.rodriguez@squeez.media',
        passwordHash,
        firstName: 'Jessica',
        lastName: 'Rodriguez',
        phone: '(512) 555-0102',
        role: 'admin',
        isActive: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: randomDate(new Date('2024-01-01'), new Date()),
        loginCount: 67
      }
    })
  ]);
  createdUsers.push(
    { email: 'admin@squeez.media', role: 'admin' },
    { email: 'jessica.rodriguez@squeez.media', role: 'admin' }
  );

  const supportUsers = await Promise.all([
    prisma.user.create({
      data: {
        id: generateId(),
        email: 'support@squeez.media',
        passwordHash,
        firstName: 'David',
        lastName: 'Thompson',
        phone: '(512) 555-0103',
        role: 'support',
        isActive: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date(),
        loginCount: 234
      }
    }),
    prisma.user.create({
      data: {
        id: generateId(),
        email: 'emily.parker@squeez.media',
        passwordHash,
        firstName: 'Emily',
        lastName: 'Parker',
        phone: '(512) 555-0104',
        role: 'support',
        isActive: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: randomDate(new Date('2024-01-01'), new Date()),
        loginCount: 178
      }
    })
  ]);
  createdUsers.push(
    { email: 'support@squeez.media', role: 'support' },
    { email: 'emily.parker@squeez.media', role: 'support' }
  );

  console.log('Internal users created successfully');

  // ============================================================================
  // 5. ORGANIZATIONS WITH CLIENT USERS
  // ============================================================================
  console.log('Creating organizations...');

  // Organization 1: Starter Tier - Austin Dental Implants
  const org1 = await prisma.organization.create({
    data: {
      id: generateId(),
      name: 'Austin Dental Implants',
      slug: 'austin-dental-implants',
      logoUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=200',
      website: 'https://austindentalimplants.com',
      phone: '(512) 555-1000',
      email: 'info@austindentalimplants.com',
      addressLine1: '123 Main Street',
      addressLine2: 'Suite 200',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      country: 'US',
      timezone: 'America/Chicago',
      status: 'active',
      healthScore: 72.5,
      avgCaseValue: 4200,
      clientSince: new Date('2024-03-15'),
      accountManagerId: adminUsers[0].id
    }
  });

  // Organization 2: Growth Tier - Mile High Implants
  const org2 = await prisma.organization.create({
    data: {
      id: generateId(),
      name: 'Mile High Implants',
      slug: 'mile-high-implants',
      logoUrl: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=200',
      website: 'https://milehighimplants.com',
      phone: '(303) 555-2000',
      email: 'contact@milehighimplants.com',
      addressLine1: '456 Colorado Boulevard',
      city: 'Denver',
      state: 'CO',
      postalCode: '80203',
      country: 'US',
      timezone: 'America/Denver',
      status: 'active',
      healthScore: 88.3,
      avgCaseValue: 5500,
      clientSince: new Date('2023-11-01'),
      accountManagerId: adminUsers[0].id
    }
  });

  // Organization 3: Enterprise Tier - Desert Smile Dental Group
  const org3 = await prisma.organization.create({
    data: {
      id: generateId(),
      name: 'Desert Smile Dental Group',
      slug: 'desert-smile-dental',
      logoUrl: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=200',
      website: 'https://desertsmile.dental',
      phone: '(602) 555-3000',
      email: 'info@desertsmile.dental',
      addressLine1: '789 Camelback Road',
      addressLine2: 'Building A',
      city: 'Phoenix',
      state: 'AZ',
      postalCode: '85016',
      country: 'US',
      timezone: 'America/Phoenix',
      status: 'active',
      healthScore: 94.1,
      avgCaseValue: 6200,
      clientSince: new Date('2023-06-20'),
      accountManagerId: adminUsers[1].id
    }
  });

  console.log('Organizations created successfully');

  // ============================================================================
  // 6. CLIENT USERS
  // ============================================================================
  console.log('Creating client users...');

  // Org 1 users
  const org1Users = await Promise.all([
    prisma.user.create({
      data: {
        id: generateId(),
        email: 'drjohnson@austindentalimplants.com',
        passwordHash,
        firstName: 'Robert',
        lastName: 'Johnson',
        phone: '(512) 555-1001',
        role: 'client_owner',
        organizationId: org1.id,
        isActive: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: randomDate(new Date('2024-06-01'), new Date()),
        loginCount: 45
      }
    }),
    prisma.user.create({
      data: {
        id: generateId(),
        email: 'lisa.martinez@austindentalimplants.com',
        passwordHash,
        firstName: 'Lisa',
        lastName: 'Martinez',
        phone: '(512) 555-1002',
        role: 'client_admin',
        organizationId: org1.id,
        isActive: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: randomDate(new Date('2024-06-01'), new Date()),
        loginCount: 78
      }
    }),
    prisma.user.create({
      data: {
        id: generateId(),
        email: 'james.wilson@austindentalimplants.com',
        passwordHash,
        firstName: 'James',
        lastName: 'Wilson',
        phone: '(512) 555-1003',
        role: 'client_staff',
        organizationId: org1.id,
        isActive: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: randomDate(new Date('2024-06-01'), new Date()),
        loginCount: 34
      }
    })
  ]);
  createdUsers.push(
    { email: 'drjohnson@austindentalimplants.com', role: 'client_owner' },
    { email: 'lisa.martinez@austindentalimplants.com', role: 'client_admin' },
    { email: 'james.wilson@austindentalimplants.com', role: 'client_staff' }
  );

  // Org 2 users
  const org2Users = await Promise.all([
    prisma.user.create({
      data: {
        id: generateId(),
        email: 'drsmith@milehighimplants.com',
        passwordHash,
        firstName: 'Amanda',
        lastName: 'Smith',
        phone: '(303) 555-2001',
        role: 'client_owner',
        organizationId: org2.id,
        isActive: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: randomDate(new Date('2024-06-01'), new Date()),
        loginCount: 92
      }
    }),
    prisma.user.create({
      data: {
        id: generateId(),
        email: 'kevin.brown@milehighimplants.com',
        passwordHash,
        firstName: 'Kevin',
        lastName: 'Brown',
        phone: '(303) 555-2002',
        role: 'client_admin',
        organizationId: org2.id,
        isActive: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: randomDate(new Date('2024-06-01'), new Date()),
        loginCount: 56
      }
    }),
    prisma.user.create({
      data: {
        id: generateId(),
        email: 'sarah.davis@milehighimplants.com',
        passwordHash,
        firstName: 'Sarah',
        lastName: 'Davis',
        phone: '(303) 555-2003',
        role: 'client_staff',
        organizationId: org2.id,
        isActive: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: randomDate(new Date('2024-06-01'), new Date()),
        loginCount: 23
      }
    })
  ]);
  createdUsers.push(
    { email: 'drsmith@milehighimplants.com', role: 'client_owner' },
    { email: 'kevin.brown@milehighimplants.com', role: 'client_admin' },
    { email: 'sarah.davis@milehighimplants.com', role: 'client_staff' }
  );

  // Org 3 users
  const org3Users = await Promise.all([
    prisma.user.create({
      data: {
        id: generateId(),
        email: 'drpatel@desertsmile.dental',
        passwordHash,
        firstName: 'Raj',
        lastName: 'Patel',
        phone: '(602) 555-3001',
        role: 'client_owner',
        organizationId: org3.id,
        isActive: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: randomDate(new Date('2024-06-01'), new Date()),
        loginCount: 134
      }
    }),
    prisma.user.create({
      data: {
        id: generateId(),
        email: 'maria.garcia@desertsmile.dental',
        passwordHash,
        firstName: 'Maria',
        lastName: 'Garcia',
        phone: '(602) 555-3002',
        role: 'client_admin',
        organizationId: org3.id,
        isActive: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: randomDate(new Date('2024-06-01'), new Date()),
        loginCount: 89
      }
    }),
    prisma.user.create({
      data: {
        id: generateId(),
        email: 'tom.anderson@desertsmile.dental',
        passwordHash,
        firstName: 'Tom',
        lastName: 'Anderson',
        phone: '(602) 555-3003',
        role: 'client_staff',
        organizationId: org3.id,
        isActive: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: randomDate(new Date('2024-06-01'), new Date()),
        loginCount: 67
      }
    }),
    prisma.user.create({
      data: {
        id: generateId(),
        email: 'jennifer.lee@desertsmile.dental',
        passwordHash,
        firstName: 'Jennifer',
        lastName: 'Lee',
        phone: '(602) 555-3004',
        role: 'client_staff',
        organizationId: org3.id,
        isActive: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: randomDate(new Date('2024-06-01'), new Date()),
        loginCount: 45
      }
    })
  ]);

  console.log('Client users created successfully');

  // ============================================================================
  // 7. TERRITORY ASSIGNMENTS
  // ============================================================================
  console.log('Creating territory assignments...');

  await Promise.all([
    prisma.territoryAssignment.create({
      data: {
        id: generateId(),
        territoryId: territories[0].id, // Austin Metro
        organizationId: org1.id,
        assignedAt: new Date('2024-03-15'),
        expiresAt: new Date('2025-03-15'),
        isExclusive: true,
        monthlyRate: 1500,
        status: 'active'
      }
    }),
    prisma.territoryAssignment.create({
      data: {
        id: generateId(),
        territoryId: territories[1].id, // Denver Downtown
        organizationId: org2.id,
        assignedAt: new Date('2023-11-01'),
        expiresAt: new Date('2024-11-01'),
        isExclusive: true,
        monthlyRate: 2500,
        status: 'active'
      }
    }),
    prisma.territoryAssignment.create({
      data: {
        id: generateId(),
        territoryId: territories[2].id, // Phoenix North
        organizationId: org3.id,
        assignedAt: new Date('2023-06-20'),
        expiresAt: new Date('2024-06-20'),
        isExclusive: true,
        monthlyRate: 4000,
        status: 'active'
      }
    })
  ]);

  console.log('Territory assignments created successfully');

  // ============================================================================
  // 8. CONTRACTS
  // ============================================================================
  console.log('Creating contracts...');

  const contracts = await Promise.all([
    prisma.contract.create({
      data: {
        id: generateId(),
        organizationId: org1.id,
        planId: starterPlan.id,
        contractNumber: 'CTR-2024-001',
        status: 'active',
        termMonths: 6,
        startDate: new Date('2024-03-15'),
        endDate: new Date('2024-09-15'),
        monthlyCommitment: 1500,
        annualValue: 9000,
        autoRenew: true,
        signedAt: new Date('2024-03-14'),
        signedBy: org1Users[0].id
      }
    }),
    prisma.contract.create({
      data: {
        id: generateId(),
        organizationId: org2.id,
        planId: growthPlan.id,
        contractNumber: 'CTR-2023-045',
        status: 'active',
        termMonths: 12,
        startDate: new Date('2023-11-01'),
        endDate: new Date('2024-11-01'),
        monthlyCommitment: 2500,
        annualValue: 30000,
        autoRenew: true,
        signedAt: new Date('2023-10-28'),
        signedBy: org2Users[0].id
      }
    }),
    prisma.contract.create({
      data: {
        id: generateId(),
        organizationId: org3.id,
        planId: enterprisePlan.id,
        contractNumber: 'CTR-2023-023',
        status: 'active',
        termMonths: 12,
        startDate: new Date('2023-06-20'),
        endDate: new Date('2024-06-20'),
        monthlyCommitment: 4500,
        annualValue: 54000,
        autoRenew: true,
        signedAt: new Date('2023-06-18'),
        signedBy: org3Users[0].id
      }
    })
  ]);

  console.log('Contracts created successfully');

  // ============================================================================
  // 9. INVOICES
  // ============================================================================
  console.log('Creating invoices...');

  const invoiceData = [
    { org: org1, contract: contracts[0], baseAmount: 1500 },
    { org: org2, contract: contracts[1], baseAmount: 2500 },
    { org: org3, contract: contracts[2], baseAmount: 4500 }
  ];

  for (const { org, contract, baseAmount } of invoiceData) {
    // Create 3 months of invoices per org
    for (let i = 0; i < 3; i++) {
      const issueDate = new Date();
      issueDate.setMonth(issueDate.getMonth() - (2 - i));
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 30);

      const invoiceNumber = `INV-${org.slug.toUpperCase().substring(0, 3)}-${2024}${String(issueDate.getMonth() + 1).padStart(2, '0')}`;

      await prisma.invoice.create({
        data: {
          id: generateId(),
          organizationId: org.id,
          contractId: contract.id,
          invoiceNumber: `${invoiceNumber}-${i}`,
          status: i < 2 ? 'paid' : 'pending',
          issueDate: issueDate,
          dueDate: dueDate,
          subtotal: baseAmount,
          taxAmount: 0,
          totalAmount: baseAmount,
          paidAmount: i < 2 ? baseAmount : 0,
          paidAt: i < 2 ? new Date(dueDate.getTime() - 5 * 24 * 60 * 60 * 1000) : null,
          lineItems: {
            create: [
              {
                id: generateId(),
                description: `Monthly Subscription - ${contract.id === contracts[0].id ? 'Starter' : contract.id === contracts[1].id ? 'Growth' : 'Enterprise'} Plan`,
                quantity: 1,
                unitPrice: baseAmount,
                amount: baseAmount,
                itemType: 'subscription'
              }
            ]
          }
        }
      });
    }
  }

  console.log('Invoices created successfully');

  // ============================================================================
  // 10. ORGANIZATION ADD-ONS
  // ============================================================================
  console.log('Creating organization add-ons...');

  await Promise.all([
    // Org 2 has AI Appointment Setter
    prisma.organizationAddon.create({
      data: {
        id: generateId(),
        organizationId: org2.id,
        addonId: addons[0].id, // AI Appointment Setter
        status: 'active',
        startedAt: new Date('2024-01-15')
      }
    }),
    // Org 3 has multiple add-ons
    prisma.organizationAddon.create({
      data: {
        id: generateId(),
        organizationId: org3.id,
        addonId: addons[0].id, // AI Appointment Setter
        status: 'active',
        startedAt: new Date('2023-07-01')
      }
    }),
    prisma.organizationAddon.create({
      data: {
        id: generateId(),
        organizationId: org3.id,
        addonId: addons[1].id, // Review Generation
        status: 'active',
        startedAt: new Date('2023-08-15')
      }
    }),
    prisma.organizationAddon.create({
      data: {
        id: generateId(),
        organizationId: org3.id,
        addonId: addons[2].id, // Competitor Intelligence
        status: 'active',
        startedAt: new Date('2023-09-01')
      }
    })
  ]);

  console.log('Organization add-ons created successfully');

  // ============================================================================
  // 11. CAMPAIGNS
  // ============================================================================
  console.log('Creating campaigns...');

  const campaignTemplates = [
    { name: 'Google Search - Dental Implants', platform: 'google' as const, type: 'lead_gen' as const },
    { name: 'Facebook - Implant Awareness', platform: 'facebook' as const, type: 'awareness' as const },
    { name: 'Instagram - Patient Stories', platform: 'instagram' as const, type: 'awareness' as const },
    { name: 'Google Display - Retargeting', platform: 'google' as const, type: 'retargeting' as const },
    { name: 'Meta - Lead Generation', platform: 'meta' as const, type: 'lead_gen' as const }
  ];

  const orgsWithTerritories = [
    { org: org1, territory: territories[0], users: org1Users },
    { org: org2, territory: territories[1], users: org2Users },
    { org: org3, territory: territories[2], users: org3Users }
  ];

  const allCampaigns = [];

  for (const { org, territory } of orgsWithTerritories) {
    const numCampaigns = org.id === org3.id ? 5 : org.id === org2.id ? 4 : 3;

    for (let i = 0; i < numCampaigns; i++) {
      const template = campaignTemplates[i];
      const startDate = randomDate(new Date('2024-01-01'), new Date('2024-06-01'));
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 3);

      const campaign = await prisma.campaign.create({
        data: {
          id: generateId(),
          organizationId: org.id,
          territoryId: territory.id,
          name: `${template.name} - ${org.name}`,
          platform: template.platform,
          campaignType: template.type,
          status: i === 0 ? 'active' : randomItem(['active', 'paused', 'completed']),
          startDate,
          endDate,
          dailyBudget: randomInt(50, 200),
          monthlyBudget: randomInt(1500, 6000),
          objective: template.type === 'lead_gen' ? 'Generate qualified leads' : 'Increase brand awareness',
          targetAudience: {
            ageMin: 35,
            ageMax: 65,
            interests: ['dental care', 'health', 'cosmetic dentistry'],
            locations: [territory.city, territory.state]
          },
          createdBy: adminUsers[0].id,
          approvedBy: adminUsers[0].id,
          approvedAt: startDate
        }
      });

      allCampaigns.push({ campaign, org, territory });

      // Create campaign metrics for last 30 days
      for (let day = 0; day < 30; day++) {
        const metricDate = new Date();
        metricDate.setDate(metricDate.getDate() - day);

        const impressions = randomInt(500, 5000);
        const clicks = Math.floor(impressions * (randomInt(15, 45) / 1000)); // 1.5-4.5% CTR
        const leads = Math.floor(clicks * (randomInt(50, 150) / 1000)); // 5-15% conversion
        const spend = randomInt(30, 150);

        await prisma.campaignMetric.create({
          data: {
            id: generateId(),
            campaignId: campaign.id,
            date: metricDate,
            impressions,
            clicks,
            ctr: clicks / impressions,
            spend,
            leads,
            cpl: leads > 0 ? spend / leads : null,
            conversions: Math.floor(leads * 0.3),
            cpa: leads > 0 ? (spend / leads) * 3 : null
          }
        });
      }
    }
  }

  console.log('Campaigns created successfully');

  // ============================================================================
  // 12. LEADS
  // ============================================================================
  console.log('Creating leads...');

  const leadFirstNames = ['John', 'Mary', 'Robert', 'Patricia', 'Michael', 'Jennifer', 'William', 'Linda', 'David', 'Elizabeth', 'Richard', 'Barbara', 'Joseph', 'Susan', 'Thomas', 'Jessica', 'Charles', 'Sarah', 'Christopher', 'Karen', 'Daniel', 'Nancy', 'Matthew', 'Lisa'];
  const leadLastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
  const procedures = ['Full mouth implants', 'Single tooth implant', 'Implant-supported dentures', 'All-on-4', 'Bone grafting consultation', 'Implant consultation'];
  const sources: Array<'google' | 'facebook' | 'instagram' | 'website' | 'referral'> = ['google', 'facebook', 'instagram', 'website', 'referral'];
  const statuses: Array<'new' | 'contacted' | 'qualified' | 'appointment_set' | 'consultation_completed' | 'converted' | 'lost'> = ['new', 'contacted', 'qualified', 'appointment_set', 'consultation_completed', 'converted', 'lost'];
  const temperatures: Array<'hot' | 'warm' | 'cold'> = ['hot', 'warm', 'cold'];

  for (const { campaign, org, territory } of allCampaigns) {
    const numLeads = randomInt(15, 30);

    for (let i = 0; i < numLeads; i++) {
      const firstName = randomItem(leadFirstNames);
      const lastName = randomItem(leadLastNames);
      const source = randomItem(sources);
      const status = randomItem(statuses);
      const temperature = status === 'converted' ? 'hot' : status === 'lost' ? 'cold' : randomItem(temperatures);
      const score = temperature === 'hot' ? randomInt(80, 100) : temperature === 'warm' ? randomInt(50, 79) : randomInt(20, 49);
      const createdAt = randomDate(new Date('2024-01-01'), new Date());

      const lead = await prisma.lead.create({
        data: {
          id: generateId(),
          organizationId: org.id,
          campaignId: campaign.id,
          territoryId: territory.id,
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 999)}@email.com`,
          phone: generatePhone(),
          source,
          sourceDetail: source === 'google' ? 'Google Ads' : source === 'facebook' ? 'Facebook Ads' : null,
          status,
          temperature,
          score,
          interestLevel: temperature === 'hot' ? 'High' : temperature === 'warm' ? 'Medium' : 'Low',
          procedureInterest: randomItem(procedures),
          insuranceStatus: randomItem(['has_insurance', 'no_insurance', 'unknown']),
          insuranceDetails: Math.random() > 0.5 ? 'Delta Dental PPO' : null,
          estimatedRevenue: randomInt(3000, 25000),
          notes: Math.random() > 0.7 ? 'Interested in financing options' : null,
          assignedTo: Math.random() > 0.3 ? org1Users[Math.min(i % 3, org1Users.length - 1)].id : null,
          convertedAt: status === 'converted' ? randomDate(createdAt, new Date()) : null,
          conversionValue: status === 'converted' ? randomInt(4000, 30000) : null,
          lostReason: status === 'lost' ? randomItem(['Price too high', 'Went with competitor', 'Not ready', 'No response']) : null,
          utmSource: source,
          utmMedium: source === 'google' ? 'cpc' : source === 'facebook' ? 'social' : 'organic',
          utmCampaign: campaign.name.toLowerCase().replace(/\s+/g, '-'),
          createdAt
        }
      });

      // Create lead activities
      const numActivities = randomInt(1, 5);
      for (let j = 0; j < numActivities; j++) {
        const activityTypes: Array<'call' | 'email' | 'sms' | 'note' | 'status_change' | 'appointment'> = ['call', 'email', 'sms', 'note', 'status_change'];
        const activityType = randomItem(activityTypes);

        await prisma.leadActivity.create({
          data: {
            id: generateId(),
            leadId: lead.id,
            activityType,
            direction: activityType !== 'note' && activityType !== 'status_change' ? randomItem(['inbound', 'outbound']) : null,
            subject: activityType === 'email' ? 'Follow-up regarding consultation' : activityType === 'call' ? 'Initial contact call' : null,
            body: activityType === 'note' ? 'Patient expressed interest in implant options' : null,
            outcome: activityType === 'call' ? randomItem(['Left voicemail', 'Spoke with patient', 'No answer']) : null,
            durationSeconds: activityType === 'call' ? randomInt(60, 600) : null,
            completedAt: randomDate(createdAt, new Date()),
            performedBy: org1Users[0].id
          }
        });
      }
    }
  }

  console.log('Leads created successfully');

  // ============================================================================
  // 13. VOICE PROFILES
  // ============================================================================
  console.log('Creating voice profiles...');

  await Promise.all([
    prisma.voiceProfile.create({
      data: {
        id: generateId(),
        organizationId: org1.id,
        name: 'Primary Brand Voice',
        status: 'approved',
        analysisStartedAt: new Date('2024-03-16'),
        analysisCompletedAt: new Date('2024-03-18'),
        qualityScore: 85.5,
        tone: 'Professional yet warm and approachable',
        personality: 'Caring, Expert, Trustworthy',
        formalityLevel: 'professional',
        targetAudience: 'Adults 35-65 seeking dental implant solutions',
        keyDifferentiators: ['Advanced technology', 'Experienced team', 'Personalized care'],
        avoidTerms: ['cheap', 'discount', 'pain'],
        preferredTerms: ['investment', 'lasting solution', 'comfort'],
        sampleHeadlines: [
          'Restore Your Smile with Confidence',
          'Expert Implant Care in Austin',
          'Your Journey to a Better Smile Starts Here'
        ],
        sampleAdCopy: [
          'Experience world-class dental implant care with our team of specialists.',
          'Transform your smile with our personalized implant solutions.'
        ],
        sampleCtas: ['Schedule Your Free Consultation', 'Get Your Smile Assessment', 'Book Your Visit Today'],
        approvedBy: adminUsers[0].id,
        approvedAt: new Date('2024-03-20')
      }
    }),
    prisma.voiceProfile.create({
      data: {
        id: generateId(),
        organizationId: org2.id,
        name: 'Primary Brand Voice',
        status: 'approved',
        analysisStartedAt: new Date('2023-11-02'),
        analysisCompletedAt: new Date('2023-11-04'),
        qualityScore: 91.2,
        tone: 'Confident and innovative',
        personality: 'Modern, Tech-forward, Friendly',
        formalityLevel: 'casual',
        targetAudience: 'Active adults seeking modern dental solutions',
        keyDifferentiators: ['Latest technology', 'Same-day implants', 'Comfortable experience'],
        avoidTerms: ['old-fashioned', 'traditional', 'lengthy'],
        preferredTerms: ['cutting-edge', 'efficient', 'comfortable'],
        sampleHeadlines: [
          'Modern Implant Solutions for Modern Lives',
          'Same-Day Smiles in Denver',
          'Experience the Future of Dental Implants'
        ],
        sampleAdCopy: [
          'Why wait months when you can smile today? Our advanced implant technology delivers results faster.',
          'Join thousands of Coloradans who chose Mile High for their smile transformation.'
        ],
        sampleCtas: ['See Your New Smile', 'Get Started Today', 'Transform Your Smile'],
        approvedBy: adminUsers[0].id,
        approvedAt: new Date('2023-11-06')
      }
    }),
    prisma.voiceProfile.create({
      data: {
        id: generateId(),
        organizationId: org3.id,
        name: 'Primary Brand Voice',
        status: 'approved',
        analysisStartedAt: new Date('2023-06-21'),
        analysisCompletedAt: new Date('2023-06-23'),
        qualityScore: 94.8,
        tone: 'Luxurious and reassuring',
        personality: 'Premium, Sophisticated, Caring',
        formalityLevel: 'formal',
        targetAudience: 'Affluent adults seeking premium dental care',
        keyDifferentiators: ['Luxury experience', 'Renowned specialists', 'Comprehensive care'],
        avoidTerms: ['budget', 'basic', 'standard'],
        preferredTerms: ['exceptional', 'personalized', 'world-class'],
        sampleHeadlines: [
          'Exceptional Dental Care for Exceptional People',
          'Where Expertise Meets Excellence',
          'Your Smile Deserves the Best'
        ],
        sampleAdCopy: [
          'Experience dental care reimagined at Desert Smile. Where luxury meets expertise.',
          'Our renowned specialists deliver results that exceed expectations.'
        ],
        sampleCtas: ['Experience Excellence', 'Schedule Your VIP Consultation', 'Discover the Difference'],
        approvedBy: adminUsers[1].id,
        approvedAt: new Date('2023-06-25')
      }
    })
  ]);

  console.log('Voice profiles created successfully');

  // ============================================================================
  // 14. SUPPORT TICKETS
  // ============================================================================
  console.log('Creating support tickets...');

  const ticketSubjects = [
    { category: 'billing' as const, subjects: ['Invoice clarification needed', 'Payment method update', 'Billing cycle question'] },
    { category: 'technical' as const, subjects: ['Dashboard loading slowly', 'Report export not working', 'Login issues'] },
    { category: 'campaign' as const, subjects: ['Ad performance questions', 'Campaign optimization request', 'Budget adjustment needed'] },
    { category: 'leads' as const, subjects: ['Lead quality concerns', 'Missing lead information', 'Lead assignment question'] },
    { category: 'account' as const, subjects: ['Add new team member', 'Update account settings', 'Territory expansion inquiry'] }
  ];

  const ticketStatuses: Array<'open' | 'pending' | 'in_progress' | 'resolved' | 'closed'> = ['open', 'pending', 'in_progress', 'resolved', 'closed'];

  let ticketCounter = 1;
  for (const org of [org1, org2, org3]) {
    const numTickets = randomInt(3, 6);
    const orgUsers = org.id === org1.id ? org1Users : org.id === org2.id ? org2Users : org3Users;

    for (let i = 0; i < numTickets; i++) {
      const categoryData = randomItem(ticketSubjects);
      const subject = randomItem(categoryData.subjects);
      const status = randomItem(ticketStatuses);
      const createdAt = randomDate(new Date('2024-01-01'), new Date());

      const ticket = await prisma.supportTicket.create({
        data: {
          id: generateId(),
          ticketNumber: `TKT-${String(ticketCounter++).padStart(5, '0')}`,
          organizationId: org.id,
          submittedBy: orgUsers[0].id,
          assignedTo: status !== 'open' ? supportUsers[0].id : null,
          category: categoryData.category,
          priority: randomItem(['low', 'medium', 'high', 'urgent']),
          status,
          subject,
          description: `I need assistance with: ${subject}. Please advise on the best course of action.`,
          resolution: status === 'resolved' || status === 'closed' ? 'Issue has been addressed and resolved.' : null,
          firstResponseAt: status !== 'open' ? new Date(createdAt.getTime() + 2 * 60 * 60 * 1000) : null,
          resolvedAt: status === 'resolved' || status === 'closed' ? randomDate(createdAt, new Date()) : null,
          closedAt: status === 'closed' ? randomDate(createdAt, new Date()) : null,
          satisfactionRating: status === 'closed' ? randomInt(3, 5) : null,
          createdAt
        }
      });

      // Add messages to ticket
      if (status !== 'open') {
        await prisma.ticketMessage.create({
          data: {
            id: generateId(),
            ticketId: ticket.id,
            senderId: supportUsers[0].id,
            message: `Hi, thank you for reaching out. I'll be happy to help you with this. Let me look into this for you.`,
            isInternal: false,
            createdAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000)
          }
        });

        if (status === 'resolved' || status === 'closed') {
          await prisma.ticketMessage.create({
            data: {
              id: generateId(),
              ticketId: ticket.id,
              senderId: orgUsers[0].id,
              message: `Thank you for your help! This resolved my issue.`,
              isInternal: false,
              createdAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000)
            }
          });
        }
      }
    }
  }

  console.log('Support tickets created successfully');

  // ============================================================================
  // 15. SALES PROSPECTS
  // ============================================================================
  console.log('Creating sales prospects...');

  const prospectData = [
    {
      practiceName: 'Bright Smile Dental',
      contactFirstName: 'Jennifer',
      contactLastName: 'Walsh',
      email: 'jwash@brightsmile.com',
      phone: '(615) 555-4001',
      city: 'Nashville',
      state: 'TN',
      stage: 'qualified' as const,
      source: 'inbound' as const,
      monthlyValue: 2500
    },
    {
      practiceName: 'Cascade Dental Group',
      contactFirstName: 'Michael',
      contactLastName: 'Kim',
      email: 'mkim@cascadedental.com',
      phone: '(425) 555-4002',
      city: 'Bellevue',
      state: 'WA',
      stage: 'demo_scheduled' as const,
      source: 'website' as const,
      monthlyValue: 4000
    },
    {
      practiceName: 'Coastal Implant Center',
      contactFirstName: 'David',
      contactLastName: 'Martinez',
      email: 'dmartinez@coastalimplant.com',
      phone: '(619) 555-4003',
      city: 'San Diego',
      state: 'CA',
      stage: 'proposal_sent' as const,
      source: 'referral' as const,
      monthlyValue: 3500
    },
    {
      practiceName: 'Peachtree Dental Care',
      contactFirstName: 'Sarah',
      contactLastName: 'Thompson',
      email: 'sthompson@peachtreedental.com',
      phone: '(404) 555-4004',
      city: 'Atlanta',
      state: 'GA',
      stage: 'new' as const,
      source: 'outbound' as const,
      monthlyValue: 1800
    },
    {
      practiceName: 'Summit Oral Surgery',
      contactFirstName: 'Robert',
      contactLastName: 'Chen',
      email: 'rchen@summitoral.com',
      phone: '(303) 555-4005',
      city: 'Boulder',
      state: 'CO',
      stage: 'negotiation' as const,
      source: 'event' as const,
      monthlyValue: 5000
    },
    {
      practiceName: 'Bay Area Implants',
      contactFirstName: 'Lisa',
      contactLastName: 'Nguyen',
      email: 'lnguyen@bayareaimplants.com',
      phone: '(510) 555-4006',
      city: 'Oakland',
      state: 'CA',
      stage: 'demo_scheduled' as const,
      source: 'inbound' as const,
      monthlyValue: 4500
    }
  ];

  for (const data of prospectData) {
    const prospect = await prisma.prospect.create({
      data: {
        id: generateId(),
        practiceName: data.practiceName,
        contactFirstName: data.contactFirstName,
        contactLastName: data.contactLastName,
        contactEmail: data.email,
        contactPhone: data.phone,
        website: `https://www.${data.practiceName.toLowerCase().replace(/\s+/g, '')}.com`,
        city: data.city,
        state: data.state,
        source: data.source,
        stage: data.stage,
        monthlyValue: data.monthlyValue,
        probability: data.stage === 'negotiation' ? 70 : data.stage === 'proposal_sent' ? 50 : data.stage === 'demo_scheduled' ? 30 : 10,
        expectedCloseDate: new Date(Date.now() + randomInt(14, 90) * 24 * 60 * 60 * 1000),
        assignedTo: adminUsers[randomInt(0, 1)].id,
        createdAt: randomDate(new Date('2024-03-01'), new Date())
      }
    });

    // Add prospect activities
    const numActivities = randomInt(2, 5);
    for (let i = 0; i < numActivities; i++) {
      await prisma.prospectActivity.create({
        data: {
          id: generateId(),
          prospectId: prospect.id,
          activityType: randomItem(['call', 'email', 'meeting', 'demo', 'note']),
          subject: `Follow-up with ${data.contactFirstName}`,
          description: 'Discussed platform features and pricing options.',
          outcome: randomItem(['Positive response', 'Requested more info', 'Scheduled follow-up', null]),
          completedAt: randomDate(new Date('2024-03-01'), new Date()),
          durationMinutes: randomInt(15, 60),
          performedBy: adminUsers[0].id
        }
      });
    }

    // Create proposals for appropriate stages
    if (['proposal_sent', 'negotiation'].includes(data.stage)) {
      const territoryForProspect = territories.find(t => t.city === data.city) || territories[3];

      await prisma.proposal.create({
        data: {
          id: generateId(),
          proposalNumber: `PROP-${String(randomInt(1000, 9999))}`,
          prospectId: prospect.id,
          territoryId: territoryForProspect.id,
          status: data.stage === 'proposal_sent' ? 'sent' : 'viewed',
          planId: data.monthlyValue >= 4000 ? enterprisePlan.id : data.monthlyValue >= 2500 ? growthPlan.id : starterPlan.id,
          monthlyValue: data.monthlyValue,
          termMonths: 12,
          territoryData: {
            name: territoryForProspect.name,
            population: territoryForProspect.population,
            households: territoryForProspect.households
          },
          marketAnalysis: {
            competitorCount: territoryForProspect.competitionCount,
            implantCandidates: territoryForProspect.implantCandidates,
            marketPotential: 'High'
          },
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          sentAt: new Date(Date.now() - randomInt(1, 14) * 24 * 60 * 60 * 1000),
          viewedAt: data.stage === 'negotiation' ? new Date() : null,
          createdBy: adminUsers[0].id
        }
      });
    }
  }

  console.log('Sales prospects created successfully');

  // ============================================================================
  // 16. CLIENT ONBOARDING
  // ============================================================================
  console.log('Creating client onboarding records...');

  const onboardingTasks = [
    { phase: 1, tasks: ['Send welcome email', 'Schedule kickoff call', 'Collect billing information', 'Sign contract'] },
    { phase: 2, tasks: ['Crawl website for voice analysis', 'Generate voice profile', 'Review and approve voice profile', 'Create sample content'] },
    { phase: 3, tasks: ['Build landing pages', 'Set up ad accounts', 'Configure tracking pixels', 'Create initial campaigns'] },
    { phase: 4, tasks: ['Launch campaigns', 'Conduct training session', 'Set up monitoring alerts', 'Schedule first review call'] }
  ];

  for (const org of [org1, org2, org3]) {
    const progress = org.id === org1.id ? 65 : org.id === org2.id ? 100 : 100;
    const currentPhase = org.id === org1.id ? 3 : 4;

    const onboarding = await prisma.clientOnboarding.create({
      data: {
        id: generateId(),
        organizationId: org.id,
        assignedTo: adminUsers[0].id,
        currentPhase,
        phase1Status: 'completed',
        phase1CompletedAt: org.clientSince,
        phase2Status: progress >= 35 ? 'completed' : progress >= 25 ? 'in_progress' : 'pending',
        phase2CompletedAt: progress >= 35 ? new Date(org.clientSince!.getTime() + 4 * 24 * 60 * 60 * 1000) : null,
        phase3Status: progress >= 70 ? 'completed' : progress >= 50 ? 'in_progress' : 'pending',
        phase3CompletedAt: progress >= 70 ? new Date(org.clientSince!.getTime() + 8 * 24 * 60 * 60 * 1000) : null,
        phase4Status: progress >= 100 ? 'completed' : progress >= 85 ? 'in_progress' : 'pending',
        phase4CompletedAt: progress >= 100 ? new Date(org.clientSince!.getTime() + 14 * 24 * 60 * 60 * 1000) : null,
        overallProgress: progress,
        startedAt: org.clientSince!,
        completedAt: progress >= 100 ? new Date(org.clientSince!.getTime() + 14 * 24 * 60 * 60 * 1000) : null
      }
    });

    // Create individual tasks
    for (const phaseData of onboardingTasks) {
      for (let i = 0; i < phaseData.tasks.length; i++) {
        const isCompleted = phaseData.phase < currentPhase || (phaseData.phase === currentPhase && i < 2);

        await prisma.onboardingTask.create({
          data: {
            id: generateId(),
            onboardingId: onboarding.id,
            phase: phaseData.phase,
            taskOrder: i + 1,
            title: phaseData.tasks[i],
            description: `Complete: ${phaseData.tasks[i]}`,
            isRequired: true,
            status: isCompleted ? 'completed' : phaseData.phase === currentPhase && i === 2 ? 'in_progress' : 'pending',
            completedBy: isCompleted ? adminUsers[0].id : null,
            completedAt: isCompleted ? new Date(org.clientSince!.getTime() + (phaseData.phase * 3 + i) * 24 * 60 * 60 * 1000) : null
          }
        });
      }
    }
  }

  console.log('Client onboarding records created successfully');

  // ============================================================================
  // 17. MONTHLY REVIEWS
  // ============================================================================
  console.log('Creating monthly reviews...');

  for (const org of [org2, org3]) {
    // Create 2 past reviews
    for (let i = 0; i < 2; i++) {
      const scheduledDate = new Date();
      scheduledDate.setMonth(scheduledDate.getMonth() - (i + 1));

      await prisma.monthlyReview.create({
        data: {
          id: generateId(),
          organizationId: org.id,
          reviewType: 'monthly_performance',
          scheduledDate,
          durationMinutes: 30,
          status: 'completed',
          meetingLink: 'https://meet.google.com/abc-defg-hij',
          attendees: [org === org2 ? org2Users[0].email : org3Users[0].email, adminUsers[0].email],
          agenda: 'Review monthly performance metrics, discuss optimization opportunities, address any concerns.',
          notes: 'Great progress this month. Discussed increasing budget for Google campaigns.',
          actionItems: [
            { task: 'Increase Google Ads budget by 20%', assignee: 'Michael Chen', dueDate: new Date() },
            { task: 'A/B test new landing page', assignee: 'Client', dueDate: new Date() }
          ],
          conductedBy: adminUsers[0].id,
          completedAt: scheduledDate
        }
      });
    }

    // Create upcoming review
    const upcomingDate = new Date();
    upcomingDate.setDate(upcomingDate.getDate() + 7);

    await prisma.monthlyReview.create({
      data: {
        id: generateId(),
        organizationId: org.id,
        reviewType: 'monthly_performance',
        scheduledDate: upcomingDate,
        durationMinutes: 30,
        status: 'scheduled',
        meetingLink: 'https://meet.google.com/xyz-abcd-efg',
        attendees: [org === org2 ? org2Users[0].email : org3Users[0].email, adminUsers[0].email],
        agenda: 'Monthly performance review and optimization planning.',
        conductedBy: adminUsers[0].id
      }
    });
  }

  console.log('Monthly reviews created successfully');

  // ============================================================================
  // 18. HEALTH SCORE HISTORY
  // ============================================================================
  console.log('Creating health score history...');

  for (const org of [org1, org2, org3]) {
    // Create 6 months of health score history
    for (let i = 0; i < 6; i++) {
      const calculatedAt = new Date();
      calculatedAt.setMonth(calculatedAt.getMonth() - (5 - i));

      const baseScore = org.id === org1.id ? 70 : org.id === org2.id ? 85 : 92;
      const variance = randomInt(-5, 5);

      await prisma.healthScoreHistory.create({
        data: {
          id: generateId(),
          organizationId: org.id,
          score: Math.min(100, Math.max(0, baseScore + variance + i)),
          leadVolumeScore: randomInt(18, 25),
          costEfficiencyScore: randomInt(18, 25),
          engagementScore: randomInt(14, 20),
          paymentHistoryScore: randomInt(12, 15),
          contractTenureScore: randomInt(10, 15),
          calculatedAt
        }
      });
    }
  }

  console.log('Health score history created successfully');

  // ============================================================================
  // 19. KNOWLEDGE BASE ARTICLES
  // ============================================================================
  console.log('Creating knowledge base articles...');

  const articles = [
    {
      title: 'Getting Started with Your Dashboard',
      slug: 'getting-started-dashboard',
      category: 'Getting Started',
      content: `# Getting Started with Your Dashboard\n\nWelcome to your Implant Lead Engine dashboard! This guide will help you navigate and make the most of your lead generation platform.\n\n## Overview\n\nYour dashboard is your command center for all lead generation activities...\n\n## Key Features\n\n- Real-time lead tracking\n- Campaign performance metrics\n- Team management\n- Billing and invoices`,
      excerpt: 'Learn how to navigate and use your dashboard effectively.'
    },
    {
      title: 'Understanding Lead Scoring',
      slug: 'understanding-lead-scoring',
      category: 'Leads',
      content: `# Understanding Lead Scoring\n\nOur AI-powered lead scoring system helps you prioritize your most valuable prospects.\n\n## How Scoring Works\n\nLeads are scored on a 0-100 scale based on several factors:\n\n- Form completeness (0-20 points)\n- Insurance status (0-15 points)\n- Engagement signals (0-25 points)\n- Response time (0-20 points)\n- Demographic match (0-20 points)\n\n## Temperature Indicators\n\n- **Hot (80+)**: High priority, ready to convert\n- **Warm (50-79)**: Engaged, needs nurturing\n- **Cold (<50)**: Low engagement, long-term prospect`,
      excerpt: 'Learn how our AI scores and prioritizes your leads.'
    },
    {
      title: 'Campaign Best Practices',
      slug: 'campaign-best-practices',
      category: 'Campaigns',
      content: `# Campaign Best Practices\n\nMaximize your campaign performance with these proven strategies.\n\n## Budget Optimization\n\nStart with a daily budget that allows for sufficient data collection...\n\n## Creative Guidelines\n\n- Use high-quality images\n- Write compelling headlines\n- Include clear calls-to-action\n\n## Targeting Tips\n\n- Focus on your territory demographics\n- Use custom audiences\n- Test different audience segments`,
      excerpt: 'Proven strategies to maximize your campaign performance.'
    },
    {
      title: 'Managing Your Team',
      slug: 'managing-your-team',
      category: 'Account',
      content: `# Managing Your Team\n\nLearn how to add team members and manage permissions.\n\n## User Roles\n\n- **Owner**: Full access to all features\n- **Admin**: Can manage team and view billing\n- **Staff**: Lead management access only\n\n## Adding Team Members\n\n1. Go to Account Settings\n2. Click "Invite Team Member"\n3. Enter their email and select role\n4. They'll receive an invitation email`,
      excerpt: 'Add team members and manage their access levels.'
    },
    {
      title: 'Billing and Payments FAQ',
      slug: 'billing-payments-faq',
      category: 'Billing',
      content: `# Billing and Payments FAQ\n\nFind answers to common billing questions.\n\n## Payment Methods\n\nWe accept:\n- Credit/Debit cards (Visa, Mastercard, Amex)\n- ACH bank transfers\n- Wire transfers (Enterprise only)\n\n## Billing Cycle\n\nInvoices are generated on the 1st of each month...\n\n## Updating Payment Method\n\nGo to Billing > Payment Methods to add or update your payment information.`,
      excerpt: 'Answers to frequently asked billing questions.'
    }
  ];

  for (const article of articles) {
    await prisma.knowledgeBaseArticle.create({
      data: {
        id: generateId(),
        title: article.title,
        slug: article.slug,
        category: article.category,
        content: article.content,
        excerpt: article.excerpt,
        status: 'published',
        visibility: 'public',
        viewCount: randomInt(50, 500),
        helpfulCount: randomInt(10, 100),
        notHelpfulCount: randomInt(0, 10),
        authorId: adminUsers[0].id,
        publishedAt: randomDate(new Date('2024-01-01'), new Date())
      }
    });
  }

  console.log('Knowledge base articles created successfully');

  // ============================================================================
  // 20. PAYMENT METHODS
  // ============================================================================
  console.log('Creating payment methods...');

  await Promise.all([
    prisma.paymentMethod.create({
      data: {
        id: generateId(),
        organizationId: org1.id,
        type: 'credit_card',
        provider: 'stripe',
        providerPaymentMethodId: `pm_${generateId().substring(0, 24)}`,
        lastFour: '4242',
        brand: 'Visa',
        expMonth: 12,
        expYear: 2026,
        isDefault: true,
        billingEmail: 'billing@austindentalimplants.com'
      }
    }),
    prisma.paymentMethod.create({
      data: {
        id: generateId(),
        organizationId: org2.id,
        type: 'credit_card',
        provider: 'stripe',
        providerPaymentMethodId: `pm_${generateId().substring(0, 24)}`,
        lastFour: '5555',
        brand: 'Mastercard',
        expMonth: 8,
        expYear: 2025,
        isDefault: true,
        billingEmail: 'accounts@milehighimplants.com'
      }
    }),
    prisma.paymentMethod.create({
      data: {
        id: generateId(),
        organizationId: org3.id,
        type: 'ach',
        provider: 'stripe',
        providerPaymentMethodId: `pm_${generateId().substring(0, 24)}`,
        lastFour: '6789',
        isDefault: true,
        billingEmail: 'finance@desertsmile.dental'
      }
    })
  ]);

  console.log('Payment methods created successfully');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n========================================');
  console.log('SEED COMPLETED SUCCESSFULLY');
  console.log('========================================\n');
  console.log('Created:');
  console.log('- 3 Plans (Starter, Growth, Enterprise)');
  console.log('- 5 Add-ons');
  console.log('- 7 Territories');
  console.log('- 5 Internal Users (1 super_admin, 2 admin, 2 support)');
  console.log('- 3 Organizations');
  console.log('- 10 Client Users');
  console.log('- 3 Territory Assignments');
  console.log('- 3 Contracts');
  console.log('- 9 Invoices');
  console.log('- 4 Organization Add-ons');
  console.log('- 12 Campaigns with metrics');
  console.log('- 180+ Leads with activities');
  console.log('- 3 Voice Profiles');
  console.log('- 9-18 Support Tickets');
  console.log('- 6 Sales Prospects with proposals');
  console.log('- 3 Client Onboarding records');
  console.log('- 6+ Monthly Reviews');
  console.log('- 18 Health Score History entries');
  console.log('- 5 Knowledge Base Articles');
  console.log('- 3 Payment Methods');
  console.log('\n========================================');
  console.log('Default password for all users: password123');
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
