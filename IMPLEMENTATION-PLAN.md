# SqueezMedia Platform - Implementation Plan

## Overview

This document provides the complete implementation plan for building the SqueezMedia platform. It is structured for **parallel agent execution** - multiple agents can work simultaneously on independent tasks.

**Read First:**
- `CLAUDE.md` - Project context and tech stack
- `../implant-lead-engine/UI-FRAMEWORK-REFERENCE.md` - Flowbite component patterns
- `../implant-lead-engine/DATABASE-ARCHITECTURE.md` - All 50 tables
- `../implant-lead-engine/COMPONENT-DEVELOPMENT-GUIDE.md` - All ~150 components

**MCP Tools Available:**
- **Context7** - Use `resolve-library-id` then `get-library-docs` for SvelteKit, Prisma, Tailwind docs
- **Flowbite Svelte MCP** - Use `getComponentDoc` before implementing any UI component

---

## Dependency Graph

```
PHASE 1: Scaffolding (SEQUENTIAL - Must complete first)
    │
    ▼
PHASE 2: Database & Auth (SEQUENTIAL - Must complete second)
    │
    ├──────────────────────────────────────────────────────────┐
    ▼                                                          ▼
PHASE 3: Layout Shell                               PHASE 4A: Seed Data & Test Utils
    │                                                          │
    ▼                                                          ▼
    └──────────────────────┬───────────────────────────────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    ▼                      ▼                      ▼
PHASE 5A               PHASE 5B               PHASE 5C
Client Dashboard       Client Dashboard       Client Dashboard
(Overview + Leads)     (Campaigns + Brand)    (Territory + Billing)
    │                      │                      │
    └──────────────────────┼──────────────────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    ▼                      ▼                      ▼
PHASE 6A               PHASE 6B               PHASE 6C
Internal Dashboard     Internal Dashboard     Internal Dashboard
(Clients + Territory)  (AI Ops + Financial)   (Sales + Support)
    │                      │                      │
    └──────────────────────┴──────────────────────┘
                           │
                           ▼
                    PHASE 7: Integrations
                    (Stripe, Twilio, Maps, Ads)
                           │
                           ▼
                    PHASE 8: AI Features
                    (Brand Voice Engine, Ad Generation)
```

---

## PHASE 1: Project Scaffolding

**Status:** SEQUENTIAL - Must complete before anything else
**Estimated Time:** 2-3 hours
**Agents:** 1

### Tasks

#### 1.1 Initialize SvelteKit
```bash
cd /Users/tonyshaw/Documents/Little\ Big\ Planet/SqueezMedia/platform
npm create svelte@latest . -- --template skeleton --typescript --prettier --eslint
```

#### 1.2 Install Core Dependencies
```bash
# UI Framework
npm install flowbite-svelte flowbite-svelte-icons flowbite

# Database
npm install @prisma/client
npm install -D prisma

# Auth
npm install lucia @lucia-auth/adapter-prisma

# Utilities
npm install zod date-fns uuid
npm install -D @types/uuid
```

#### 1.3 Install Additional Libraries
```bash
# Charts
npm install layerchart

# Maps
npm install leaflet svelte-leafletjs
npm install -D @types/leaflet

# Drag and Drop (for Kanban)
npm install svelte-dnd-action

# Rich Text Editor
npm install flowbite-svelte-wysiwyg
```

#### 1.4 Configure Tailwind
Create/update `tailwind.config.js`:
```javascript
const flowbite = require('flowbite/plugin');

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        }
      }
    }
  },
  plugins: [flowbite]
};
```

#### 1.5 Create Folder Structure
```
src/
├── lib/
│   ├── components/
│   │   ├── core/           # Wrapped Flowbite components
│   │   ├── layout/         # AppShell, Sidebar, Header
│   │   ├── leads/          # Lead-related components
│   │   ├── campaigns/      # Campaign components
│   │   ├── territory/      # Map components
│   │   ├── billing/        # Billing components
│   │   ├── analytics/      # Chart components
│   │   └── internal/       # Internal dashboard components
│   ├── server/
│   │   ├── db.ts           # Prisma client
│   │   ├── auth.ts         # Lucia config
│   │   └── utils/          # Server utilities
│   ├── stores/             # Svelte stores
│   └── utils/              # Client utilities
├── routes/
│   ├── (auth)/             # Public auth routes
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (client)/           # Client dashboard (protected)
│   │   ├── +layout.svelte
│   │   ├── +page.svelte    # Overview
│   │   ├── leads/
│   │   ├── campaigns/
│   │   ├── brand-voice/
│   │   ├── territory/
│   │   ├── billing/
│   │   ├── account/
│   │   └── support/
│   └── (internal)/         # Internal dashboard (protected, admin only)
│       ├── +layout.svelte
│       ├── +page.svelte    # Client overview
│       ├── territories/
│       ├── ai-operations/
│       ├── financial/
│       ├── sales/
│       ├── support/
│       └── settings/
├── app.css
├── app.html
└── hooks.server.ts
```

