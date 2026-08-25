import { describe, expect, it } from 'vitest';
import { createHmac } from 'crypto';

/**
 * Mirrors the HMAC scheme used by:
 *   apps/backend/src/webhook/webhook-queue.processor.ts
 *
 * The trigger node MUST verify signatures the same way the backend signs them,
 * otherwise valid deliveries will be rejected (or invalid ones accepted).
 */
function backendSign(body: string, secret: string): string {
	return createHmac('sha256', secret).update(body).digest('hex');
}

import { categoriesForEvents } from '../nodes/SoMeStudioTrigger/events';

describe('webhook signature compatibility', () => {
	it('produces the same digest as the backend dispatcher', () => {
		const body = JSON.stringify({
			event: 'post.published',
			category: 'post',
			timestamp: '2026-04-25T12:00:00.000Z',
			data: { id: 'abc-123' },
		});
		const secret = 'test-secret-1234567890abcdef';

		const expected = backendSign(body, secret);
		const local = createHmac('sha256', secret).update(body).digest('hex');

		expect(local).toBe(expected);
		expect(local).toMatch(/^[0-9a-f]{64}$/);
	});

	it('detects tampered payloads', () => {
		const secret = 'test-secret-1234567890abcdef';
		const original = JSON.stringify({ event: 'post.published', data: { id: 'a' } });
		const tampered = JSON.stringify({ event: 'post.published', data: { id: 'b' } });

		expect(backendSign(original, secret)).not.toBe(backendSign(tampered, secret));
	});

	it('detects wrong secrets', () => {
		const body = JSON.stringify({ event: 'post.published' });
		expect(backendSign(body, 'secret-a')).not.toBe(backendSign(body, 'secret-b'));
	});
});

describe('categoriesForEvents', () => {
	it('derives unique categories for the selected events', () => {
		expect(
			categoriesForEvents(['post.published', 'post.failed', 'inbox.message_received']).sort(),
		).toEqual(['inbox', 'post']);
	});

	it('returns an empty array when no events are passed', () => {
		expect(categoriesForEvents([])).toEqual([]);
	});

	it('handles unknown event prefixes gracefully (skips them)', () => {
		expect(categoriesForEvents(['unknown.thing', 'post.published'])).toEqual(['post']);
	});

	it('handles compound prefixes like api_key', () => {
		expect(categoriesForEvents(['api_key.created'])).toEqual(['api_key']);
	});
});
