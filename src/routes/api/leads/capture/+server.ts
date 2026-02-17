import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { LeadSource, LeadTemperature, InsuranceStatus } from '@prisma/client';

interface LeadCaptureRequest {
  organization_id: string;
  landing_page_id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  insurance?: string | null;
  notes?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  custom_fields?: Record<string, unknown>;
}

/**
 * Calculate lead score based on form data
 * Returns score (0-100) and temperature (hot/warm/cold)
 */
function calculateLeadScore(data: LeadCaptureRequest): { score: number; temperature: LeadTemperature } {
  let score = 0;

  // Full name provided: +5 points
  if (data.first_name && data.first_name.trim()) {
    score += 5;
  }

  // Email provided: +5 points
  if (data.email && data.email.trim()) {
    score += 5;
  }

  // Phone provided: +10 points (most valuable contact method)
  if (data.phone && data.phone.trim()) {
    score += 10;
  }

  // Insurance status scoring
  if (data.insurance) {
    const insuranceLower = data.insurance.toLowerCase();
    if (insuranceLower === 'yes' || insuranceLower.includes('yes')) {
      score += 15; // Has insurance - most qualified
    } else if (insuranceLower === 'not sure' || insuranceLower.includes('not sure')) {
      score += 8; // Uncertain - still potential
    }
    // No insurance = 0 additional points, but still a valid lead
  }

  // Notes/message provided: +5 points (shows engagement)
  if (data.notes && data.notes.trim()) {
    score += 5;
  }

  // Base score for submitting the form
  score += 40;

  // Bonus for complete contact info
  if (data.email && data.phone && data.first_name) {
    score += 10;
  }

  // Calculate temperature
  let temperature: LeadTemperature;
  if (score >= 80) {
    temperature = 'hot';
  } else if (score >= 50) {
    temperature = 'warm';
  } else {
    temperature = 'cold';
  }

  return { score: Math.min(score, 100), temperature };
}

/**
 * Map insurance string to InsuranceStatus enum
 */
function mapInsuranceStatus(insurance: string | null | undefined): InsuranceStatus | null {
  if (!insurance) return null;

  const insuranceLower = insurance.toLowerCase();
  if (insuranceLower === 'yes' || insuranceLower.includes('yes')) {
    return 'has_insurance';
  } else if (insuranceLower === 'no' || insuranceLower.includes('no')) {
    return 'no_insurance';
  }
  return 'unknown';
}

/**
 * Determine lead source from UTM parameters
 */
