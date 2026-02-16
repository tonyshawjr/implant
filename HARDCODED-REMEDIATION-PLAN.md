# SqueezMedia Platform - Hardcoded Values Remediation Plan

**Generated:** 2026-02-16
**Purpose:** Fix all hardcoded values and make everything configurable from Settings UI

---

## Overview

This document contains all tasks required to eliminate hardcoded values from the platform. Everything business-related must be editable from the Settings UI - no code changes should be required to change company names, pricing, thresholds, emails, or any business configuration.

**Execution Strategy:** Tasks are organized into waves. All tasks within a wave can be executed in parallel. Complete all tasks in a wave before moving to the next wave.

---

## WAVE 0: CRITICAL SECURITY (Do First - Cannot Parallelize)

These must be done immediately and sequentially by a human or single agent.

### Task 0.1: Rotate Database Credentials
- [ ] Log into Neon console
- [ ] Reset password for user `neondb_owner`
- [ ] Generate new connection strings
- [ ] Update local `.env` with new credentials
- [ ] Update Vercel environment variables
- [ ] Verify application still connects
- **File:** `.env` (DO NOT COMMIT)

### Task 0.2: Remove .env from Git History
- [ ] Run: `git filter-branch --force --index-filter "git rm --cached --ignore-unmatch platform/.env" --prune-empty --tag-name-filter cat -- --all`
- [ ] Or use BFG Repo-Cleaner: `bfg --delete-files .env`
- [ ] Force push to remote: `git push origin --force --all`
- **Why:** Database credentials are exposed in git history

### Task 0.3: Add ENCRYPTION_KEY to Environment
- [ ] Generate key: `openssl rand -hex 32`
- [ ] Add to local `.env`: `ENCRYPTION_KEY=<generated-key>`
- [ ] Add to Vercel environment variables
- [ ] Test that integrations still work
- **File:** `.env` (local only)

---

## WAVE 1: Database Schema (Must Complete Before Wave 2-4)

All these tasks create the database tables needed to store configuration. Can be done in parallel.

### Task 1.1: Create platform_settings Table
```sql
-- Add to prisma/schema.prisma
model PlatformSettings {
  id            String   @id @default(cuid())
  key           String   @unique
  value         String   // JSON stringified
  type          String   // 'string' | 'number' | 'boolean' | 'json'
  category      String   // 'branding' | 'contact' | 'business' | 'feature_flags'
  label         String   // Human-readable label for UI
  description   String?  // Help text for UI
  updatedAt     DateTime @updatedAt
  updatedBy     String?
}
```
- [ ] Add model to `prisma/schema.prisma`
- [ ] Run `npx prisma db push`
- [ ] Create seed data for initial settings
- **Dependencies:** None

### Task 1.2: Create pricing_tiers Table
```sql
model PricingTier {
  id                String   @id @default(cuid())
  name              String   @unique  // 'starter', 'growth', 'enterprise'
  displayName       String   // 'Starter', 'Growth', 'Enterprise'
  monthlyPrice      Int      // In cents: 150000 = $1,500
  territorySize     String   // 'Single city / 15-mile', etc.
  commitmentMonths  Int      // 6, 12, etc.
  features          Json     // Array of feature strings
  isActive          Boolean  @default(true)
  sortOrder         Int      @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```
- [ ] Add model to `prisma/schema.prisma`
- [ ] Run `npx prisma db push`
- [ ] Seed with current pricing: Starter $1,500, Growth $2,500, Enterprise $4,000
- **Dependencies:** None

### Task 1.3: Create scoring_thresholds Table
```sql
model ScoringThreshold {
  id          String   @id @default(cuid())
  scoreType   String   // 'health_score', 'lead_temperature'
  level       String   // 'excellent', 'good', 'warning', 'critical' OR 'hot', 'warm', 'cold'
  minValue    Int      // Minimum score for this level
  maxValue    Int?     // Maximum score (null = no upper limit)
  color       String   // Tailwind color class
  label       String   // Display label
  sortOrder   Int      @default(0)
  updatedAt   DateTime @updatedAt
}
```
- [ ] Add model to `prisma/schema.prisma`
- [ ] Run `npx prisma db push`
- [ ] Seed with current thresholds: Health (85/70/50), Lead Temp (80/50)
- **Dependencies:** None

