import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { getTemplateBySlug, renderFunnelHtml, funnelTemplates } from '$lib/server/landing-pages/templates';

export const load: PageServerLoad = async ({ params, url }) => {
	const { slug } = params;
	const isPreview = url.searchParams.get('preview') === 'true';

	// Load landing page by slug
	// Allow draft pages in preview mode
	const landingPage = await prisma.landingPage.findFirst({
		where: {
			slug,
			status: isPreview ? { in: ['published', 'draft'] } : 'published'
		},
		select: {
			id: true,
			name: true,
			slug: true,
			config: true,
			trackingPixels: true,
			templateId: true,
			template: {
				select: {
					id: true,
					slug: true,
					name: true
				}
			},
			organization: {
				select: {
					id: true,
					name: true,
					slug: true,
					logoUrl: true,
					phone: true,
					city: true,
					state: true,
					addressLine1: true,
					status: true
				}
			}
		}
	});

	// Return 404 if landing page not found or not published
	if (!landingPage) {
		throw error(404, {
			message: 'Landing page not found'
		});
	}

	// Check if organization is active (allow onboarding for preview)
	const allowedStatuses = isPreview ? ['active', 'onboarding'] : ['active'];
	if (!allowedStatuses.includes(landingPage.organization.status)) {
		throw error(404, {
			message: 'Landing page not available'
		});
	}

	// Get the funnel template - check config first, then template relation, then slug
	const config = landingPage.config as Record<string, unknown> | null;
	const templateSlug = (config?.templateSlug as string) || landingPage.template?.slug || landingPage.slug;

	let funnelTemplate = getTemplateBySlug(templateSlug);

	// If no template found by slug, use the first template as fallback
	if (!funnelTemplate) {
		funnelTemplate = funnelTemplates[0];
	}

	// Extract tracking pixels as HTML string
	const trackingPixels = landingPage.trackingPixels as Array<{ type: string; id: string }> | null;
	let trackingHtml = '';

	if (trackingPixels && trackingPixels.length > 0) {
		trackingPixels.forEach((pixel) => {
			if (pixel.type === 'facebook' && pixel.id) {
				trackingHtml += `
					<script>
						!function(f,b,e,v,n,t,s)
						{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
						n.callMethod.apply(n,arguments):n.queue.push(arguments)};
						if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
						n.queue=[];t=b.createElement(e);t.async=!0;
						t.src=v;s=b.getElementsByTagName(e)[0];
						s.parentNode.insertBefore(t,s)}(window, document,'script',
						'https://connect.facebook.net/en_US/fbevents.js');
						fbq('init', '${pixel.id}');
						fbq('track', 'PageView');
					</script>
					<noscript>
						<img height="1" width="1" style="display:none"
							src="https://www.facebook.com/tr?id=${pixel.id}&ev=PageView&noscript=1" alt=""/>
					</noscript>
				`;
			}
			if (pixel.type === 'google' && pixel.id) {
				trackingHtml += `
					<script async src="https://www.googletagmanager.com/gtag/js?id=${pixel.id}"></script>
					<script>
						window.dataLayer = window.dataLayer || [];
						function gtag(){dataLayer.push(arguments);}
						gtag('js', new Date());
						gtag('config', '${pixel.id}');
					</script>
				`;
			}
		});
	}

	// Prepare organization data for rendering
	const orgData = {
		id: landingPage.organization.id,
		name: landingPage.organization.name,
		phone: landingPage.organization.phone || '',
		city: landingPage.organization.city || '',
		state: landingPage.organization.state || '',
		logoUrl: landingPage.organization.logoUrl || undefined,
		address: landingPage.organization.addressLine1 || undefined
	};

	// Render the funnel HTML
	const html = renderFunnelHtml(funnelTemplate, orgData, landingPage.id, trackingHtml);

	// Increment view count (fire and forget - don't await)
	// Skip for preview mode to avoid skewing stats
	if (!isPreview) {
		prisma.landingPage.update({
			where: { id: landingPage.id },
			data: { viewCount: { increment: 1 } }
		}).catch((err) => {
			console.error('Failed to increment view count:', err);
		});
	}

	return {
		html,
		landingPage: {
			id: landingPage.id,
			name: landingPage.name,
			slug: landingPage.slug
		},
		organization: {
			id: landingPage.organization.id,
			name: landingPage.organization.name
		}
	};
};
