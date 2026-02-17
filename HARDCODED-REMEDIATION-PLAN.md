# SqueezMedia Platform - Hardcoded Values Remediation Plan

**Generated:** 2026-02-16
**Last Updated:** 2026-02-16
**Status:** ~45% Complete

---

## Overview

This document tracks all tasks required to eliminate hardcoded values from the platform. Everything business-related must be editable from the Settings UI.

**Pattern Established:** The codebase uses `SystemSetting` table for all configuration. This is a key-value JSON store that's already working well for integrations and pricing.

---

## ✅ COMPLETED TASKS

### Database Foundation
- [x] **SystemSetting table** - Created and actively used (`prisma/schema.prisma:1676-1687`)
- [x] **Territory pricing algorithm** - Database-driven with scoring weights and price tiers
- [x] **Integration configuration** - All 9 integrations (Stripe, Twilio, SendGrid, etc.) stored in SystemSetting with encryption

### Settings UI
- [x] **Settings page structure** - 5 tabs implemented: General, Notifications, Integrations, Team, Pricing
- [x] **Integrations tab** - Connect/disconnect/configure all services
- [x] **Team management tab** - Full CRUD for internal staff
- [x] **Pricing tab** - JSON editor for territory pricing algorithm

### Services
- [x] **Integration service** - `src/lib/server/integrations.ts` with AES-256-GCM encryption
- [x] **Notification preferences** - `src/lib/server/notifications/preferences.ts`
- [x] **Census data service** - `src/lib/server/census.ts` - Demographics from Census Bureau
- [x] **Lead routing service** - `src/lib/server/lead-routing.ts` - Territory assignment
- [x] **Campaign health scoring** - `src/lib/server/ai/optimizer.ts` - 0-100 scoring

### Security
- [x] **Encryption for API keys** - Using AES-256-GCM in integrations
- [x] **API key masking** - `maskApiKey()` function for display

---

## 🔴 REMAINING TASKS

### WAVE 0: CRITICAL SECURITY (Do First - Sequential)

| Task | Description | Status |
|------|-------------|--------|
| **0.1** | Rotate Neon PostgreSQL credentials (exposed in .env) | 🔴 TODO |
| **0.2** | Remove .env from git history | 🔴 TODO |
| **0.3** | Add ENCRYPTION_KEY to environment (remove hardcoded fallback) | 🔴 TODO |

**Task 0.1: Rotate Database Credentials**
- Log into Neon console
- Reset password for user `neondb_owner`
- Update `.env` locally and in Vercel
- Verify app connects

**Task 0.2: Remove .env from Git History**
```bash
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch platform/.env" --prune-empty --tag-name-filter cat -- --all
git push origin --force --all
```

**Task 0.3: Fix Encryption Key**
- File: `src/lib/server/integrations.ts:56`
- Remove: `|| 'default-encryption-key-change-me!'`
- Add startup validation to fail if not set
- Generate key: `openssl rand -hex 32`

---

### WAVE 1: Platform Settings to Database (8 tasks, parallelizable)

These settings are currently hardcoded in `src/routes/internal/settings/+page.server.ts:17-28`. Move them to SystemSetting.

| Task | Setting Key | Current Value | File |
|------|-------------|---------------|------|
| **1.1** | `platform_company_name` | 'SqueezMedia' | settings/+page.server.ts:18 |
| **1.2** | `platform_name` | 'Implant Lead Engine' | settings/+page.server.ts:19 |
| **1.3** | `support_email` | 'support@squeezmedia.com' | settings/+page.server.ts:20 |
| **1.4** | `billing_email` | 'billing@squeezmedia.com' | settings/+page.server.ts:21 |
| **1.5** | `default_timezone` | 'America/New_York' | settings/+page.server.ts:22 |
| **1.6** | `default_currency` | 'USD' | settings/+page.server.ts:23 |
| **1.7** | `max_territories_per_client` | 5 | settings/+page.server.ts:24 |
| **1.8** | `default_trial_days` | 14 | settings/+page.server.ts:25 |

**Implementation Pattern (use for all):**
```typescript
// In load function:
const companyName = await prisma.systemSetting.findUnique({
  where: { key: 'platform_company_name' }
});
const platformSettings = {
  companyName: companyName?.value ?? 'SqueezMedia',
  // ... other settings
};

// Add form action:
updatePlatformSettings: async ({ request, locals }) => {
  const data = await request.formData();
  await prisma.systemSetting.upsert({
    where: { key: 'platform_company_name' },
    update: { value: data.get('companyName'), updatedBy: locals.user.id },
    create: { key: 'platform_company_name', value: data.get('companyName'), description: 'Company name' }
  });
  // ... repeat for other settings
}
```

**Also update General Settings tab UI** to have editable form fields instead of static display.

---

### WAVE 2: Replace Hardcoded Branding (12 tasks, parallelizable after Wave 1)

After Wave 1, these files need to pull from SystemSetting instead of hardcoded strings.

