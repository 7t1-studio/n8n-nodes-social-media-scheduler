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

export const SO_ME_EVENTS: EventDef[] = [
	// Posts
	{ value: 'post.created', name: 'Post Created', category: 'Post' },
	{ value: 'post.updated', name: 'Post Updated', category: 'Post' },
	{ value: 'post.deleted', name: 'Post Deleted', category: 'Post' },
	{ value: 'post.bulk_deleted', name: 'Post Bulk Deleted', category: 'Post' },
	{ value: 'post.published', name: 'Post Published', category: 'Post' },
	{ value: 'post.failed', name: 'Post Failed', category: 'Post' },
	{ value: 'post.retried', name: 'Post Retried', category: 'Post' },
	{ value: 'post.scheduled', name: 'Post Scheduled', category: 'Post' },
	{ value: 'post.unscheduled', name: 'Post Unscheduled', category: 'Post' },
	{ value: 'post.resubmitted', name: 'Post Resubmitted', category: 'Post' },

	// Drafts
	{ value: 'draft.created', name: 'Draft Created', category: 'Draft' },
	{ value: 'draft.updated', name: 'Draft Updated', category: 'Draft' },
	{ value: 'draft.deleted', name: 'Draft Deleted', category: 'Draft' },
	{ value: 'draft.converted', name: 'Draft Converted to Post', category: 'Draft' },

	// Inbox & comments
	{ value: 'inbox.message_received', name: 'Inbox: Message Received', category: 'Inbox' },
	{ value: 'inbox.message_sent', name: 'Inbox: Message Sent', category: 'Inbox' },
	{ value: 'inbox.conversation_created', name: 'Inbox: Conversation Created', category: 'Inbox' },
	{ value: 'inbox.conversation_updated', name: 'Inbox: Conversation Updated', category: 'Inbox' },
	{ value: 'inbox.conversation_resolved', name: 'Inbox: Conversation Resolved', category: 'Inbox' },
	{ value: 'inbox.conversation_archived', name: 'Inbox: Conversation Archived', category: 'Inbox' },
	{ value: 'inbox.conversation_deleted', name: 'Inbox: Conversation Deleted', category: 'Inbox' },
	{ value: 'inbox.comment_received', name: 'Inbox: Comment Received', category: 'Inbox' },
	{ value: 'inbox.comment_hidden', name: 'Inbox: Comment Hidden', category: 'Inbox' },
	{ value: 'inbox.saved_reply_created', name: 'Saved Reply Created', category: 'Inbox' },
	{ value: 'inbox.saved_reply_updated', name: 'Saved Reply Updated', category: 'Inbox' },
	{ value: 'inbox.saved_reply_deleted', name: 'Saved Reply Deleted', category: 'Inbox' },

	// Media
	{ value: 'media.uploaded', name: 'Media Uploaded', category: 'Media' },
	{ value: 'media.deleted', name: 'Media Deleted', category: 'Media' },
	{ value: 'media.bulk_deleted', name: 'Media Bulk Deleted', category: 'Media' },
	{ value: 'media.moved', name: 'Media Moved', category: 'Media' },
	{ value: 'media.canva_imported', name: 'Media Imported From Canva', category: 'Media' },
	{ value: 'media.folder_created', name: 'Folder Created', category: 'Media' },
	{ value: 'media.folder_renamed', name: 'Folder Renamed', category: 'Media' },
	{ value: 'media.folder_deleted', name: 'Folder Deleted', category: 'Media' },
	{ value: 'media.folder_moved', name: 'Folder Moved', category: 'Media' },

	// AI
	{ value: 'ai.text_generated', name: 'AI Text Generated', category: 'AI' },
	{ value: 'ai.text_failed', name: 'AI Text Failed', category: 'AI' },
	{ value: 'ai.caption_generated', name: 'AI Caption Generated', category: 'AI' },
	{ value: 'ai.image_generated', name: 'AI Image Generated', category: 'AI' },
	{ value: 'ai.image_failed', name: 'AI Image Failed', category: 'AI' },
	{ value: 'ai.image_deleted', name: 'AI Image Deleted', category: 'AI' },
	{ value: 'ai.video_generated', name: 'AI Video Generated', category: 'AI' },
	{ value: 'ai.video_failed', name: 'AI Video Failed', category: 'AI' },

	// Analytics
	{ value: 'analytics.report_generated', name: 'Analytics Report Generated', category: 'Analytics' },

	// Social accounts
	{ value: 'social.account_connected', name: 'Social Account Connected', category: 'Social Account' },
	{ value: 'social.account_disconnected', name: 'Social Account Disconnected', category: 'Social Account' },
	{ value: 'social.account_token_refreshed', name: 'Social Account Token Refreshed', category: 'Social Account' },

	// Quota
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
