/**
 * Mirrors apps/backend/src/main/types/enum.ts.
 * Update both when enums change. Keep each list sorted by name, as the n8n
 * UX guidelines ask for dropdowns.
 */

export const SOCIAL_MEDIA_OPTIONS = [
	{ name: 'Bluesky', value: 'BLUESKY' },
	{ name: 'Dev.to', value: 'DEV_TO' },
	{ name: 'Discord', value: 'DISCORD' },
	{ name: 'Dribbble', value: 'DRIBBBLE' },
	{ name: 'Facebook', value: 'FACEBOOK' },
	{ name: 'Instagram', value: 'INSTAGRAM' },
	{ name: 'LinkedIn (Page)', value: 'LINKEDIN_PAGE' },
	{ name: 'LinkedIn (Personal)', value: 'LINKEDIN' },
	{ name: 'Mastodon', value: 'MASTODON' },
	{ name: 'Pinterest', value: 'PINTEREST' },
	{ name: 'Slack', value: 'SLACK' },
	{ name: 'Threads', value: 'THREADS' },
	{ name: 'TikTok', value: 'TIKTOK' },
	{ name: 'Twitter / X', value: 'TWITTER' },
	{ name: 'WordPress', value: 'WORDPRESS' },
	{ name: 'YouTube', value: 'YOUTUBE' },
] as const;

/** Display names for a list of platform values, for help texts. */
export function platformNames(values: readonly string[]): string {
	return values
		.map(
			(value) =>
				SOCIAL_MEDIA_OPTIONS.find((option) => option.value === value)?.name ??
				value,
		)
		.join(', ');
}

export const POST_TYPE_OPTIONS = [
	{ name: 'Carousel', value: 'CAROUSEL' },
	{ name: 'Image', value: 'IMAGE' },
	{ name: 'Multiple Images', value: 'MULTIPLE_IMAGES' },
	{ name: 'Reel', value: 'REEL' },
	{ name: 'Story', value: 'STORY' },
	{ name: 'Text', value: 'TEXT' },
	{ name: 'Video', value: 'VIDEO' },
] as const;

export const POST_STATUS_OPTIONS = [
	{ name: 'Failed', value: 'FAILED' },
	{ name: 'Pending', value: 'PENDING' },
	{ name: 'Pending Approval', value: 'PENDING_APPROVAL' },
	{ name: 'Posted', value: 'POSTED' },
	{ name: 'Rejected', value: 'REJECTED' },
	{ name: 'Scheduled', value: 'SCHEDULED' },
] as const;
