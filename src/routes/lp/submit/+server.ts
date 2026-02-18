import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

function formatQuizAnswers(fields: Record<string, unknown>): string {
	const lines = Object.entries(fields).map(([key, value]) => {
		// Convert kebab-case/snake_case keys to Title Case
		const label = key
			.replace(/[-_]/g, ' ')
			.replace(/\b\w/g, (c) => c.toUpperCase());
		// Convert kebab-case/snake_case values to readable text
		const val = String(value).replace(/[-_]/g, ' ');
		return `${label}: ${val}`;
	});
	return `Quiz Answers:\n${lines.join('\n')}`;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();

		// Extract form fields
		const firstName = formData.get('firstName') as string;
		const lastName = formData.get('lastName') as string;
		const email = formData.get('email') as string;
		const phone = formData.get('phone') as string;

		// Extract hidden fields
		const organizationId = formData.get('organization_id') as string;
		const landingPageId = formData.get('landing_page_id') as string;

		// Extract UTM parameters
		const utmSource = formData.get('utm_source') as string | null;
		const utmMedium = formData.get('utm_medium') as string | null;
		const utmCampaign = formData.get('utm_campaign') as string | null;

		// Extract quiz answers (stored as JSON string)
		const answersRaw = formData.get('answers') as string | null;
		let customFields: Record<string, unknown> = {};

		if (answersRaw) {
			try {
				customFields = JSON.parse(answersRaw);
			} catch {
				// If parsing fails, store as raw string
				customFields = { quizAnswers: answersRaw };
			}
		}

		// Validate required fields
		if (!firstName || !lastName || !email || !phone) {
			return json(
				{ success: false, error: 'Missing required fields' },
				{ status: 400 }
			);
		}

		if (!organizationId || !landingPageId) {
			return json(
				{ success: false, error: 'Missing organization or landing page ID' },
				{ status: 400 }
			);
		}

		// Verify the organization exists
		const organization = await prisma.organization.findUnique({
			where: { id: organizationId },
			select: { id: true, status: true }
		});

		if (!organization) {
			return json(
				{ success: false, error: 'Organization not found' },
				{ status: 400 }
			);
		}

		// Verify the landing page exists (allow both published and draft)
		const landingPage = await prisma.landingPage.findUnique({
			where: { id: landingPageId },
			select: { id: true, name: true, campaignId: true, status: true }
		});

		if (!landingPage) {
			return json(
				{ success: false, error: 'Landing page not found' },
				{ status: 400 }
			);
		}

		// Create the lead record
		const lead = await prisma.lead.create({
			data: {
				organizationId,
				campaignId: landingPage.campaignId,
				firstName,
				lastName,
				email,
				phone,
				source: 'website',
				sourceDetail: `Landing Page: ${landingPage.name || landingPageId}`,
				status: 'new',
				temperature: 'warm',
				utmSource: utmSource || undefined,
				utmMedium: utmMedium || undefined,
				utmCampaign: utmCampaign || undefined,
				notes: customFields && Object.keys(customFields).length > 0
					? formatQuizAnswers(customFields)
					: undefined
			}
		});

		// Increment landing page submission count
		await prisma.landingPage.update({
			where: { id: landingPageId },
			data: {
				submissionCount: { increment: 1 }
			}
		});

		// Calculate and update conversion rate
		const updatedLandingPage = await prisma.landingPage.findUnique({
			where: { id: landingPageId },
			select: { viewCount: true, submissionCount: true }
		});

		if (updatedLandingPage && updatedLandingPage.viewCount > 0) {
			const conversionRate = (updatedLandingPage.submissionCount / updatedLandingPage.viewCount) * 100;
			await prisma.landingPage.update({
				where: { id: landingPageId },
				data: { conversionRate }
			});
		}

		return json({
			success: true,
			leadId: lead.id,
			message: 'Lead submitted successfully'
		});
	} catch (err) {
		console.error('Error processing lead submission:', err);
		return json(
			{ success: false, error: 'Failed to process submission' },
			{ status: 500 }
		);
	}
};