| Task | File | Find | Replace With |
|------|------|------|--------------|
| **2.1** | `src/lib/server/notifications/email.ts:38` | `'SqueezMedia'` | `await getSetting('platform_company_name')` |
| **2.2** | `src/lib/server/notifications/email.ts:325` | Email footer text | Template with `{{companyName}}` |
| **2.3** | `src/lib/server/notifications/email.ts:438` | Invoice footer | Template with `{{companyName}}` |
| **2.4** | `src/lib/server/notifications/email.ts:516` | Generic footer | Template with `{{companyName}}` |
| **2.5** | `src/lib/server/notifications/email.ts:564-575` | Welcome email | Template with `{{companyName}}` |
| **2.6** | `src/lib/server/notifications/email.ts:37` | `'noreply@squeezmedia.com'` | `await getSetting('noreply_email')` |
| **2.7** | `src/lib/server/twilio.ts:138` | SMS template | Template with `{{companyName}}` |
| **2.8** | `src/lib/server/stripe.ts:27` | `'SqueezMedia Platform'` | `await getSetting('platform_company_name')` |
| **2.9** | `src/lib/server/geocoding.ts:11` | `'contact@squeezmedia.com'` | `await getSetting('support_email')` |
| **2.10** | `src/routes/(client)/support/+page.svelte:390` | `'support@implantleadengine.com'` | Load from settings |
| **2.11** | `src/routes/api/webhooks/lead-notification/+server.ts:107` | `'https://app.squeezmedia.com'` | `env.PUBLIC_APP_URL` |
| **2.12** | `src/routes/(client)/account/+page.server.ts:507` | `'https://app.squeezmedia.com'` | `env.PUBLIC_APP_URL` |

**Create helper function:**
```typescript
// src/lib/server/settings/index.ts
export async function getSetting(key: string, defaultValue?: any) {
  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  return setting?.value ?? defaultValue;
}
```

---

### WAVE 3: Replace Page Titles (10 tasks, parallelizable after Wave 1)

All page titles have hardcoded 'Implant Lead Engine'. Pass platform name via layout data.

| Task | File | Current Title |
|------|------|---------------|
| **3.1** | `src/routes/(client)/+layout.svelte:10` | `'Dashboard - Implant Lead Engine'` |
| **3.2** | `src/routes/(client)/billing/+page.svelte:69` | `'Billing - Implant Lead Engine'` |
| **3.3** | `src/routes/(client)/account/+page.svelte:125` | `'Account Settings - Implant Lead Engine'` |
| **3.4** | `src/routes/(client)/campaigns/+page.svelte:94` | `'Campaigns - Implant Lead Engine'` |
| **3.5** | `src/routes/(client)/+page.svelte:90` | `'Dashboard - Implant Lead Engine'` |
| **3.6** | `src/routes/(client)/support/+page.svelte:153` | `'Support - Implant Lead Engine'` |
| **3.7** | `src/routes/(auth)/login/+page.svelte:10` | `'Login - Implant Lead Engine'` |
| **3.8** | `src/routes/(client)/brand-voice/+page.svelte:99` | `'Brand Voice - Implant Lead Engine'` |
| **3.9** | `src/routes/(client)/leads/+page.svelte:113` | `'Leads - Implant Lead Engine'` |
| **3.10** | `src/routes/(client)/territory/+page.svelte:46` | `'Territory - Implant Lead Engine'` |

**Implementation:**
1. In `src/routes/(client)/+layout.server.ts`, load platform name and pass to layout
2. Store in Svelte store or pass via `$page.data`
3. Each page uses `$page.data.platformName` in title

---

### WAVE 4: Scoring Thresholds to Database (4 tasks, parallelizable)

Move hardcoded scoring thresholds to SystemSetting.

| Task | Type | Current Location | Values |
|------|------|------------------|--------|
| **4.1** | Health Score | `src/lib/utils/status-helpers.ts:21-24` | 85/70/50 |
| **4.2** | Lead Temperature | `src/lib/utils/status-helpers.ts:104-105` | 80/50 |
| **4.3** | Campaign Benchmarks | `src/lib/server/ai/optimizer.ts:20-26` | CTR/CPL/Conv |
| **4.4** | Optimization Thresholds | `src/lib/server/ai/optimizer.ts:28-34` | Various % |

**SystemSetting keys to create:**
- `scoring_health_thresholds` - `{ excellent: 85, good: 70, warning: 50 }`
- `scoring_lead_temperature` - `{ hot: 80, warm: 50 }`
- `benchmarks_dental_implants` - `{ ctr: {...}, cpl: {...}, conversionRate: {...} }`
- `optimization_thresholds` - `{ ctrDropPercent: 20, cplIncreasePercent: 25, ... }`

**Add Settings UI:** Create "Scoring & Benchmarks" tab in internal settings.

---

### WAVE 5: Additional Configuration (6 tasks, parallelizable)

