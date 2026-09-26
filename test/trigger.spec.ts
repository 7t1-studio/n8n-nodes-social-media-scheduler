import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { SocialMediaStudioTrigger } from '../nodes/SocialMediaStudioTrigger/SocialMediaStudioTrigger.node';

const node = new SocialMediaStudioTrigger();
function context({
	signature,
	secret = 'local-secret',
	verify = true,
	event = 'post.published',
}: {
	signature?: string;
	secret?: string;
	verify?: boolean;
	event?: string;
} = {}) {
	const rawBody = Buffer.from(
		JSON.stringify(
			{
				event,
				category: 'post',
				timestamp: '2030-01-01',
				data: { id: 'post-1' },
			},
			null,
			2,
		),
	);
	const signed = createHmac('sha256', 'local-secret')
		.update(rawBody)
		.digest('hex');
	const data: Record<string, unknown> = {
		secret,
		subscriptionId: 'subscription-1',
	};
	const response = { status: vi.fn(), json: vi.fn() };
	response.status.mockReturnValue(response);
	const request = vi.fn(async () => ({
		id: 'subscription-2',
		secret: 'created-secret',
	}));
	const ctx = {
		getRequestObject: () => ({ rawBody, body: JSON.parse(rawBody.toString()) }),
		getHeaderData: () => ({ 'x-webhook-signature': signature ?? signed }),
		getNodeParameter: (name: string) =>
			name === 'verifySignature'
				? verify
				: name === 'events'
					? ['post.published']
					: '',
		getWorkflowStaticData: () => data,
		getResponseObject: () => response,
		getNode: () => ({
			name: 'Trigger',
			type: 'socialMediaStudioTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
		getCredentials: async () => ({
			baseUrl: 'http://localhost:18080',
			apiKey: 'test',
		}),
		getWorkflow: () => ({ name: 'QA' }),
		getNodeWebhookUrl: () => 'https://qa.example.test/webhook',
		helpers: {
			httpRequestWithAuthentication: request,
			returnJsonArray: (items: unknown[]) => items.map((json) => ({ json })),
		},
	};
	return { ctx, response, data, request, signed };
}
describe('actual trigger implementation', () => {
	it('accepts the exact signed raw bytes, including whitespace', async () => {
		const { ctx, response } = context();
		const r = await node.webhook.call(ctx as never);
		expect(r.workflowData?.[0][0].json).toMatchObject({
			event: 'post.published',
			data: { id: 'post-1' },
		});
		expect(response.status).not.toHaveBeenCalled();
	});
	for (const signature of ['', '00', 'z'.repeat(64), 'f'.repeat(64)])
		it(`rejects invalid signature ${signature.slice(0, 4)}`, async () => {
			const { ctx, response } = context({ signature });
			expect(await node.webhook.call(ctx as never)).toEqual({
				noWebhookResponse: true,
			});
			expect(response.status).toHaveBeenCalledWith(401);
		});
	it('rejects a valid digest with appended non-hex junk', async () => {
		const { signed } = context();
		const { ctx, response } = context({ signature: signed + 'zz' });
		await node.webhook.call(ctx as never);
		expect(response.status).toHaveBeenCalledWith(401);
	});
	it('rejects missing local secret', async () => {
		const { ctx, response } = context({ secret: '' });
		await node.webhook.call(ctx as never);
		expect(response.status).toHaveBeenCalledWith(401);
	});
	it('filters signed but unselected events', async () => {
		const { ctx } = context({ event: 'post.failed' });
		const r = await node.webhook.call(ctx as never);
		expect(r.workflowData).toBeUndefined();
	});
	it('supports the explicit debug setting', async () => {
		const { ctx } = context({ verify: false, secret: '', signature: '' });
		expect((await node.webhook.call(ctx as never)).workflowData).toBeDefined();
	});
	it('registers selected event categories and stores the returned secret', async () => {
		const { ctx, data, request } = context();
		await node.webhookMethods.default.create.call(ctx as never);
		expect(data).toMatchObject({
			subscriptionId: 'subscription-2',
			secret: 'created-secret',
			subscribedEvents: ['post.published'],
		});
		expect(request).toHaveBeenCalledWith(
			'socialMediaStudioApi',
			expect.objectContaining({
				body: expect.objectContaining({ events: ['post.published'] }),
			}),
		);
	});
	it('rejects activation with no event selected', async () => {
		const { ctx, request } = context();
		ctx.getNodeParameter = () => [] as never;
		await expect(
			node.webhookMethods.default.create.call(ctx as never),
		).rejects.toThrow('Select at least one');
		expect(request).not.toHaveBeenCalled();
	});
	it('reuses only a subscription whose secret is available locally', async () => {
		const { ctx, request, data } = context();
		request.mockResolvedValue({
			data: [{ id: 'subscription-1', url: 'https://qa.example.test/webhook' }],
		} as never);
		expect(
			await node.webhookMethods.default.checkExists.call(ctx as never),
		).toBe(true);
		delete data.secret;
		expect(
			await node.webhookMethods.default.checkExists.call(ctx as never),
		).toBe(false);
	});
	it('clears static state only after successful deletion', async () => {
		const { ctx, data } = context();
		await node.webhookMethods.default.delete.call(ctx as never);
		expect(data).toEqual({});
	});
	it('recovers an existing secret and updates changed events without creating a duplicate', async () => {
		const { ctx, request, data } = context();
		delete data.secret;
		request.mockResolvedValueOnce([
			{
				id: 'subscription-1',
				url: 'https://qa.example.test/webhook',
				secret: 'recovered',
				events: ['post.failed'],
				isActive: false,
			},
		] as never);
		expect(
			await node.webhookMethods.default.checkExists.call(ctx as never),
		).toBe(true);
		expect(data).toMatchObject({
			secret: 'recovered',
			subscribedEvents: ['post.published'],
		});
		expect(request).toHaveBeenLastCalledWith(
			'socialMediaStudioApi',
			expect.objectContaining({
				method: 'PATCH',
				body: expect.objectContaining({
					events: ['post.published'],
					isActive: true,
				}),
			}),
		);
	});
	it('retains subscription state on server deletion failure', async () => {
		const { ctx, data, request } = context();
		request.mockRejectedValue(
			Object.assign(new Error('Unavailable'), { statusCode: 503 }),
		);
		await expect(
			node.webhookMethods.default.delete.call(ctx as never),
		).rejects.toThrow();
		expect(data.subscriptionId).toBe('subscription-1');
	});
	it('treats an already deleted subscription as cleaned up', async () => {
		const { ctx, data, request } = context();
		request.mockRejectedValue(
			Object.assign(new Error('Not found'), { statusCode: 404 }),
		);
		expect(await node.webhookMethods.default.delete.call(ctx as never)).toBe(
			true,
		);
		expect(data).toEqual({});
	});
});