### Task 1.4: Create email_templates Table
```sql
model EmailTemplate {
  id          String   @id @default(cuid())
  type        String   @unique // 'welcome', 'password_reset', 'lead_notification', 'invoice', 'invite'
  subject     String
  htmlContent String   @db.Text
  textContent String?  @db.Text
  variables   Json     // Available template variables
  isActive    Boolean  @default(true)
  updatedAt   DateTime @updatedAt
  updatedBy   String?
}
```
- [ ] Add model to `prisma/schema.prisma`
- [ ] Run `npx prisma db push`
- [ ] Migrate existing email content to templates
- **Dependencies:** None

### Task 1.5: Create onboarding_phases Table
```sql
model OnboardingPhase {
  id           String   @id @default(cuid())
  phase        Int      @unique
  name         String
  description  String?
  defaultDays  Int
  tasks        Json     // Array of task objects
  sortOrder    Int      @default(0)
  updatedAt    DateTime @updatedAt
}
```
- [ ] Add model to `prisma/schema.prisma`
- [ ] Run `npx prisma db push`
- [ ] Seed with current phases: Account Setup (2), Voice Analysis (4), Campaign Build (4), Launch (4)
- **Dependencies:** None

### Task 1.6: Create business_benchmarks Table
```sql
model BusinessBenchmark {
  id          String   @id @default(cuid())
  vertical    String   @default("dental_implants")
  metric      String   // 'ctr', 'cpl', 'conversion_rate', 'case_value'
  poor        Float
  average     Float
  good        Float
  excellent   Float
  unit        String?  // '%', '$', etc.
  updatedAt   DateTime @updatedAt
}
```
- [ ] Add model to `prisma/schema.prisma`
- [ ] Run `npx prisma db push`
- [ ] Seed with current benchmarks
- **Dependencies:** None

### Task 1.7: Create optimization_settings Table
```sql
model OptimizationSetting {
  id          String   @id @default(cuid())
  key         String   @unique
  value       Float
  label       String
  description String?
  unit        String?  // '%', 'days', 'impressions'
  updatedAt   DateTime @updatedAt
}
```
- [ ] Add model to `prisma/schema.prisma`
- [ ] Run `npx prisma db push`
- [ ] Seed: ctrDropPercent=20, cplIncreasePercent=25, budgetUtilizationMin=80, creativeFatigueImpressions=50000, daysSinceOptimization=7
- **Dependencies:** None

### Task 1.8: Create state_demographics Table
```sql
model StateDemographics {
  id                   String   @id @default(cuid())
  stateCode            String   @unique
  stateName            String
  populationMultiplier Float
  incomeMultiplier     Float
  ageOffset            Int
  updatedAt            DateTime @updatedAt
}
```
- [ ] Add model to `prisma/schema.prisma`
- [ ] Run `npx prisma db push`
- [ ] Seed with all 50 states + DC from current hardcoded values
- **Dependencies:** None

---

## WAVE 2: Settings Service Layer (Can Parallelize After Wave 1)

Create the server-side services to read/write configuration.

### Task 2.1: Create Settings Service
- [ ] Create file: `src/lib/server/settings/index.ts`
- [ ] Implement `getSetting(key: string): Promise<any>`
- [ ] Implement `setSetting(key: string, value: any): Promise<void>`
- [ ] Implement `getSettingsByCategory(category: string): Promise<Record<string, any>>`
- [ ] Add caching with 5-minute TTL
- [ ] Export typed getters: `getCompanyName()`, `getSupportEmail()`, `getBillingEmail()`, etc.
- **Dependencies:** Task 1.1

### Task 2.2: Create Pricing Service
- [ ] Create file: `src/lib/server/settings/pricing.ts`
- [ ] Implement `getPricingTiers(): Promise<PricingTier[]>`
- [ ] Implement `getPricingTier(name: string): Promise<PricingTier>`
- [ ] Implement `updatePricingTier(id: string, data: Partial<PricingTier>): Promise<void>`
- [ ] Implement `createPricingTier(data: CreatePricingTierInput): Promise<PricingTier>`
- **Dependencies:** Task 1.2

