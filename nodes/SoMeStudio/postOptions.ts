import type { IDataObject } from 'n8n-workflow';

/**
 * Mapping helpers for the typed post fields the public API v1 accepts:
 * `threadParts`, `firstComment` and `tiktok`.
 *
 * Mirrors:
 *   apps/backend/src/api/api-access/v1/dto/v1-post.dto.ts
 *   apps/backend/src/content/post/thread-parts.util.ts
 *   apps/backend/src/content/post/first-comment.util.ts
 *   apps/backend/src/content/post/tiktok-options.util.ts
 *
 * The helpers are pure so they can be unit tested without an n8n runtime.
 */

/** Platforms that publish a chain from `threadParts`. */
export const THREAD_PLATFORMS = ['TWITTER', 'THREADS', 'BLUESKY', 'MASTODON'] as const;

/** Platforms that publish a `firstComment`. */
export const FIRST_COMMENT_PLATFORMS = [
	'FACEBOOK',
	'INSTAGRAM',
	'TWITTER',
	'LINKEDIN',
	'LINKEDIN_PAGE',
	'THREADS',
	'YOUTUBE',
] as const;

export const TIKTOK_PRIVACY_LEVEL_OPTIONS = [
	{ name: 'Public to Everyone', value: 'PUBLIC_TO_EVERYONE' },
	{ name: 'Mutual Follow Friends', value: 'MUTUAL_FOLLOW_FRIENDS' },
	{ name: 'Follower of Creator', value: 'FOLLOWER_OF_CREATOR' },
	{ name: 'Only Me (Self Only)', value: 'SELF_ONLY' },
] as const;

const TIKTOK_BOOLEAN_KEYS = [
	'allowComments',
	'allowDuet',
	'allowStitch',
	'brandContentToggle',
	'brandOrganicToggle',
] as const;

/** Raw value of the "Thread Parts" fixedCollection. */
export interface ThreadPartsParameter {
	part?: Array<{ text?: string; fileIds?: string }>;
}

function splitIds(raw: string | undefined): string[] {
	if (typeof raw !== 'string') return [];
	return raw
		.split(/[\s,]+/)
		.map((id) => id.trim())
		.filter(Boolean);
}

/**
 * Turns the fixedCollection value into the `threadParts` array the API takes.
 *
 * Returns `undefined` when the user added no parts at all, so an update never
 * touches an existing chain. Returns `[]` only when every added part is empty,
 * which is how the API clears a chain.
 */
export function buildThreadParts(raw: unknown): IDataObject[] | undefined {
	const parts = (raw as ThreadPartsParameter | undefined)?.part;
	if (!Array.isArray(parts) || parts.length === 0) return undefined;

	const mapped: IDataObject[] = [];
	for (const part of parts) {
		const text = typeof part?.text === 'string' ? part.text.trim() : '';
		const fileIds = splitIds(part?.fileIds);
		if (!text && fileIds.length === 0) continue;

		const entry: IDataObject = {};
		if (text) entry.text = text;
		if (fileIds.length) entry.fileIds = fileIds;
		mapped.push(entry);
	}

	return mapped;
}

/**
 * Normalises the "First Comment" string. An empty value returns `undefined`,
 * so an existing comment stays untouched.
 */
export function buildFirstComment(raw: unknown): string | undefined {
	if (typeof raw !== 'string') return undefined;
	const value = raw.trim();
	return value === '' ? undefined : value;
}

/**
 * Turns the "TikTok Options" collection into the `tiktok` object the API takes.
 * Returns `undefined` when the user set no option.
 */
export function buildTikTokOptions(raw: unknown): IDataObject | undefined {
	const options = raw as IDataObject | undefined;
	if (!options || typeof options !== 'object') return undefined;

	const tiktok: IDataObject = {};
	if (typeof options.privacyLevel === 'string' && options.privacyLevel !== '') {
		tiktok.privacyLevel = options.privacyLevel;
	}
	for (const key of TIKTOK_BOOLEAN_KEYS) {
		if (typeof options[key] === 'boolean') tiktok[key] = options[key];
	}

	return Object.keys(tiktok).length === 0 ? undefined : tiktok;
}

/**
 * Adds the three typed fields to a request body. Typed fields win over any
 * value the free-form Metadata JSON carries for the same feature.
 */
export function applyPostOptions(
	body: IDataObject,
	values: {
		threadParts?: unknown;
		firstComment?: unknown;
		tiktok?: unknown;
	},
): IDataObject {
	const threadParts = buildThreadParts(values.threadParts);
	if (threadParts !== undefined) body.threadParts = threadParts;

	const firstComment = buildFirstComment(values.firstComment);
	if (firstComment !== undefined) body.firstComment = firstComment;

	const tiktok = buildTikTokOptions(values.tiktok);
	if (tiktok !== undefined) body.tiktok = tiktok;

	return body;
}