| Task | Description | Priority |
|------|-------------|----------|
| **5.1** | Create Onboarding Phases settings tab | Medium |
| **5.2** | Create Email Templates management | Low |
| **5.3** | Connect Organization health scores to database | High |
| **5.4** | Implement API Key management (model exists, needs completion) | Medium |
| **5.5** | Support hours/SLA settings | Medium |
| **5.6** | Budget limits configuration | Low |

**Task 5.1: Onboarding Phases**
- SystemSetting key: `onboarding_phases`
- Value: `[{ phase: 1, name: 'Account Setup', days: 2, tasks: [...] }, ...]`
- Update `src/routes/internal/onboarding/+page.server.ts` to load from database

**Task 5.3: Organization Health Scores**
- Create service: `src/lib/server/health-scores.ts`
- Aggregate campaign health to organization level
- Use factors from CLAUDE.md: Lead volume (25), Cost efficiency (25), Engagement (20), Support (15), Renewal (15)
- Store in HealthScoreHistory table (already exists)

---

### WAVE 6: Code Cleanup (5 tasks, parallelizable)

| Task | Description |
|------|-------------|
| **6.1** | Create `src/lib/constants/roles.ts` - centralize role strings |
| **6.2** | Create `src/lib/constants/settings.ts` - export SystemSetting keys |
| **6.3** | Fix seed file passwords (remove console.log, use env vars) |
| **6.4** | Update `.env.example` with all new variables |
| **6.5** | Create settings seed script with defaults |

**Task 6.1: Roles Constants**
```typescript
// src/lib/constants/roles.ts
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  SUPPORT: 'support',
  CLIENT_OWNER: 'client_owner',
  CLIENT_ADMIN: 'client_admin',
  CLIENT_STAFF: 'client_staff'
} as const;

export const INTERNAL_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPPORT] as const;
export const CLIENT_ROLES = [ROLES.CLIENT_OWNER, ROLES.CLIENT_ADMIN, ROLES.CLIENT_STAFF] as const;
```

**Task 6.2: Settings Keys Constants**
```typescript
// src/lib/constants/settings.ts
export const SETTINGS = {
  COMPANY_NAME: 'platform_company_name',
  PLATFORM_NAME: 'platform_name',
  SUPPORT_EMAIL: 'support_email',
  BILLING_EMAIL: 'billing_email',
  TERRITORY_PRICING: 'territory_pricing',
  HEALTH_THRESHOLDS: 'scoring_health_thresholds',
  LEAD_TEMPERATURE: 'scoring_lead_temperature',
  // ... etc
} as const;
```

---

## Summary: Task Counts by Wave

| Wave | Description | Tasks | Can Parallelize | Status |
|------|-------------|-------|-----------------|--------|
| **0** | Critical Security | 3 | No (sequential) | 🔴 TODO |
| **1** | Platform Settings to DB | 8 | Yes | 🔴 TODO |
| **2** | Replace Branding | 12 | Yes (after Wave 1) | 🔴 TODO |
| **3** | Replace Page Titles | 10 | Yes (after Wave 1) | 🔴 TODO |
| **4** | Scoring to Database | 4 | Yes | 🔴 TODO |
| **5** | Additional Config | 6 | Yes | 🔴 TODO |
| **6** | Code Cleanup | 5 | Yes | 🔴 TODO |
| **TOTAL** | | **48** | | |

---

## Quick Reference: What's Already Working

| Feature | Location | Status |
|---------|----------|--------|
| SystemSetting table | `prisma/schema.prisma` | ✅ Active |
| Territory pricing | `settings/+page.server.ts` | ✅ Complete |
| Integration config | `lib/server/integrations.ts` | ✅ Complete |
| Team management | `settings/+page.server.ts` | ✅ Complete |
| Notification prefs | `lib/server/notifications/preferences.ts` | ✅ Complete |
| Census demographics | `lib/server/census.ts` | ✅ Complete |
| Lead routing | `lib/server/lead-routing.ts` | ✅ Complete |
| Campaign health | `lib/server/ai/optimizer.ts` | ✅ Active |

---

## Agent Execution Guide

### Wave 0 (Human/Single Agent - Sequential)
```
Do these in order:
1. Rotate database credentials
2. Clean git history
3. Fix encryption key
```

### Wave 1 (8 Parallel Agents)
```
Agent 1: "Move platform_company_name to SystemSetting and update General tab UI"
Agent 2: "Move platform_name to SystemSetting"
Agent 3: "Move support_email to SystemSetting"
... etc
```

### Wave 2 (12 Parallel Agents - After Wave 1)
```
Agent 1: "Replace 'SqueezMedia' in email.ts:38 with getSetting()"
Agent 2: "Replace email footer in email.ts:325 with template"
... etc
```

### Wave 3-6 (Similar pattern)

Each agent should:
1. Read this document for context
2. Check `src/lib/server/settings/index.ts` for existing helper functions
3. Follow the established SystemSetting pattern
4. Test changes work
5. Report completion