### Task 2.3: Create Scoring Service
- [ ] Create file: `src/lib/server/settings/scoring.ts`
- [ ] Implement `getHealthScoreThresholds(): Promise<ScoringThreshold[]>`
- [ ] Implement `getLeadTemperatureThresholds(): Promise<ScoringThreshold[]>`
- [ ] Implement `getHealthScoreLevel(score: number): Promise<string>`
- [ ] Implement `getLeadTemperature(score: number): Promise<string>`
- [ ] Implement `updateThreshold(id: string, data: Partial<ScoringThreshold>): Promise<void>`
- **Dependencies:** Task 1.3

### Task 2.4: Create Email Template Service
- [ ] Create file: `src/lib/server/settings/email-templates.ts`
- [ ] Implement `getEmailTemplate(type: string): Promise<EmailTemplate>`
- [ ] Implement `renderEmailTemplate(type: string, variables: Record<string, any>): Promise<{subject: string, html: string, text: string}>`
- [ ] Implement `updateEmailTemplate(type: string, data: Partial<EmailTemplate>): Promise<void>`
- [ ] Support variable substitution: `{{companyName}}`, `{{supportEmail}}`, etc.
- **Dependencies:** Task 1.4

### Task 2.5: Create Onboarding Config Service
- [ ] Create file: `src/lib/server/settings/onboarding.ts`
- [ ] Implement `getOnboardingPhases(): Promise<OnboardingPhase[]>`
- [ ] Implement `getOnboardingPhase(phase: number): Promise<OnboardingPhase>`
- [ ] Implement `updateOnboardingPhase(id: string, data: Partial<OnboardingPhase>): Promise<void>`
- [ ] Implement `getTotalOnboardingDays(): Promise<number>`
- **Dependencies:** Task 1.5

### Task 2.6: Create Benchmarks Service
- [ ] Create file: `src/lib/server/settings/benchmarks.ts`
- [ ] Implement `getBenchmarks(vertical?: string): Promise<BusinessBenchmark[]>`
- [ ] Implement `getCaseValue(vertical?: string): Promise<number>`
- [ ] Implement `getConversionRate(vertical?: string): Promise<number>`
- [ ] Implement `updateBenchmark(id: string, data: Partial<BusinessBenchmark>): Promise<void>`
- **Dependencies:** Task 1.6

### Task 2.7: Create Optimization Config Service
- [ ] Create file: `src/lib/server/settings/optimization.ts`
- [ ] Implement `getOptimizationSettings(): Promise<Record<string, number>>`
- [ ] Implement `getOptimizationSetting(key: string): Promise<number>`
- [ ] Implement `updateOptimizationSetting(key: string, value: number): Promise<void>`
- **Dependencies:** Task 1.7

### Task 2.8: Create Demographics Service
- [ ] Create file: `src/lib/server/settings/demographics.ts`
- [ ] Implement `getStateDemographics(stateCode: string): Promise<StateDemographics>`
- [ ] Implement `getAllStateDemographics(): Promise<StateDemographics[]>`
- [ ] Implement `updateStateDemographics(stateCode: string, data: Partial<StateDemographics>): Promise<void>`
- **Dependencies:** Task 1.8

---

## WAVE 3A: Settings UI Pages (Can Parallelize After Wave 2)

Build the Settings UI to manage all configuration.

### Task 3A.1: Create General Settings Tab
- [ ] File: `src/routes/internal/settings/+page.svelte` (update existing)
- [ ] Add form for: Company Name, Platform Name, Support Email, Billing Email, Default Timezone, Default Currency
- [ ] Load values from `platform_settings` table
- [ ] Save changes via form action
- [ ] Show success/error toast
- **Dependencies:** Task 2.1

### Task 3A.2: Create Pricing Settings Tab
- [ ] Add new tab to settings page
- [ ] Display all pricing tiers in editable table
- [ ] Allow editing: name, price, territory size, commitment months, features
- [ ] Allow creating new tiers
- [ ] Allow deactivating tiers (soft delete)
- **Dependencies:** Task 2.2

### Task 3A.3: Create Scoring Settings Tab
- [ ] Add new tab to settings page
- [ ] Display health score thresholds with editable values
- [ ] Display lead temperature thresholds with editable values
- [ ] Color picker for each level
- [ ] Preview of how scores will display
- **Dependencies:** Task 2.3

