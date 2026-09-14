/**
 * Mirrors apps/backend/src/webhook/constants/webhook-events.constants.ts.
 * Keep in sync when new events are added to the backend.
 */

export interface EventDef {
	value: string;
	name: string;
	category: string;
	description?: string;
}

/** High-value events exposed in the initial release. */
export const SO_ME_EVENTS: EventDef[] = [
	{ value: 'post.created', name: 'Post Created', category: 'Post' },
	{ value: 'post.published', name: 'Post Published', category: 'Post' },
	{ value: 'post.failed', name: 'Post Failed', category: 'Post' },
	{ value: 'post.scheduled', name: 'Post Scheduled', category: 'Post' },
	{ value: 'draft.converted', name: 'Draft Converted to Post', category: 'Draft' },
	{ value: 'quota.limit_reached', name: 'Quota Limit Reached', category: 'Quota' },
];

export function eventOptionsForTrigger(): { name: string; value: string }[] {
	return SO_ME_EVENTS.map((e) => ({
		name: `${e.category}: ${e.name}`,
		value: e.value,
	}));
}

/**
 * Maps event prefixes to backend WebhookCategory values.
 * The backend requires categories[] on subscription create.
 */
const EVENT_PREFIX_TO_CATEGORY: Record<string, string> = {
	post: 'post',
	draft: 'draft',
	inbox: 'inbox',
	media: 'media',
	ai: 'ai',
	analytics: 'analytics',
	social: 'social',
	composer: 'composer',
	biolink: 'biolink',
	team: 'team',
	organization: 'organization',
	account: 'account',
	auth: 'auth',
	api_key: 'api_key',
	webhook: 'webhook',
	integration: 'integration',
	subscription: 'subscription',
	support: 'support',
	template: 'template',
	referral: 'referral',
	mcp: 'mcp',
	quota: 'quota',
};

export function categoriesForEvents(events: string[]): string[] {
	const out = new Set<string>();
	for (const event of events) {
		const prefix = event.split('.')[0];
		const category = EVENT_PREFIX_TO_CATEGORY[prefix];
		if (category) out.add(category);
	}
	return Array.from(out);
}