#### 1.6 Create Base Files

**src/app.css:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**src/lib/server/db.ts:**
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

#### 1.7 Initialize Prisma
```bash
npx prisma init
```

Update `.env` with Vercel Postgres connection string.

### Phase 1 Completion Criteria
- [ ] SvelteKit app runs with `npm run dev`
- [ ] Flowbite components render correctly
- [ ] Folder structure created
- [ ] Prisma initialized
- [ ] All dependencies installed

---

## PHASE 2: Database & Authentication

**Status:** SEQUENTIAL - Must complete before dashboard phases
**Estimated Time:** 4-6 hours
**Agents:** 1 (database work must be sequential)

### Tasks

#### 2.1 Create Prisma Schema

Create `prisma/schema.prisma` with all 50 tables from `DATABASE-ARCHITECTURE.md`.

**Key Models (in dependency order):**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// 1. Organizations (no dependencies)
model Organization {
  id                String   @id @default(uuid())
  name              String
  slug              String   @unique
  website           String?
  phone             String?
  email             String?
  address           String?
  city              String?
  state             String?
  zipCode           String?  @map("zip_code")
  logoUrl           String?  @map("logo_url")
  avgCaseValue      Decimal? @default(4000) @map("avg_case_value") @db.Decimal(10, 2)
  timezone          String   @default("America/New_York")
  status            OrgStatus @default(active)
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  deletedAt         DateTime? @map("deleted_at")

  // Relations
  users             User[]
  territories       Territory[]
  leads             Lead[]
  campaigns         Campaign[]
  subscriptions     Subscription[]
  brandVoiceProfile BrandVoiceProfile?

  @@map("organizations")
}

enum OrgStatus {
  active
  suspended
  churned
}

// 2. Users (depends on Organization)
model User {
  id             String   @id @default(uuid())
  organizationId String?  @map("organization_id")
  email          String   @unique
  passwordHash   String   @map("password_hash")
  firstName      String   @map("first_name")
  lastName       String   @map("last_name")
  avatarUrl      String?  @map("avatar_url")
  role           UserRole @default(client_staff)
  isActive       Boolean  @default(true) @map("is_active")
  lastLoginAt    DateTime? @map("last_login_at")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")
  deletedAt      DateTime? @map("deleted_at")

  // Relations
  organization   Organization? @relation(fields: [organizationId], references: [id])
  sessions       Session[]

  @@map("users")
}

enum UserRole {
  super_admin
  admin
  support
  client_owner
  client_admin
  client_staff
}