### Task 3A.4: Create Email Templates Tab
- [ ] Add new tab to settings page
- [ ] List all email template types
- [ ] Rich text editor for HTML content
- [ ] Variable insertion buttons ({{companyName}}, {{firstName}}, etc.)
- [ ] Preview mode
- [ ] Send test email button
- **Dependencies:** Task 2.4

### Task 3A.5: Create Onboarding Settings Tab
- [ ] Add new tab to settings page
- [ ] Display phases in order
- [ ] Edit phase name, duration, tasks
- [ ] Drag-and-drop reordering
- [ ] Calculate and display total onboarding duration
- **Dependencies:** Task 2.5

### Task 3A.6: Create Benchmarks Settings Tab
- [ ] Add new tab to settings page
- [ ] Display benchmarks grouped by metric
- [ ] Edit thresholds: poor, average, good, excellent
- [ ] Edit case value and conversion rate
- [ ] Support for future verticals
- **Dependencies:** Task 2.6

### Task 3A.7: Create Optimization Settings Tab
- [ ] Add new tab to settings page
- [ ] Display all optimization thresholds
- [ ] Slider or number input for each
- [ ] Show units (%, days, impressions)
- [ ] Descriptions of what each threshold does
- **Dependencies:** Task 2.7

### Task 3A.8: Create Demographics Settings Tab
- [ ] Add new tab to settings page
- [ ] Table of all states
- [ ] Edit population multiplier, income multiplier, age offset
- [ ] Bulk import/export CSV
- [ ] Filter/search by state
- **Dependencies:** Task 2.8

---

## WAVE 3B: Replace Hardcoded Values (Can Parallelize After Wave 2)

Update all files to use database configuration instead of hardcoded values.

### Task 3B.1: Fix Encryption Key Validation
- [ ] File: `src/lib/server/integrations.ts`
- [ ] Remove fallback: `|| 'default-encryption-key-change-me!'`
- [ ] Add startup check: throw error if `ENCRYPTION_KEY` not set
- [ ] Add helpful error message with generation command
- **Dependencies:** Task 0.3

### Task 3B.2: Replace Branding Hardcodes
- [ ] File: `src/lib/server/notifications/email.ts`
- [ ] Replace all `'SqueezMedia'` with `await getSetting('company_name')`
- [ ] Replace all `'Implant Lead Engine'` with `await getSetting('platform_name')`
- [ ] Replace email footers with template variables
- **Dependencies:** Task 2.1

### Task 3B.3: Replace Email Address Hardcodes
- [ ] File: `src/lib/server/notifications/email.ts` - Replace `'noreply@squeezmedia.com'`
- [ ] File: `src/lib/server/geocoding.ts` - Replace `'contact@squeezmedia.com'`
- [ ] File: `src/routes/internal/settings/+page.server.ts` - Replace `'support@squeezmedia.com'`, `'billing@squeezmedia.com'`
- [ ] File: `src/routes/(client)/support/+page.svelte` - Replace `'support@implantleadengine.com'`
- [ ] All should use: `await getSetting('support_email')`, `await getSetting('billing_email')`, etc.
- **Dependencies:** Task 2.1

### Task 3B.4: Replace Page Titles
- [ ] File: `src/routes/(client)/+layout.svelte`
- [ ] File: `src/routes/(client)/billing/+page.svelte`
- [ ] File: `src/routes/(client)/account/+page.svelte`
- [ ] File: `src/routes/(client)/campaigns/+page.svelte`
- [ ] File: `src/routes/(client)/+page.svelte`
- [ ] File: `src/routes/(client)/support/+page.svelte`
- [ ] File: `src/routes/(auth)/login/+page.svelte`
- [ ] File: `src/routes/(client)/brand-voice/+page.svelte`
- [ ] File: `src/routes/(client)/leads/+page.svelte`
- [ ] File: `src/routes/(client)/territory/+page.svelte`
- [ ] Replace `'Implant Lead Engine'` with platform name from settings (pass via layout data)
- **Dependencies:** Task 2.1

### Task 3B.5: Replace Pricing Hardcodes
- [ ] File: `src/routes/internal/+page.server.ts` - Remove `planPrices` object
- [ ] Use `getPricingTier()` instead
- [ ] File: `src/lib/server/territory/demographics.ts` - Remove hardcoded $4,000
- [ ] Use `getCaseValue()` from benchmarks service
- **Dependencies:** Task 2.2, Task 2.6

