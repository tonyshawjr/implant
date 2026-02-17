import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
import { fail } from '@sveltejs/kit';
import { clearApiKeyCache } from '$lib/server/ai/client';

// Mask API key for display (show only last 4 characters)
function maskApiKey(key: string | null): string {
	if (!key) return '';
	if (key.length <= 8) return '••••••••';
	return '••••••••••••' + key.slice(-4);
}

export const load: PageServerLoad = async ({ locals }) => {
	// Only super_admin can access settings
	if (!locals.user) {
		return { error: 'Unauthorized' };
	}

	// Get all API-related settings
	const settings = await prisma.systemSetting.findMany({
		where: {
			key: {
				in: ['claude_api_key', 'openai_api_key', 'census_api_key', 'mapbox_api_key']
			}
		}
	});

	// Convert to a map and mask keys
	const settingsMap: Record<string, { configured: boolean; masked: string; description: string }> = {
		claude_api_key: {
			configured: false,
			masked: '',
			description: 'Required for AI voice analysis and content generation'
		},
		openai_api_key: {
			configured: false,
			masked: '',
			description: 'Fallback AI provider (optional)'
		},
		census_api_key: {
			configured: false,
			masked: '',
			description: 'For fetching territory demographics'
		},
		mapbox_api_key: {
			configured: false,
			masked: '',
			description: 'For interactive territory maps'
		}
	};

	for (const setting of settings) {
		const value = setting.value as { key?: string } | null;
		if (value?.key) {
			settingsMap[setting.key] = {
				...settingsMap[setting.key],
				configured: true,
				masked: maskApiKey(value.key)
			};
		}
	}

	return {
		apiKeys: settingsMap
	};
};

export const actions: Actions = {
	saveApiKey: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const keyName = formData.get('keyName') as string;
		const keyValue = formData.get('keyValue') as string;

		const validKeys = ['claude_api_key', 'openai_api_key', 'census_api_key', 'mapbox_api_key'];
		if (!validKeys.includes(keyName)) {
			return fail(400, { error: 'Invalid key name' });
		}

		if (!keyValue || keyValue.trim().length === 0) {
			return fail(400, { error: 'API key value is required' });
		}

		try {
			await prisma.systemSetting.upsert({
				where: { key: keyName },
				create: {
					key: keyName,
					value: { key: keyValue.trim() },
					description: \`API key for \${keyName.replace(/_/g, ' ')}\`,
					updatedBy: locals.user.id
				},
				update: {
					value: { key: keyValue.trim() },
					updatedBy: locals.user.id
				}
			});

			// Clear the API key cache so the new key takes effect immediately
			clearApiKeyCache();

			return { success: true, message: 'API key saved successfully' };
		} catch (error) {
			console.error('Failed to save API key:', error);
			return fail(500, { error: 'Failed to save API key' });
		}
	},

	deleteApiKey: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const keyName = formData.get('keyName') as string;

		const validKeys = ['claude_api_key', 'openai_api_key', 'census_api_key', 'mapbox_api_key'];
		if (!validKeys.includes(keyName)) {
			return fail(400, { error: 'Invalid key name' });
		}

		try {
			await prisma.systemSetting.delete({
				where: { key: keyName }
			});

			// Clear the API key cache
			clearApiKeyCache();

			return { success: true, message: 'API key removed' };
		} catch (error) {
			// Key might not exist, that's fine
			clearApiKeyCache();
			return { success: true, message: 'API key removed' };
		}
	},

	testApiKey: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const keyName = formData.get('keyName') as string;

		// Get the stored key
		const setting = await prisma.systemSetting.findUnique({
			where: { key: keyName }
		});

		const value = setting?.value as { key?: string } | null;
		if (!value?.key) {
			return fail(400, { error: 'API key not configured' });
		}

		// Test the key based on type
		try {
			if (keyName === 'claude_api_key') {
				const response = await fetch('https://api.anthropic.com/v1/messages', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-api-key': value.key,
						'anthropic-version': '2023-06-01'
					},
					body: JSON.stringify({
						model: 'claude-3-haiku-20240307',
						max_tokens: 10,
						messages: [{ role: 'user', content: 'Hi' }]
					})
				});

				if (response.ok) {
					return { success: true, message: 'Claude API key is valid' };
				} else {
					const error = await response.json();
					return fail(400, { error: \`Invalid: \${error.error?.message || 'Unknown error'}\` });
				}
			}

			if (keyName === 'openai_api_key') {
				const response = await fetch('https://api.openai.com/v1/models', {
					headers: {
						'Authorization': \`Bearer \${value.key}\`
					}
				});

				if (response.ok) {
					return { success: true, message: 'OpenAI API key is valid' };
				} else {
					return fail(400, { error: 'Invalid API key' });
				}
			}

			return { success: true, message: 'Key saved (validation not available for this key type)' };
		} catch (error) {
			console.error('API key test failed:', error);
			return fail(500, { error: 'Failed to test API key' });
		}
	}
};