// 3. Sessions (for Lucia auth)
model Session {
  id        String   @id
  userId    String   @map("user_id")
  expiresAt DateTime @map("expires_at")

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

// Continue with remaining 47 tables...
// See DATABASE-ARCHITECTURE.md for complete schema
```

**Full schema sections to implement:**
1. Organizations & Users (5 tables)
2. Territories (2 tables)
3. Contracts & Subscriptions (5 tables)
4. Campaigns & Ads (6 tables)
5. Leads (4 tables)
6. Brand Voice (4 tables)
7. Landing Pages & Assets (4 tables)
8. Support (2 tables)
9. Analytics (2 tables)
10. Internal Operations (4 tables)
11. Sales Pipeline (3 tables)
12. Competitor Intelligence (1 table)
13. Add-ons (2 tables)
14. Proposals (1 table)
15. Audit (1 table)

#### 2.2 Configure Lucia Authentication

**src/lib/server/auth.ts:**
```typescript
import { Lucia } from 'lucia';
import { PrismaAdapter } from '@lucia-auth/adapter-prisma';
import { prisma } from './db';
import { dev } from '$app/environment';

const adapter = new PrismaAdapter(prisma.session, prisma.user);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: !dev
    }
  },
  getUserAttributes: (attributes) => {
    return {
      email: attributes.email,
      firstName: attributes.first_name,
      lastName: attributes.last_name,
      role: attributes.role,
      organizationId: attributes.organization_id
    };
  }
});

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      email: string;
      first_name: string;
      last_name: string;
      role: string;
      organization_id: string | null;
    };
  }
}
```

**src/hooks.server.ts:**
```typescript
import { lucia } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get(lucia.sessionCookieName);

  if (!sessionId) {
    event.locals.user = null;
    event.locals.session = null;
    return resolve(event);
  }

  const { session, user } = await lucia.validateSession(sessionId);

  if (session && session.fresh) {
    const sessionCookie = lucia.createSessionCookie(session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes
    });
  }

  if (!session) {
    const sessionCookie = lucia.createBlankSessionCookie();
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes
    });
  }

  event.locals.user = user;
  event.locals.session = session;

  return resolve(event);
};
```

#### 2.3 Create Auth Routes

**src/routes/(auth)/login/+page.svelte** - Login form
**src/routes/(auth)/login/+page.server.ts** - Login action
**src/routes/(auth)/register/+page.svelte** - Registration form
**src/routes/(auth)/register/+page.server.ts** - Registration action
**src/routes/(auth)/logout/+page.server.ts** - Logout action

#### 2.4 Push Schema & Seed Database
```bash
npx prisma db push
npx prisma generate
```

Create `prisma/seed.ts` with test data.

### Phase 2 Completion Criteria
- [ ] All 50 tables created in database
- [ ] Prisma client generated
- [ ] Lucia authentication working
- [ ] Login/register/logout functional
- [ ] Test user can log in

---

## PHASE 3: Layout Shell

**Status:** Can run in PARALLEL with Phase 4A after Phase 2
**Estimated Time:** 3-4 hours
**Agents:** 1

### Tasks

#### 3.1 Create AppShell Component

**src/lib/components/layout/AppShell.svelte:**
- Sidebar + main content area
- Responsive (sidebar collapses on mobile)
- Dark mode toggle

#### 3.2 Create Sidebar Component

**src/lib/components/layout/Sidebar.svelte:**
- Use Flowbite `Sidebar`, `SidebarGroup`, `SidebarItem`
- Client nav items: Overview, Leads, Campaigns, Brand Voice, Territory, Billing, Account, Support
- Internal nav items: Clients, Territories, AI Ops, Financial, Sales, Support, Settings
- Active state based on current route

#### 3.3 Create Header Component

**src/lib/components/layout/Header.svelte:**
- Use Flowbite `Navbar`
- User avatar dropdown (profile, settings, logout)
- Notifications bell
- Search (optional)

#### 3.4 Create Client Dashboard Layout

**src/routes/(client)/+layout.svelte:**
- Wrap with AppShell
- Client-specific sidebar items
- Auth guard (redirect if not logged in)

**src/routes/(client)/+layout.server.ts:**
- Load user data
- Load organization data
- Redirect if not authenticated

#### 3.5 Create Internal Dashboard Layout

**src/routes/(internal)/+layout.svelte:**
- Wrap with AppShell
- Internal-specific sidebar items
- Admin role guard

**src/routes/(internal)/+layout.server.ts:**
- Check for admin/super_admin role
- Redirect if not authorized

### Phase 3 Completion Criteria
- [ ] AppShell renders with sidebar and header
- [ ] Client dashboard layout works
- [ ] Internal dashboard layout works
- [ ] Navigation between pages works
- [ ] Auth guards redirect properly

---

## PHASE 4A: Seed Data & Test Utilities

**Status:** Can run in PARALLEL with Phase 3 after Phase 2
**Estimated Time:** 2-3 hours
**Agents:** 1

### Tasks

#### 4A.1 Create Comprehensive Seed Data

**prisma/seed.ts:**
```typescript
// Create test data for all tables:
// - 3 organizations (different tiers)
// - 10 users (various roles)
// - 5 territories
// - 20 leads per organization
// - 5 campaigns per organization
// - Brand voice profiles
// - Sample invoices
// - Support tickets
// - Sales pipeline entries
```

#### 4A.2 Create Test Utilities

**src/lib/utils/test-helpers.ts:**
- Mock data generators
- Date formatting utilities
- Currency formatting
- Status color helpers

#### 4A.3 Create Shared Stores

**src/lib/stores/user.ts** - Current user store
**src/lib/stores/organization.ts** - Current organization store
**src/lib/stores/notifications.ts** - Toast notifications

### Phase 4A Completion Criteria
- [ ] Seed script populates all tables
- [ ] Test data is realistic
- [ ] Utility functions working
- [ ] Stores created

---

## PHASE 5: Client Dashboard Pages

**Status:** Can run 3 agents in PARALLEL after Phases 3 & 4A complete
**Estimated Time:** 8-12 hours total (split across 3 agents)

---

### PHASE 5A: Overview + Leads Center

**Agents:** 1
**Estimated Time:** 4-5 hours

#### 5A.1 Overview Page (src/routes/(client)/+page.svelte)

**Components to build:**
- `StatCard` - Wrap Flowbite Card with stat layout
- `RecentLeadsList` - List of 5-10 recent leads
- `CampaignHealthGrid` - Campaign status cards
- `QuickActions` - Action button group

**Data to load (+page.server.ts):**
- Total leads this month (with comparison)
- Conversion rate
- Active campaigns count
- Cost per lead
- Recent leads (last 10)
- Campaign health status

#### 5A.2 Leads List Page (src/routes/(client)/leads/+page.svelte)

**Components to build:**
- `LeadFilters` - Search, status filter, date filter, source filter
- `LeadTable` - Flowbite Table with lead rows
- `LeadRow` - Individual lead row with actions
- `LeadStatusBadge` - Color-coded status
- `LeadScoreBadge` - Temperature indicator (hot/warm/cold)
- `BulkActions` - Export, bulk status update

**Data to load:**
- Paginated leads list
- Filter options (statuses, sources, campaigns)
- Total counts for filters

#### 5A.3 Lead Detail Page (src/routes/(client)/leads/[id]/+page.svelte)

**Components to build:**
- `LeadHeader` - Name, score, status, quick actions
- `LeadContactInfo` - Phone, email, click-to-call/email
- `LeadSourceInfo` - Campaign attribution
- `LeadActivityTimeline` - Activity history
- `LeadNotes` - Notes with add/edit
- `LeadStatusHistory` - Status progression
- `UpdateStatusModal` - Change lead status

**Data to load:**
- Full lead details
- Activities
- Notes
- Status history

#### 5A.4 Lead Analytics Page (src/routes/(client)/leads/analytics/+page.svelte)

**Components to build:**
- `LeadsBySourceChart` - Pie/bar chart
- `LeadsByTimeChart` - Line chart (leads over time)
- `LeadQualityDistribution` - Score breakdown
- `ConversionFunnel` - Funnel visualization
- `AverageResponseTime` - Metric card

---

### PHASE 5B: Campaigns + Brand Voice

**Agents:** 1
**Estimated Time:** 4-5 hours

#### 5B.1 Campaigns Page (src/routes/(client)/campaigns/+page.svelte)

**Components to build:**
- `CampaignCard` - Campaign summary card
- `CampaignMetrics` - Impressions, clicks, CTR, CPL
- `CampaignStatusBadge` - Active/paused/ended
- `CampaignGrid` - Grid of campaign cards
- `PerformanceTrendChart` - Line chart
- `RequestCampaignModal` - Request new campaign

**Data to load:**
- All campaigns with metrics
- Performance trends

#### 5B.2 Campaign Detail Page (src/routes/(client)/campaigns/[id]/+page.svelte)

**Components to build:**
- `CampaignHeader` - Name, status, date range
- `CampaignMetricsGrid` - Full metrics display
- `AdPreviewCard` - Ad copy + creative preview
- `LandingPagePreview` - Landing page screenshot/link
- `OptimizationLog` - AI changes timeline
- `PerformanceCharts` - Detailed charts

#### 5B.3 Brand Voice Page (src/routes/(client)/brand-voice/+page.svelte)

**Components to build:**
- `VoiceProfileCard` - Summary of voice characteristics
- `VoiceCharacteristicsList` - Identified traits
- `SourceReferencesList` - Analyzed sources
- `SampleContentCard` - Generated sample with approve/edit/regenerate
- `VoiceAdjustmentSliders` - Tone adjustments
- `KeywordPreferences` - Terms to use/avoid

**Data to load:**
- Brand voice profile
- Source references
- Sample content
- Adjustment settings

---

### PHASE 5C: Territory + Billing + Support

**Agents:** 1
**Estimated Time:** 4-5 hours

#### 5C.1 Territory Map Page (src/routes/(client)/territory/+page.svelte)

**Components to build:**
- `TerritoryMap` - Leaflet map with territory boundary
- `TerritoryBoundaryCircle` - Visual boundary
- `TerritoryInfoPanel` - Demographics, market size
- `CompetitorsList` - Other providers in area (not on platform)

**Data to load:**
- Territory details
- Demographic data
- Competitor info

#### 5C.2 Billing Page (src/routes/(client)/billing/+page.svelte)

**Components to build:**
- `SubscriptionCard` - Current plan, price, renewal date
- `AdSpendCard` - Current month ad spend
- `InvoiceTable` - Invoice history
- `InvoiceRow` - Individual invoice with download
- `PaymentMethodCard` - Current payment method
- `AddonsGrid` - Available and active add-ons
- `AddonCard` - Individual add-on with subscribe button

**Data to load:**
- Subscription details
- Invoices
- Payment methods
- Add-ons

#### 5C.3 Account Page (src/routes/(client)/account/+page.svelte)

**Components to build:**
- `ProfileForm` - Edit user profile
- `TeamMembersList` - Organization team members
- `TeamMemberRow` - Individual member with role
- `InviteTeamMemberModal` - Invite new member
- `OrganizationSettingsForm` - Org settings

#### 5C.4 Support Page (src/routes/(client)/support/+page.svelte)

**Components to build:**
- `CreateTicketForm` - New support ticket
- `TicketList` - Open tickets
- `TicketCard` - Ticket summary
- `TicketDetailModal` - Full ticket with messages
- `KnowledgeBaseSearch` - Search help articles
- `ArticleCard` - Help article preview
- `ScheduleReviewButton` - Book monthly review

---

## PHASE 6: Internal Dashboard Pages

**Status:** Can run 3 agents in PARALLEL after Phase 5 complete
**Estimated Time:** 12-16 hours total (split across 3 agents)

---

### PHASE 6A: Client Management + Territory Management

**Agents:** 1
**Estimated Time:** 5-6 hours

#### 6A.1 Client Overview Page (src/routes/(internal)/+page.svelte)

**Components to build:**
- `ClientFilters` - Search, status, health, territory filters
- `ClientTable` - All clients with health metrics
- `ClientRow` - Client with health score, CPL, status
- `HealthScoreBadge` - Color-coded (85+ green, 70-84 blue, etc.)
- `ClientDetailDrawer` - Slide-out with full client info
- `HealthScoreBreakdown` - Score component breakdown

**Data to load:**
- All clients with metrics
- Health scores
- Filter counts

#### 6A.2 Client Detail Page (src/routes/(internal)/clients/[id]/+page.svelte)

**Components to build:**
- `ClientHeader` - Name, territory, status
- `ClientMetricsGrid` - Key metrics
- `ClientCampaignsList` - Their campaigns
- `ClientLeadsSummary` - Lead stats
- `CommunicationLog` - Notes and history
- `ContractInfo` - Contract details

#### 6A.3 Territory Management Page (src/routes/(internal)/territories/+page.svelte)

**Components to build:**
- `MasterTerritoryMap` - All territories on one map
- `TerritoryStatusLegend` - Locked/available colors
- `TerritorySearch` - Search by location
- `TerritoryList` - List view of all territories
- `TerritoryRow` - Territory with client, revenue
- `TerritoryDetailModal` - Full territory info
- `WaitlistPanel` - Territory waitlist management
- `OverlapDetector` - Check for conflicts

---

### PHASE 6B: AI Operations + Financial Dashboard

**Agents:** 1
**Estimated Time:** 5-6 hours

#### 6B.1 AI Operations Page (src/routes/(internal)/ai-operations/+page.svelte)

**Components to build:**
- `VoiceProfileQueue` - Clients needing voice generation
- `QueueItem` - Client in queue with action
- `CampaignFactory` - Campaign generation pipeline
- `AdCopyReviewQueue` - Content pending QA
- `AdCopyReviewCard` - Copy with approve/reject
- `PerformanceMonitor` - Aggregate AI metrics
- `AnomalyAlerts` - Performance drop alerts
- `ModelRetrainingLog` - AI training history

**Tabs/Sections:**
1. Brand Voice Queue
2. Campaign Factory
3. Content Review
4. Performance Monitor

#### 6B.2 Financial Dashboard Page (src/routes/(internal)/financial/+page.svelte)

**Components to build:**
- `MRRCard` - Monthly recurring revenue
- `MRRTrendChart` - MRR over time
- `RevenueByTierChart` - Revenue breakdown by plan
- `RevenueByTerritoryTable` - Revenue per territory
- `AdSpendUnderManagement` - Total ad spend
- `MarginAnalysis` - Revenue vs costs per client
- `ChurnRiskTable` - At-risk clients
- `InvoiceTrackingTable` - Payment status

---

### PHASE 6C: Sales Pipeline + Support Center

**Agents:** 1
**Estimated Time:** 5-6 hours

#### 6C.1 Sales Pipeline Page (src/routes/(internal)/sales/+page.svelte)

**Components to build:**
- `SalesKanban` - Drag-drop pipeline board
- `KanbanColumn` - Pipeline stage column
- `SalesLeadCard` - Lead card in kanban
- `SalesLeadModal` - Full lead details
- `DemoScheduler` - Schedule demos
- `ProposalGenerator` - Create proposals
- `TerritoryReservation` - Hold territory during sales
- `SalesMetricsBar` - Pipeline value, conversion rate

**Kanban Stages:**
1. New
2. Qualified
3. Demo Scheduled
4. Demo Complete
5. Proposal Sent
6. Negotiation
7. Closed Won / Closed Lost

#### 6C.2 Support Center Page (src/routes/(internal)/support/+page.svelte)

**Components to build:**
- `TicketQueue` - All open tickets
- `TicketFilters` - Priority, status, client
- `TicketRow` - Ticket with priority, age
- `TicketDetailPanel` - Full ticket conversation
- `TicketReplyForm` - Reply to ticket
- `ProactiveOutreachList` - Clients needing outreach
- `OutreachTriggers` - Health alerts
- `MonthlyReviewSchedule` - Upcoming reviews

#### 6C.3 Onboarding Management Page (src/routes/(internal)/onboarding/+page.svelte)

**Components to build:**
- `OnboardingPipeline` - Clients in onboarding
- `OnboardingCard` - Client with phase progress
- `PhaseProgressBar` - 4-phase visual
- `OnboardingChecklist` - Tasks per phase
- `ChecklistItem` - Individual task
- `OnboardingDetailModal` - Full onboarding status

---

## PHASE 7: External Integrations

**Status:** Can run 4 agents in PARALLEL after Phase 6
**Estimated Time:** 8-12 hours total

---

### PHASE 7A: Stripe Integration

**Agents:** 1

#### Tasks:
- Set up Stripe SDK
- Create subscription management
- Implement webhook handlers
- Build invoice PDF generation
- Handle payment method updates
- Implement add-on purchases

---

### PHASE 7B: Twilio Integration

**Agents:** 1

#### Tasks:
- Set up Twilio SDK
- Implement SMS notifications (new lead alerts)
- Build email notification system
- Create notification preferences
- Implement AI appointment setter (if add-on active)

---

### PHASE 7C: Map Integration (Leaflet)

**Agents:** 1

#### Tasks:
- Set up Leaflet with Svelte
- Create territory boundary drawing
- Implement geocoding for addresses
- Build demographic data overlay
- Create territory overlap detection
- Implement competitor location display

---

### PHASE 7D: Ad Platform APIs

**Agents:** 1

#### Tasks:
- Facebook Marketing API setup
- Google Ads API setup
- Campaign metrics fetching
- Ad performance sync
- Spend tracking
- Automated reporting

---

## PHASE 8: AI Features

**Status:** Can run 2 agents in PARALLEL after Phase 7
**Estimated Time:** 12-20 hours total

---

### PHASE 8A: Brand Voice Engine

**Agents:** 1

#### Tasks:
- Web scraping for brand analysis (website, social, GMB)
- Claude/OpenAI integration for voice analysis
- Voice profile generation pipeline
- Sample content generation
- Voice adjustment system
- Continuous learning from approved content

---

### PHASE 8B: Campaign & Ad Generation

**Agents:** 1

#### Tasks:
- Ad copy generation in brand voice
- Landing page content generation
- A/B test variant creation
- Performance-based optimization suggestions
- Automated campaign creation pipeline
- Creative asset recommendations

---

## Parallel Execution Summary

```
TIME    AGENTS    PHASE
─────────────────────────────────
T+0     1         Phase 1: Scaffolding
T+2h    1         Phase 2: Database & Auth
T+6h    2         Phase 3: Layout (Agent 1)
                  Phase 4A: Seed Data (Agent 2)