### Task 3B.6: Replace Health Score Hardcodes
- [ ] File: `src/lib/utils/status-helpers.ts` - Replace hardcoded 85/70/50
- [ ] File: `src/lib/components/internal/HealthScoreBadge.svelte` - Replace hardcoded thresholds
- [ ] Use `getHealthScoreLevel()` from scoring service
- [ ] Pass thresholds as props or use store
- **Dependencies:** Task 2.3

### Task 3B.7: Replace Lead Temperature Hardcodes
- [ ] File: `src/lib/utils/status-helpers.ts` - Replace hardcoded 80/50
- [ ] Use `getLeadTemperature()` from scoring service
- **Dependencies:** Task 2.3

### Task 3B.8: Replace Onboarding Hardcodes
- [ ] File: `src/routes/internal/onboarding/+page.server.ts` - Remove `PHASE_DEFINITIONS`
- [ ] Use `getOnboardingPhases()` from onboarding service
- [ ] Replace hardcoded 14-day delay check with `getTotalOnboardingDays()`
- **Dependencies:** Task 2.5

### Task 3B.9: Replace Case Value Hardcodes
- [ ] File: `src/lib/server/ads/facebook.ts` - Replace `const caseValue = 4000`
- [ ] File: `src/lib/server/ads/google.ts` - Replace `const caseValue = 4000`
- [ ] File: `src/lib/server/ads/sync.ts` - Replace case value
- [ ] File: `src/lib/server/ai/campaign-factory.ts` - Replace `const avgCaseValue = 4000`
- [ ] File: `src/routes/api/campaigns/[id]/metrics/+server.ts` - Replace case value
- [ ] File: `src/routes/internal/clients/[id]/+page.server.ts` - Replace case value
- [ ] File: `src/lib/server/territory/demographics.ts` - Replace $4,500 (fix inconsistency!)
- [ ] All should use: `await getCaseValue()`
- **Dependencies:** Task 2.6

### Task 3B.10: Replace Benchmark Hardcodes
- [ ] File: `src/lib/server/ai/optimizer.ts` - Remove `BENCHMARKS` object
- [ ] Use `getBenchmarks()` from benchmarks service
- **Dependencies:** Task 2.6

### Task 3B.11: Replace Optimization Threshold Hardcodes
- [ ] File: `src/lib/server/ai/optimizer.ts` - Remove `OPTIMIZATION_THRESHOLDS` object
- [ ] Use `getOptimizationSettings()` from optimization service
- **Dependencies:** Task 2.7

### Task 3B.12: Replace Demographics Hardcodes
- [ ] File: `src/lib/server/territory/demographics.ts` - Remove `US_AVERAGES` object
- [ ] File: `src/lib/server/territory/demographics.ts` - Remove `STATE_MODIFIERS` object
- [ ] Use `getStateDemographics()` from demographics service
- [ ] Use settings for US averages
- **Dependencies:** Task 2.8

### Task 3B.13: Replace URL Hardcodes
- [ ] File: `src/routes/api/webhooks/lead-notification/+server.ts` - Replace `'https://app.squeezmedia.com'`
- [ ] File: `src/routes/(client)/account/+page.server.ts` - Replace `'https://app.squeezmedia.com'`
- [ ] Use `getSetting('app_url')` or `PUBLIC_APP_URL` env var consistently
- **Dependencies:** Task 2.1

### Task 3B.14: Replace Twilio/SMS Hardcodes
- [ ] File: `src/lib/server/twilio.ts` - Replace hardcoded SMS template
- [ ] Use email template service for SMS templates too, or create `sms_templates` table
- **Dependencies:** Task 2.4

### Task 3B.15: Replace Stripe Hardcodes
- [ ] File: `src/lib/server/stripe.ts` - Replace `'SqueezMedia Platform'` billing descriptor
- [ ] Use `await getSetting('company_name')`
- **Dependencies:** Task 2.1

