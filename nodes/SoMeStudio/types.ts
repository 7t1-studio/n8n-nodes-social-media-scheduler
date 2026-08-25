/**
 * Mirrors apps/backend/src/main/types/enum.ts.
 * Update both when enums change.
 */

export const SOCIAL_MEDIA_OPTIONS = [
	{ name: 'Twitter / X', value: 'TWITTER' },
	{ name: 'Instagram', value: 'INSTAGRAM' },
	{ name: 'LinkedIn (Personal)', value: 'LINKEDIN' },
	{ name: 'LinkedIn (Page)', value: 'LINKEDIN_PAGE' },
	{ name: 'Facebook', value: 'FACEBOOK' },
	{ name: 'TikTok', value: 'TIKTOK' },
	{ name: 'YouTube', value: 'YOUTUBE' },
	{ name: 'Threads', value: 'THREADS' },
	{ name: 'WhatsApp', value: 'WHATSAPP' },
	{ name: 'Pinterest', value: 'PINTEREST' },
	{ name: 'Dribbble', value: 'DRIBBBLE' },
] as const;

export const POST_TYPE_OPTIONS = [
	{ name: 'Text', value: 'TEXT' },
	{ name: 'Image', value: 'IMAGE' },
	{ name: 'Multiple Images', value: 'MULTIPLE_IMAGES' },
	{ name: 'Video', value: 'VIDEO' },
	{ name: 'Carousel', value: 'CAROUSEL' },
	{ name: 'Reel', value: 'REEL' },
	{ name: 'Story', value: 'STORY' },
] as const;

export const POST_STATUS_OPTIONS = [
	{ name: 'Pending', value: 'PENDING' },
	{ name: 'Scheduled', value: 'SCHEDULED' },
	{ name: 'Posted', value: 'POSTED' },
	{ name: 'Failed', value: 'FAILED' },
	{ name: 'Pending Approval', value: 'PENDING_APPROVAL' },
	{ name: 'Rejected', value: 'REJECTED' },
] as const;