T+10h   3         Phase 5A: Overview + Leads (Agent 1)
                  Phase 5B: Campaigns + Brand (Agent 2)
                  Phase 5C: Territory + Billing (Agent 3)
T+15h   3         Phase 6A: Clients + Territory (Agent 1)
                  Phase 6B: AI Ops + Financial (Agent 2)
                  Phase 6C: Sales + Support (Agent 3)
T+21h   4         Phase 7A: Stripe (Agent 1)
                  Phase 7B: Twilio (Agent 2)
                  Phase 7C: Maps (Agent 3)
                  Phase 7D: Ad APIs (Agent 4)
T+29h   2         Phase 8A: Brand Voice AI (Agent 1)
                  Phase 8B: Campaign AI (Agent 2)
─────────────────────────────────
TOTAL: ~35-45 hours of work
With parallel execution: ~20-25 hours elapsed
```

---

## Agent Instructions Template

When spawning an agent for a phase, use this prompt template:

```
You are building the SqueezMedia platform.

PHASE: [Phase Number and Name]
TASKS: [List specific tasks from this plan]

BEFORE YOU START:
1. Read platform/CLAUDE.md for project context
2. Read implant-lead-engine/UI-FRAMEWORK-REFERENCE.md for Flowbite patterns
3. Use Context7 MCP to get latest docs for SvelteKit, Prisma, etc.
4. Use Flowbite Svelte MCP (getComponentDoc) before implementing any UI

