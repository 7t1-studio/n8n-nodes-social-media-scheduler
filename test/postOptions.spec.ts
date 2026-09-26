import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	applyPostOptions,
	buildFirstComment,
	buildThreadParts,
	buildTikTokOptions,
} from '../nodes/SocialMediaStudio/postOptions';

const requestMock = vi.fn();
const postingMock = vi.fn();

vi.mock('../nodes/SocialMediaStudio/PostingFunctions', async (importOriginal) => ({
	...await importOriginal<typeof import('../nodes/SocialMediaStudio/PostingFunctions')>(),
	postingTool: (...args: unknown[]) => postingMock(...args),
}));

vi.mock('../nodes/SocialMediaStudio/GenericFunctions', () => ({
	soMeApiRequest: (...args: unknown[]) => requestMock(...args),
	soMeApiRequestAllItems: (...args: unknown[]) => requestMock(...args),
}));

import { executePost } from '../nodes/SocialMediaStudio/descriptions/PostDescription';

/** Minimal IExecuteFunctions stand-in: reads parameters from a plain map. */
function context(params: Record<string, unknown>) {
	return {
		getNodeParameter(name: string, _itemIndex: number, fallback?: unknown) {
			return name in params ? params[name] : fallback;
		},
	} as never;
}

function lastBody(): Record<string, unknown> {
	const call = requestMock.mock.calls.at(-1) as unknown[];
	return call[2] as Record<string, unknown>;
}

describe('buildThreadParts', () => {
	it('maps text and comma-separated file IDs to the API shape', () => {
		expect(
			buildThreadParts({
				part: [
					{ text: '1. Ship the smallest version first.' },
					{ text: '2. Read the error message.', fileIds: 'a-1, b-2' },
					{ fileIds: 'c-3' },
				],
			}),
		).toEqual([
			{ text: '1. Ship the smallest version first.' },
			{ text: '2. Read the error message.', fileIds: ['a-1', 'b-2'] },
			{ fileIds: ['c-3'] },
		]);
	});

	it('returns undefined when no part was added, so an update keeps the chain', () => {
		expect(buildThreadParts({})).toBeUndefined();
		expect(buildThreadParts(undefined)).toBeUndefined();
		expect(buildThreadParts({ part: [] })).toBeUndefined();
	});

	it('returns an empty array when every added part is empty, which clears the chain', () => {
		expect(buildThreadParts({ part: [{ text: '  ', fileIds: '' }] })).toEqual([]);
	});
});

describe('buildFirstComment', () => {
	it('trims the value', () => {
		expect(buildFirstComment('  #release #changelog  ')).toBe('#release #changelog');
	});

	it('returns undefined for an empty or non-string value', () => {
		expect(buildFirstComment('')).toBeUndefined();
		expect(buildFirstComment('   ')).toBeUndefined();
		expect(buildFirstComment(undefined)).toBeUndefined();
	});
});

describe('buildTikTokOptions', () => {
	it('keeps the privacy level and every boolean the user set', () => {
		expect(
			buildTikTokOptions({
				privacyLevel: 'PUBLIC_TO_EVERYONE',
				allowComments: true,
				allowStitch: false,
			}),
		).toEqual({
			privacyLevel: 'PUBLIC_TO_EVERYONE',
			allowComments: true,
			allowStitch: false,
		});
	});

	it('returns undefined when no option was set', () => {
		expect(buildTikTokOptions({})).toBeUndefined();
		expect(buildTikTokOptions(undefined)).toBeUndefined();
	});
});

describe('applyPostOptions', () => {
	it('adds only the fields the user filled in', () => {
		const body = applyPostOptions({ text: 'head' }, { firstComment: '#tag' });
		expect(body).toEqual({ text: 'head', firstComment: '#tag' });
	});

	it('lets the typed TikTok field win over the same feature in metaData', () => {
		const body = applyPostOptions(
			{ text: 'head', metaData: { privacy_level: 'SELF_ONLY' } },
			{ tiktok: { privacyLevel: 'PUBLIC_TO_EVERYONE' } },
		);
		expect(body.tiktok).toEqual({ privacyLevel: 'PUBLIC_TO_EVERYONE' });
		expect(body.metaData).toEqual({ privacy_level: 'SELF_ONLY' });
	});
});

describe('post request body mapping', () => {
	beforeEach(() => {
		requestMock.mockReset();
		requestMock.mockResolvedValue({ id: 'post-1' });
		postingMock.mockReset();
		postingMock.mockResolvedValue({ id: 'post-1' });
	});

	it('sends threadParts, firstComment and tiktok on create', async () => {
		await executePost.call(
			context({
				text: 'Three things I learned this week:',
				socialMedia: 'TWITTER',
				postType: 'TEXT',
				threadParts: { part: [{ text: 'part one' }, { text: 'part two', fileIds: 'file-1' }] },
				firstComment: '#thread',
				tiktok: { privacyLevel: 'SELF_ONLY', allowDuet: false },
				metaData: '{"hashtags":["a"]}',
			}),
			'create',
			0,
		);

		expect(requestMock).toHaveBeenCalledWith('POST', '/v1/posts', expect.any(Object));
		expect(lastBody()).toEqual({
			text: 'Three things I learned this week:',
			socialMedia: 'TWITTER',
			postType: 'TEXT',
			metaData: { hashtags: ['a'] },
			threadParts: [{ text: 'part one' }, { text: 'part two', fileIds: ['file-1'] }],
			firstComment: '#thread',
			tiktok: { privacyLevel: 'SELF_ONLY', allowDuet: false },
		});
	});

	it('omits the three fields on create when they are empty', async () => {
		await executePost.call(
			context({ text: 'plain', socialMedia: 'TWITTER', postType: 'TEXT' }),
			'create',
			0,
		);

		expect(lastBody()).toEqual({ text: 'plain', socialMedia: 'TWITTER', postType: 'TEXT' });
	});

	it('sends the new fields on update next to the update fields', async () => {
		await executePost.call(
			context({
				postId: 'post-1',
				updateFields: { text: 'new text' },
				threadParts: { part: [{ text: 'new part' }] },
				firstComment: 'see the link',
				tiktok: { privacyLevel: 'PUBLIC_TO_EVERYONE' },
			}),
			'update',
			0,
		);

		expect(requestMock).toHaveBeenCalledWith('PATCH', '/v1/posts/post-1', expect.any(Object));
		expect(lastBody()).toEqual({
			text: 'new text',
			threadParts: [{ text: 'new part' }],
			firstComment: 'see the link',
			tiktok: { privacyLevel: 'PUBLIC_TO_EVERYONE' },
		});
	});

	it('sends tiktok options with the schedule call', async () => {
		await executePost.call(
			context({
				postId: 'post-2',
				scheduleFor: '2026-10-01T10:00:00.000Z',
				tiktok: { privacyLevel: 'FOLLOWER_OF_CREATOR', allowComments: false },
			}),
			'schedule',
			0,
		);

		expect(postingMock).toHaveBeenCalledWith('schedule_post', {
			id: 'post-2',
			scheduledAt: '2026-10-01T10:00:00.000Z',
			tiktok: { privacyLevel: 'FOLLOWER_OF_CREATOR', allowComments: false },
		});
	});
});
