import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { getTemplateBySlug, renderFunnelHtml } from '$lib/server/landing-pages/templates';

export const GET: RequestHandler = async ({ params, url }) => {
	const { slug } = params;
	const isPreview = url.searchParams.get('preview') === 'true';

	// Load landing page by slug
	const landingPage = await prisma.landingPage.findFirst({
		where: {
			slug,
			...(isPreview ? {} : { status: 'published' })
		},
		include: {
			template: {
				select: {
					slug: true
				}
			},
			organization: {
				select: {
					id: true,
					name: true,
					phone: true,
					email: true,
					website: true,
					logoUrl: true,
					city: true,
					state: true,
					status: true
				}
			}
		}
	});

	if (!landingPage) {
		return new Response('Landing page not found', { status: 404 });
	}

	// Check if organization is active
	if (landingPage.organization.status !== 'active') {
		return new Response('Landing page not available', { status: 404 });
	}

	// Increment view count (fire and forget)
	prisma.landingPage.update({
		where: { id: landingPage.id },
		data: { viewCount: { increment: 1 } }
	}).catch((err) => {
		console.error('Failed to increment view count:', err);
	});

	// Get the funnel template by its slug
	const templateSlug = landingPage.template?.slug;
	const funnelTemplate = templateSlug ? getTemplateBySlug(templateSlug) : null;

	if (!funnelTemplate) {
		// If no funnel template, fall back to custom HTML if available
		if (landingPage.customHtml) {
			return new Response(landingPage.customHtml, {
				headers: { 'Content-Type': 'text/html; charset=utf-8' }
			});
		}
		return new Response('Landing page template not found', { status: 404 });
	}

	// Build tracking pixels string from JSON
	let trackingPixels = '';
	if (landingPage.trackingPixels) {
		const pixels = landingPage.trackingPixels as Record<string, string>;
		if (pixels.facebook) {
			trackingPixels += `<!-- Facebook Pixel -->\n${pixels.facebook}\n`;
		}
		if (pixels.google) {
			trackingPixels += `<!-- Google Tag -->\n${pixels.google}\n`;
		}
		if (pixels.custom) {
			trackingPixels += `<!-- Custom Tracking -->\n${pixels.custom}\n`;
		}
	}

	// Render the full funnel HTML
	const html = renderFunnelHtml(
		funnelTemplate,
		{
			id: landingPage.organization.id,
			name: landingPage.organization.name,
			phone: landingPage.organization.phone || '',
			city: landingPage.organization.city || '',
			state: landingPage.organization.state || '',
			logoUrl: landingPage.organization.logoUrl || undefined,
		},
		landingPage.id,
		trackingPixels
	);

	return new Response(html, {
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Cache-Control': isPreview ? 'no-store' : 'public, max-age=300'
		}
	});
};
