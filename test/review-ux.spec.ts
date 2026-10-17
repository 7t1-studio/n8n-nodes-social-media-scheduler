import { describe, expect, it, vi } from 'vitest';
import { NodeApiError } from 'n8n-workflow';
import type {
	IHttpRequestOptions,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { SocialMediaStudio } from '../nodes/SocialMediaStudio/SocialMediaStudio.node';
import {
	searchAccounts,
	searchDrafts,
	searchFiles,
	searchFolders,
	searchPosts,
} from '../nodes/SocialMediaStudio/methods/listSearch';

const node = new SocialMediaStudio();

const POST = {
	id: 'post-1',
	createdAt: '2026-10-01T00:00:00.000Z',
	updatedAt: '2026-10-01T00:00:00.000Z',
	socialMedia: 'BLUESKY',
	metaData: {},
	postType: 'TEXT',
	shareId: null,
	shareUrl: null,
	text: 'Hello from n8n',
	description: null,
	scheduledAt: '2030-01-01T09:00:00.000Z',
	postStatus: 'SCHEDULED',
	failureReason: null,
	failureCode: null,
	firstCommentStatus: null,
	accountId: 'account-1',
	tenantId: 'tenant-1',
	socialAccount: {
		id: 'account-1',
		accountName: 'QA Bluesky',
		platform: 'BLUESKY',
	},
	file: [],
};

function context(params: Record<string, unknown>, response: unknown = POST) {
	const calls: IHttpRequestOptions[] = [];
	const request = vi.fn(
		async (_credential: string, options: IHttpRequestOptions) => {
			calls.push(options);
			if (response instanceof Error) throw response;
			return response;
		},
	);
	const ctx = {
		getNode: () => ({
			name: 'UX QA',
			type: 'socialMediaStudio',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
		getCredentials: async () => ({
			baseUrl: 'http://localhost:58000',
			apiKey: 'local-qa',
		}),
		getInputData: () => [{ json: {} }],
		continueOnFail: () => false,
		getNodeParameter: (key: string, _index?: number, fallback?: unknown) =>
			key in params ? params[key] : fallback,
		helpers: { httpRequestWithAuthentication: request, httpRequest: vi.fn() },
	};
	return { ctx, calls, request };
}

const run = async (params: Record<string, unknown>, response?: unknown) => {
	const { ctx, calls } = context(params, response);
	const output = await node.execute.call(ctx as never);
	return { json: output[0].map((item) => item.json), calls };
};

describe('Output parameter', () => {
	it('returns at most 10 flattened fields by default', async () => {
		const { json } = await run({
			resource: 'post',
			operation: 'get',
			postId: 'post-1',
		});
		expect(json[0]).toEqual({
			id: 'post-1',
			postStatus: 'SCHEDULED',
			socialMedia: 'BLUESKY',
			postType: 'TEXT',
			text: 'Hello from n8n',
			scheduledAt: '2030-01-01T09:00:00.000Z',
			shareUrl: null,
			accountId: 'account-1',
			accountName: 'QA Bluesky',
			failureReason: null,
		});
	});

	it('returns every field in Raw mode', async () => {
		const { json } = await run({
			resource: 'post',
			operation: 'get',
			postId: 'post-1',
			output: 'raw',
		});
		expect(json[0]).toEqual(POST);
	});

	it('returns the ID and the selected fields in Selected Fields mode', async () => {
		const { json } = await run({
			resource: 'post',
			operation: 'get',
			postId: 'post-1',
			output: 'fields',
			fields: ['text', 'shareUrl'],
		});
		expect(json[0]).toEqual({
			id: 'post-1',
			text: 'Hello from n8n',
			shareUrl: null,
		});
	});

	it('shapes every record of a list', async () => {
		const { json } = await run(
			{ resource: 'socialAccount', operation: 'getMany' },
			{
				data: [
					{
						id: 'a',
						platform: 'BLUESKY',
						accountId: 'did:plc:1',
						accountName: 'QA',
						userName: 'qa.bsky.social',
						accountEmail: null,
						accountImage: 'https://cdn.example.test/a.png',
						subscribeInbox: false,
						subscribeComments: false,
						createdAt: '2026-10-01T00:00:00.000Z',
						capabilities: {
							firstComment: true,
							firstCommentMaxLength: 300,
							threads: false,
						},
					},
				],
				meta: { totalPages: 1 },
			},
		);
		expect(json).toEqual([
			{
				id: 'a',
				platform: 'BLUESKY',
				accountName: 'QA',
				userName: 'qa.bsky.social',
				accountId: 'did:plc:1',
				accountImage: 'https://cdn.example.test/a.png',
				supportsFirstComment: true,
				firstCommentMaxLength: 300,
				supportsThreads: false,
			},
		]);
	});

	it('does not change the output of write operations', async () => {
		const { json } = await run({
			resource: 'post',
			operation: 'create',
			text: 'Hello',
			socialMedia: 'BLUESKY',
			postType: 'TEXT',
		});
		expect(json[0]).toEqual(POST);
	});

	it('is offered only where records have more than 10 fields', () => {
		const output = node.description.properties.find((p) => p.name === 'output');
		expect(output?.displayOptions?.show).toEqual({
			resource: ['post', 'draft', 'media', 'socialAccount'],
			operation: ['get', 'getMany', 'getCalendar', 'list', 'search'],
		});
		const fields = node.description.properties.filter(
			(p) => p.name === 'fields',
		);
		expect(fields).toHaveLength(4);
		for (const field of fields) {
			const names = (field.options ?? []).map((option) => option.name);
			expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
		}
	});
});

describe('resource locators', () => {
	const locators = node.description.properties.filter(
		(p) => p.type === 'resourceLocator',
	);

	it('offer From List first and By ID second', () => {
		expect(locators.map((p) => p.name).sort()).toEqual(
			[
				'accountId',
				'accountId',
				'accountId',
				'draftId',
				'fileId',
				'folderId',
				'libraryFolderId',
				'parentFolderId',
				'postId',
				'targetFolderId',
			].sort(),
		);
		for (const locator of locators as INodeProperties[]) {
			expect(locator.default).toEqual({ mode: 'list', value: '' });
			expect(locator.modes?.map((mode) => mode.name)).toEqual(['list', 'id']);
			const method = locator.modes?.[0].typeOptions?.searchListMethod as string;
			expect(Object.keys(node.methods.listSearch)).toContain(method);
		}
	});

	it('use the value of a picker and still accept a plain ID', async () => {
		for (const postId of [
			{ __rl: true, mode: 'list', value: 'post-1' },
			{ __rl: true, mode: 'id', value: ' post-1 ' },
			'post-1',
		]) {
			const { calls } = await run({
				resource: 'post',
				operation: 'get',
				postId,
			});
			expect(calls[0].url).toBe('http://localhost:58000/v1/posts/post-1');
		}
	});

	it('send the account picked in Update Fields as an ID', async () => {
		const { ctx, calls } = context(
			{
				resource: 'draft',
				operation: 'update',
				draftId: 'draft-1',
				updateFields: {
					accountId: { __rl: true, mode: 'list', value: 'account-9' },
				},
			},
			JSON.stringify({
				id: 1,
				result: { content: [{ type: 'text', text: '{"id":"draft-1"}' }] },
			}),
		);
		await node.execute.call(ctx as never);
		expect(JSON.parse(calls[0].body as string).params.arguments).toMatchObject({
			id: 'draft-1',
			accountId: 'account-9',
		});
	});
});

describe('list search', () => {
	const page = (
		data: object[],
		meta: object = { totalPages: 1, nextPage: null },
	) => ({
		data,
		meta,
	});

	it('labels posts and returns the next page token', async () => {
		const { ctx, calls } = context(
			{},
			page([POST], { totalPages: 3, nextPage: 2 }),
		);
		expect(await searchPosts.call(ctx as never)).toEqual({
			results: [
				{ name: 'Hello from n8n · Bluesky · Scheduled', value: 'post-1' },
			],
			paginationToken: '2',
		});
		expect(calls[0].qs).toEqual({ page: 1, limit: 50 });
	});

	it('asks for the page in the pagination token', async () => {
		const { ctx, calls } = context({}, page([]));
		await searchDrafts.call(ctx as never, undefined, '3');
		expect(calls[0].qs).toEqual({ page: 3, limit: 50 });
	});

	it('searches files by name in every folder only when there is a filter', async () => {
		const file = {
			id: 'file-1',
			originalName: 'logo.png',
			fileSrc: 'https://cdn.example.test/logo.png',
		};
		const { ctx, calls } = context({}, page([file]));
		expect((await searchFiles.call(ctx as never, 'logo')).results).toEqual([
			{
				name: 'logo.png',
				value: 'file-1',
				url: 'https://cdn.example.test/logo.png',
			},
		]);
		await searchFiles.call(ctx as never);
		expect(calls.map((call) => call.url)).toEqual([
			'http://localhost:58000/v1/media/files/search',
			'http://localhost:58000/v1/media',
		]);
		expect(calls[0].qs).toMatchObject({ name: 'logo' });
	});

	it('lists folders at every depth and filters them by name', async () => {
		const { ctx, calls } = context(
			{},
			page([
				{ id: 'f1', name: 'Campaigns' },
				{ id: 'f2', name: 'Logos' },
			]),
		);
		expect((await searchFolders.call(ctx as never, 'logo')).results).toEqual([
			{ name: 'Logos', value: 'f2' },
		]);
		expect(calls[0].qs).toMatchObject({ parentId: 'all' });
	});

	it('sends the account filter to the API search', async () => {
		const { ctx, calls } = context(
			{},
			page([
				{ id: 'a', platform: 'LINKEDIN_PAGE', accountName: 'So-me' },
				{ id: 'b' },
			]),
		);
		expect((await searchAccounts.call(ctx as never, 'so')).results).toEqual([
			{ name: 'LinkedIn (Page) · So-me', value: 'a' },
			{ name: 'b', value: 'b' },
		]);
		expect(calls[0].qs).toMatchObject({ search: 'so' });
	});
});

describe('error messages', () => {
	it('keep the API text, add the item number and guide the next step', async () => {
		const { ctx } = context(
			{ resource: 'post', operation: 'get', postId: 'post-1' },
			Object.assign(new Error('Request failed'), {
				statusCode: 400,
				response: {
					body: { message: ['text must be shorter than 300 characters'] },
				},
			}),
		);
		await expect(node.execute.call(ctx as never)).rejects.toMatchObject({
			message:
				'Social Media Studio did not accept the request: text must be shorter than 300 characters [Item 0]',
			description: 'Check the node parameters and run the node again.',
			httpCode: '400',
		});
	});

	it('replace the generic message of the NodeApiError that n8n throws', async () => {
		const n8nNode = {
			id: 'n1',
			name: 'UX QA',
			type: 'socialMediaStudio',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
		};
		for (const [status, data, expected] of [
			[
				401,
				{ message: 'Invalid API key' },
				'The API key is not valid [Item 0]',
			],
			[
				422,
				{ message: ['text must be shorter than 300 characters'] },
				'Social Media Studio did not accept the request: text must be shorter than 300 characters [Item 0]',
			],
			[
				404,
				{ message: 'Post not found' },
				'The item does not exist: Post not found [Item 0]',
			],
		] as const) {
			const axiosError = Object.assign(
				new Error(`Request failed with status code ${status}`),
				{
					response: { status, data },
				},
			);
			const thrown = new NodeApiError(
				n8nNode,
				axiosError as unknown as JsonObject,
			);
			expect(thrown.httpCode).toBe(String(status));
			const { ctx } = context(
				{ resource: 'post', operation: 'get', postId: 'post-1' },
				thrown,
			);
			await expect(node.execute.call(ctx as never)).rejects.toMatchObject({
				message: expected,
				httpCode: String(status),
			});
		}
	});

	it('keep the message of n8n for a request without an HTTP status', async () => {
		const thrown = new NodeApiError(
			{
				id: 'n1',
				name: 'UX QA',
				type: 'x',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:443'), {
				code: 'ECONNREFUSED',
			}) as unknown as JsonObject,
		);
		const { ctx } = context(
			{ resource: 'post', operation: 'get', postId: 'post-1' },
			thrown,
		);
		const result = await node.execute
			.call(ctx as never)
			.catch((e: unknown) => e);
		expect(result).toBe(thrown);
		expect((result as Error).message).toMatch(/\[Item 0\]$/);
	});

	it('name the parameter that has malformed JSON', async () => {
		const { ctx, request } = context({
			resource: 'post',
			operation: 'create',
			text: 'Hello',
			socialMedia: 'BLUESKY',
			postType: 'TEXT',
			metaData: '{broken',
		});
		await expect(node.execute.call(ctx as never)).rejects.toThrow(
			"The 'Metadata' parameter is not valid JSON [Item 0]",
		);
		expect(request).not.toHaveBeenCalled();
	});

	it('do not use the words that the n8n UX guidelines ask to avoid', async () => {
		const avoided = /\b(error|problem|failure|mistake|failed)\b/i;
		const failures: unknown[] = [
			...[
				undefined,
				400,
				401,
				402,
				403,
				404,
				409,
				422,
				429,
				500,
				502,
				503,
				504,
			].map((statusCode) =>
				Object.assign(new Error(), { statusCode, response: { body: {} } }),
			),
		];
		const checked: string[] = [];
		for (const failure of failures) {
			const { ctx } = context(
				{ resource: 'post', operation: 'get', postId: 'post-1' },
				failure,
			);
			const thrown = await node.execute
				.call(ctx as never)
				.catch((e: unknown) => e);
			const { message, description } = thrown as {
				message: string;
				description?: string;
			};
			checked.push(message, description ?? '');
		}
		for (const [params, response] of [
			[{ resource: 'post', operation: 'publishNow' }, POST],
			[{ resource: 'draft', operation: 'create', text: 'x' }, 'data: {broken'],
			[
				{ resource: 'draft', operation: 'create', text: 'x' },
				'{"id":1,"result":{"isError":true}}',
			],
		] as const) {
			const { ctx } = context(params, response);
			const thrown = await node.execute
				.call(ctx as never)
				.catch((e: unknown) => e);
			const { message, description } = thrown as {
				message: string;
				description?: string;
			};
			checked.push(message, description ?? '');
		}
		expect(checked.filter(Boolean).length).toBeGreaterThan(20);
		for (const text of checked) expect(text).not.toMatch(avoided);
	});
});