function determineLeadSource(data: LeadCaptureRequest): LeadSource {
  const utmSource = data.utm_source?.toLowerCase();
  const utmMedium = data.utm_medium?.toLowerCase();

  if (utmSource === 'facebook' || utmSource === 'fb' || utmMedium === 'facebook') {
    return 'facebook';
  }
  if (utmSource === 'instagram' || utmSource === 'ig' || utmMedium === 'instagram') {
    return 'instagram';
  }
  if (utmSource === 'google' || utmSource === 'adwords' || utmMedium === 'cpc' || utmMedium === 'ppc') {
    return 'google';
  }
  if (utmSource === 'referral' || utmMedium === 'referral') {
    return 'referral';
  }

  // Default to website for organic landing page visits
  return 'website';
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = (await request.json()) as LeadCaptureRequest;

    // Validate required fields
    if (!body.organization_id) {
      return json({ error: 'Missing organization_id' }, { status: 400 });
    }

    if (!body.landing_page_id) {
      return json({ error: 'Missing landing_page_id' }, { status: 400 });
    }

    // Must have at least one contact method
    if (!body.email && !body.phone) {
      return json({ error: 'Please provide either an email or phone number' }, { status: 400 });
    }

    // Validate organization exists and is active
    const organization = await prisma.organization.findFirst({
      where: {
        id: body.organization_id,
        status: 'active',
        deletedAt: null
      },
      select: {
        id: true,
        name: true
      }
    });

    if (!organization) {
      return json({ error: 'Organization not found or inactive' }, { status: 404 });
    }

    // Validate landing page exists
    const landingPage = await prisma.landingPage.findFirst({
      where: {
        id: body.landing_page_id,
        organizationId: body.organization_id
      },
      select: {
        id: true,
        name: true,
        campaignId: true,
        campaign: {
          select: {
            territoryId: true
          }
        }
      }
    });

    if (!landingPage) {
      return json({ error: 'Landing page not found' }, { status: 404 });
    }

    // Calculate lead score and temperature
    const { score, temperature } = calculateLeadScore(body);

    // Determine lead source
    const source = determineLeadSource(body);

    // Map insurance status
    const insuranceStatus = mapInsuranceStatus(body.insurance);

    // Build source detail string
    const sourceDetails: string[] = [];
    if (body.utm_source) sourceDetails.push(`source:${body.utm_source}`);
    if (body.utm_medium) sourceDetails.push(`medium:${body.utm_medium}`);
    if (body.utm_campaign) sourceDetails.push(`campaign:${body.utm_campaign}`);
    const sourceDetail = sourceDetails.length > 0 ? sourceDetails.join(', ') : `Landing page: ${landingPage.name}`;

    // Create the lead
    const lead = await prisma.lead.create({
      data: {
        organizationId: body.organization_id,
        campaignId: landingPage.campaignId,
        territoryId: landingPage.campaign?.territoryId,
        firstName: body.first_name?.trim() || null,
        lastName: body.last_name?.trim() || null,
        email: body.email?.trim().toLowerCase() || null,
        phone: body.phone?.trim() || null,
        source,
        sourceDetail,
        status: 'new',
        temperature,
        score,
        insuranceStatus,
        insuranceDetails: body.insurance || null,
        notes: body.notes?.trim() || null,
        utmSource: body.utm_source || null,
        utmMedium: body.utm_medium || null,
        utmCampaign: body.utm_campaign || null,
        utmContent: body.utm_content || null
      }
    });

    // Create initial lead activity for form submission
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        activityType: 'note',
        subject: 'Lead captured from landing page',
        body: `Lead submitted form on landing page "${landingPage.name}". ` +
          `Initial score: ${score}, Temperature: ${temperature}. ` +
          (body.custom_fields && Object.keys(body.custom_fields).length > 0
            ? `Additional data: ${JSON.stringify(body.custom_fields)}`
            : '')
      }
    });

    // Increment submission count on landing page (fire and forget)
    prisma.landingPage.update({
      where: { id: landingPage.id },
      data: { submissionCount: { increment: 1 } }
    }).catch((err) => {
      console.error('Failed to increment submission count:', err);
    });

    // TODO: Trigger lead notification webhook
    // This would call the /api/webhooks/lead-notification endpoint
    // to send SMS and email notifications to the organization's team

    // Log to audit trail
    await prisma.auditLog.create({
      data: {
        action: 'lead_captured',
        entityType: 'lead',
        entityId: lead.id,
        organizationId: body.organization_id,
        newValues: {
          source,
          temperature,
          score,
          landing_page_id: body.landing_page_id,
          utm_source: body.utm_source,
          utm_medium: body.utm_medium,
          utm_campaign: body.utm_campaign
        }
      }
    });

    return json({
      success: true,
      lead_id: lead.id,
      temperature,
      score
    });

  } catch (error) {
    console.error('Lead capture error:', error);

    // Check for duplicate email within same organization (if needed)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return json({
        error: 'A request has already been submitted with this information'
      }, { status: 409 });
    }

    return json({
      error: 'An error occurred while processing your request'
    }, { status: 500 });
  }
};

/**
 * Health check endpoint
 */
export const GET: RequestHandler = async () => {
  return json({
    status: 'ok',
    endpoint: 'lead-capture',
    timestamp: new Date().toISOString()
  });
};