### Task 3B.16: Fix Seed File Passwords
- [ ] File: `prisma/seed.ts` - Remove `DEFAULT_PASSWORD` constant
- [ ] File: `prisma/seed.ts` - Remove `console.log` with password
- [ ] File: `prisma/seed-admin.ts` - Remove hardcoded `'admin123'`
- [ ] File: `prisma/seed-admin.ts` - Remove `console.log` with password
- [ ] Use environment variable: `SEED_PASSWORD` or generate random
- [ ] Output to file instead of console if needed
- **Dependencies:** None

### Task 3B.17: Replace Budget Limit Hardcodes
- [ ] File: `src/lib/server/ads/facebook.ts` - Replace `100000` max budget
- [ ] File: `src/lib/server/ads/google.ts` - Replace `100000` max budget
- [ ] Use `await getSetting('max_daily_budget')` or add to optimization settings
- **Dependencies:** Task 2.7

### Task 3B.18: Replace Support Hours Hardcodes
- [ ] File: `src/routes/(client)/support/+page.svelte` - Replace `'Mon - Fri: 9 AM - 6 PM EST'`
- [ ] File: `src/routes/(client)/support/+page.svelte` - Replace SLA text
- [ ] File: `src/lib/server/ai/landing-generator.ts` - Replace `'within 24 business hours'`
- [ ] Use settings: `support_hours`, `sla_response_time`
- **Dependencies:** Task 2.1

### Task 3B.19: Replace Phone Number Placeholders
- [ ] File: `src/routes/(client)/support/+page.svelte` - Replace `'(800) 555-1234'`
- [ ] Use `await getSetting('support_phone')`
- **Dependencies:** Task 2.1

### Task 3B.20: Replace Landing Page Content Hardcodes
- [ ] File: `src/lib/server/ai/landing-generator.ts` - This is a large file with 25+ templates
- [ ] Create `landing_page_templates` table (new schema addition)
- [ ] Move all tone variants, CTAs, benefits, FAQs to database
- [ ] Allow editing via Settings UI
- **Dependencies:** Task 2.1, needs additional schema work

---

## WAVE 4: Role Constants Centralization (Can Parallelize After Wave 3B.16)

### Task 4.1: Create Roles Constants (Code Only - Not Settings)
- [ ] Create file: `src/lib/constants/roles.ts`
- [ ] Define: `INTERNAL_ROLES`, `CLIENT_ROLES`, `ALL_ROLES`
- [ ] Export type: `Role`
- [ ] This stays in code (roles are structural, not business config)
- **Dependencies:** None

### Task 4.2: Replace Role String Hardcodes
- [ ] Search all files for `'super_admin'`, `'admin'`, `'support'`, `'client_owner'`, `'client_admin'`, `'client_staff'`
- [ ] Replace with imports from `$lib/constants/roles`
- [ ] Files to update (partial list):
  - `src/routes/(client)/billing/+page.server.ts`
  - `src/routes/(client)/account/+page.server.ts`
  - `src/lib/stores/user.ts`
  - `src/routes/(auth)/login/+page.server.ts`
  - `src/routes/internal/settings/+page.server.ts`
- **Dependencies:** Task 4.1

---

## WAVE 5: Cleanup and Testing (After All Previous Waves)

### Task 5.1: Update .env.example
- [ ] Add all new required environment variables
- [ ] Add comments explaining each
- [ ] Remove any that are now in database
- **Dependencies:** All previous tasks

### Task 5.2: Create Settings Seed Script
- [ ] Create `prisma/seed-settings.ts`
- [ ] Seed all default platform settings
- [ ] Seed all default pricing tiers
- [ ] Seed all default thresholds
- [ ] Seed all default benchmarks
- [ ] Seed all email templates
- [ ] Seed all state demographics
- **Dependencies:** All Wave 1 tasks

### Task 5.3: Write Settings Migration Documentation
- [ ] Document all new database tables
- [ ] Document all settings keys and their purposes
- [ ] Document how to configure new deployment
- [ ] Add to `implant-lead-engine/` docs folder
- **Dependencies:** All previous tasks

### Task 5.4: Test All Settings
- [ ] Test changing company name propagates everywhere
- [ ] Test changing pricing reflects in contracts
- [ ] Test changing thresholds reflects in dashboards
- [ ] Test email templates render correctly
- [ ] Test all integrations still work
- **Dependencies:** All previous tasks

---

## Summary: Parallel Execution Guide

