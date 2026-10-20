import { describe, it, expect, vi } from 'vitest';
import type { IHttpRequestOptions } from 'n8n-workflow';
import { SocialMediaStudio } from '../nodes/SocialMediaStudio/SocialMediaStudio.node';
import { toApiDateTime } from '../nodes/SocialMediaStudio/descriptions/common';

const node = new SocialMediaStudio();
const inZone = (timeZone: string) => ({ getTimezone: () => timeZone }) as never;

describe('toApiDateTime', () => {
	it('reads a date field without an offset in the workflow time zone', () => {
		expect(toApiDateTime.call(inZone('Asia/Dhaka'), '2026-11-20T10:00:00')).toBe(
			'2026-11-20T04:00:00.000Z',
		);
		expect(toApiDateTime.call(inZone('Europe/Berlin'), '2026-11-20 10:00:00')).toBe(
			'2026-11-20T09:00:00.000Z',
		);
		expect(toApiDateTime.call(inZone('UTC'), '2026-11-20')).toBe('2026-11-20T00:00:00.000Z');
	});

	it('follows daylight saving time', () => {
		const ny = inZone('America/New_York');
		expect(toApiDateTime.call(ny, '2026-07-01T09:00:00')).toBe('2026-07-01T13:00:00.000Z');
		expect(toApiDateTime.call(ny, '2026-12-01T09:00:00')).toBe('2026-12-01T14:00:00.000Z');
		// 01:30 on the day the clocks go back exists twice; either reading is an hour apart.
		expect(['2026-11-01T05:30:00.000Z', '2026-11-01T06:30:00.000Z']).toContain(
			toApiDateTime.call(ny, '2026-11-01T01:30:00'),
		);
	});

	it('keeps an explicit offset and normalizes it to UTC', () => {
		const zone = inZone('Asia/Dhaka');
		expect(toApiDateTime.call(zone, '2030-01-02T00:00:00Z')).toBe('2030-01-02T00:00:00.000Z');
		expect(toApiDateTime.call(zone, '2030-01-02T02:00:00+02:00')).toBe(
			'2030-01-02T00:00:00.000Z',
		);
	});

	it('accepts Date and Luxon values from expressions', () => {
		const zone = inZone('Asia/Dhaka');
		expect(toApiDateTime.call(zone, new Date('2030-01-02T00:00:00Z'))).toBe(
			'2030-01-02T00:00:00.000Z',
		);
		const luxonLike = { toISO: () => 'x', toUTC: () => ({ toISO: () => '2030-01-02T00:00:00.000Z' }) };
		expect(toApiDateTime.call(zone, luxonLike)).toBe('2030-01-02T00:00:00.000Z');
	});

	it('leaves empty and unparseable values alone', () => {
		const zone = inZone('Asia/Dhaka');
		expect(toApiDateTime.call(zone, '')).toBe('');
		expect(toApiDateTime.call(zone, undefined)).toBe('');
		expect(toApiDateTime.call(zone, 'next friday')).toBe('next friday');
		expect(toApiDateTime.call(inZone('Not/AZone'), '2026-11-20T10:00:00')).toBe(
			'2026-11-20T10:00:00',
		);
	});
});

function context(params: Record<string, unknown>) {
	const calls: IHttpRequestOptions[] = [];
	const request = vi.fn(async (_credential: string, options: IHttpRequestOptions) => {
		calls.push(options);
		if (String(options.url).endsWith('/mcp/posting'))
			return `event: message\r\ndata: ${JSON.stringify({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: '{"id":"result-1"}' }] } })}\r\n\r\n`;
		return { id: 'result-1' };
	});
	const ctx = {
		getNode: () => ({ name: 'Dates', type: 'socialMediaStudio', typeVersion: 1, position: [0, 0], parameters: {} }),
		getCredentials: async () => ({ baseUrl: 'http://localhost:58000', apiKey: 'local-qa' }),
		getInputData: () => [{ json: {} }],
		continueOnFail: () => false,
		getTimezone: () => 'Asia/Dhaka',
		getNodeParameter: (key: string, _index?: number, fallback?: unknown) =>
			key in params ? params[key] : fallback,
		helpers: { httpRequestWithAuthentication: request, httpRequest: vi.fn(async () => ({})) },
	};
	return { ctx, calls };
}

const sent = (call: IHttpRequestOptions) =>
	typeof call.body === 'string' ? JSON.parse(call.body) : (call.body as Record<string, unknown>);

describe('date fields sent to the API', () => {
	const base = { text: 'Hello', socialMedia: 'MASTODON', postType: 'TEXT', accountId: 'account-1', postId: 'post-1', draftId: 'draft-1' };

	it('Post → Create sends Schedule For in UTC', async () => {
		const { ctx, calls } = context({ ...base, resource: 'post', operation: 'create', scheduledAt: '2026-11-20T10:00:00' });
		await node.execute.call(ctx as never);
		expect(sent(calls[0]).scheduledAt).toBe('2026-11-20T04:00:00.000Z');
	});

	it('Post → Update sends a changed Schedule For in UTC', async () => {
		const { ctx, calls } = context({ ...base, resource: 'post', operation: 'update', updateFields: { scheduledAt: '2026-11-20T10:00:00' } });
		await node.execute.call(ctx as never);
		expect(sent(calls[0]).scheduledAt).toBe('2026-11-20T04:00:00.000Z');
	});

	it('Post → Schedule sends Schedule For in UTC', async () => {
		const { ctx, calls } = context({ ...base, resource: 'post', operation: 'schedule', scheduleFor: '2026-11-20T10:00:00' });
		await node.execute.call(ctx as never);
		expect(sent(calls[0]).params.arguments.scheduledAt).toBe('2026-11-20T04:00:00.000Z');
	});

	it('Post → Get Calendar sends the range in UTC', async () => {
		const { ctx, calls } = context({ ...base, resource: 'post', operation: 'getCalendar', startDate: '2026-11-01T00:00:00', endDate: '2026-12-01T00:00:00' });
		await node.execute.call(ctx as never);
		expect(calls[0].qs).toMatchObject({ startDate: '2026-10-31T18:00:00.000Z', endDate: '2026-11-30T18:00:00.000Z' });
	});

	it('Draft → Convert to Post sends Schedule For in UTC', async () => {
		const { ctx, calls } = context({ ...base, resource: 'draft', operation: 'convert', scheduledAt: '2026-11-20T10:00:00' });
		await node.execute.call(ctx as never);
		expect(sent(calls[0]).params.arguments.scheduledAt).toBe('2026-11-20T04:00:00.000Z');
	});
});