RULES:
- Always use Flowbite Svelte components as the base
- Never build custom versions of Button, Modal, Table, etc.
- Use TypeScript for all files
- Support dark mode (use dark: Tailwind variants)
- Follow existing code patterns in the codebase

COMPLETION:
- All tasks listed above are implemented
- Code compiles without errors
- Components render correctly
- Data loads from database
```

---

## Completion Checklist

### Phase 1: Scaffolding
- [ ] SvelteKit initialized
- [ ] All dependencies installed
- [ ] Tailwind + Flowbite configured
- [ ] Folder structure created
- [ ] Prisma initialized

### Phase 2: Database & Auth
- [ ] All 50 tables in Prisma schema
- [ ] Database pushed and working
- [ ] Lucia authentication configured
- [ ] Login/register/logout working
- [ ] Role-based access working

### Phase 3: Layout Shell
- [ ] AppShell component
- [ ] Sidebar with navigation
- [ ] Header with user menu
- [ ] Client dashboard layout
- [ ] Internal dashboard layout
- [ ] Auth guards working

### Phase 4A: Seed Data
- [ ] Seed script complete
- [ ] Test data realistic
- [ ] Utility functions created
- [ ] Stores created

### Phase 5: Client Dashboard
- [ ] Overview page
- [ ] Leads list page
- [ ] Lead detail page
- [ ] Lead analytics page
- [ ] Campaigns page
- [ ] Campaign detail page
- [ ] Brand Voice page
- [ ] Territory Map page
- [ ] Billing page
- [ ] Account page
- [ ] Support page

### Phase 6: Internal Dashboard
- [ ] Client overview page
- [ ] Client detail page
- [ ] Territory management page
- [ ] AI operations page
- [ ] Financial dashboard page
- [ ] Sales pipeline page
- [ ] Support center page
- [ ] Onboarding management page

### Phase 7: Integrations
- [ ] Stripe billing
- [ ] Twilio notifications
- [ ] Leaflet maps
- [ ] Ad platform APIs

### Phase 8: AI Features
- [ ] Brand voice engine
- [ ] Campaign generation

---

*Last Updated: February 7, 2026*