```
WAVE 0: Security (Sequential - Human/Single Agent)
├── Task 0.1: Rotate DB Credentials
├── Task 0.2: Remove .env from Git
└── Task 0.3: Add ENCRYPTION_KEY

WAVE 1: Database Schema (8 tasks in parallel)
├── Task 1.1: platform_settings table
├── Task 1.2: pricing_tiers table
├── Task 1.3: scoring_thresholds table
├── Task 1.4: email_templates table
├── Task 1.5: onboarding_phases table
├── Task 1.6: business_benchmarks table
├── Task 1.7: optimization_settings table
└── Task 1.8: state_demographics table

WAVE 2: Services (8 tasks in parallel, after Wave 1)
├── Task 2.1: Settings Service
├── Task 2.2: Pricing Service
├── Task 2.3: Scoring Service
├── Task 2.4: Email Template Service
├── Task 2.5: Onboarding Config Service
├── Task 2.6: Benchmarks Service
├── Task 2.7: Optimization Config Service
└── Task 2.8: Demographics Service

WAVE 3A: Settings UI (8 tasks in parallel, after Wave 2)
├── Task 3A.1: General Settings Tab
├── Task 3A.2: Pricing Settings Tab
├── Task 3A.3: Scoring Settings Tab
├── Task 3A.4: Email Templates Tab
├── Task 3A.5: Onboarding Settings Tab
├── Task 3A.6: Benchmarks Settings Tab
├── Task 3A.7: Optimization Settings Tab
└── Task 3A.8: Demographics Settings Tab

WAVE 3B: Replace Hardcodes (20 tasks in parallel, after Wave 2)
├── Task 3B.1: Fix Encryption Key
├── Task 3B.2: Replace Branding
├── Task 3B.3: Replace Emails
├── Task 3B.4: Replace Page Titles
├── Task 3B.5: Replace Pricing
├── Task 3B.6: Replace Health Scores
├── Task 3B.7: Replace Lead Temps
├── Task 3B.8: Replace Onboarding
├── Task 3B.9: Replace Case Values
├── Task 3B.10: Replace Benchmarks
├── Task 3B.11: Replace Optimization
├── Task 3B.12: Replace Demographics
├── Task 3B.13: Replace URLs
├── Task 3B.14: Replace SMS Templates
├── Task 3B.15: Replace Stripe
├── Task 3B.16: Fix Seed Passwords
├── Task 3B.17: Replace Budget Limits
├── Task 3B.18: Replace Support Hours
├── Task 3B.19: Replace Phone Numbers
└── Task 3B.20: Replace Landing Templates

WAVE 4: Roles (2 tasks in parallel)
├── Task 4.1: Create Roles Constants
└── Task 4.2: Replace Role Strings

WAVE 5: Cleanup (4 tasks, some parallel)
├── Task 5.1: Update .env.example
├── Task 5.2: Create Settings Seed
├── Task 5.3: Write Documentation
└── Task 5.4: Test All Settings
```

---

## Task Count Summary

| Wave | Tasks | Can Parallelize |
|------|-------|-----------------|
| Wave 0 | 3 | No (sequential) |
| Wave 1 | 8 | Yes |
| Wave 2 | 8 | Yes |
| Wave 3A | 8 | Yes |
| Wave 3B | 20 | Yes |
| Wave 4 | 2 | Yes |
| Wave 5 | 4 | Partial |
| **Total** | **53** | — |

---

## Quick Start for Agents

When launching agents for a wave, use this pattern:

```
Wave 1 Example - Launch 8 agents:
- Agent 1: "Create platform_settings table in Prisma schema and run db push"
- Agent 2: "Create pricing_tiers table in Prisma schema and run db push"
- Agent 3: "Create scoring_thresholds table in Prisma schema and run db push"
... etc
```

Each agent should:
1. Read this document for context
2. Complete their assigned task
3. Test that their changes work
4. Report completion

---

## Notes

- **Roles stay in code** - User roles (super_admin, admin, etc.) are structural and don't need to be in Settings. They just need to be centralized in a constants file.
- **API versions** - Facebook v18.0, Google v16, etc. can stay hardcoded or go to settings based on preference.
- **Third-party API URLs** - These can stay hardcoded (api.stripe.com, api.anthropic.com, etc.) as they rarely change.
