import { describe, it, expect, vi } from 'vitest';
import { SocialMediaStudio } from '../nodes/SocialMediaStudio/SocialMediaStudio.node';
import { postingTool } from '../nodes/SocialMediaStudio/PostingFunctions';
import { getSocialAccounts } from '../nodes/SocialMediaStudio/methods/loadOptions';
import type { IHttpRequestOptions } from 'n8n-workflow';

const node = new SocialMediaStudio();
const input = {
	text: 'QA head',
	socialMedia: 'BLUESKY',
	postType: 'TEXT',
	accountId: 'account-1',
	postId: 'post-1',
	draftId: 'draft-1',
	fileId: 'file-1',
	folderId: 'folder-1',
	ids: 'post-1, post-2',
	fileIds: 'file-1, file-2',
	validateFileIds: 'file-1',
	query: 'QA',
	newName: 'Renamed',
	folderName: 'QA folder',
	startDate: '2030-01-01T00:00:00Z',
	endDate: '2030-02-01T00:00:00Z',
	scheduleFor: '2030-01-02T00:00:00Z',
	presignFiles: {
		file: [{ filename: 'image.png', mimetype: 'image/png', size: 3 }],
	},
	targets: { target: [{ socialMedia: 'BLUESKY', postType: 'IMAGE' }] },
};

export const operationCases = [
	['post', 'create', 'POST', '/v1/posts'],
	['post', 'get', 'GET', '/v1/posts/post-1'],
	['post', 'getMany', 'GET', '/v1/posts'],
	['post', 'update', 'PATCH', '/v1/posts/post-1'],
	['post', 'delete', 'DELETE', '/v1/posts/post-1'],
	['post', 'getCalendar', 'GET', '/v1/posts/calendar'],
	['post', 'bulkDelete', 'POST', '/v1/posts/bulk-delete'],
	['post', 'schedule', 'MCP', 'schedule_post'],
	['post', 'unschedule', 'POST', '/v1/posts/post-1/unschedule'],
	['post', 'retry', 'POST', '/v1/posts/post-1/retry'],
	['post', 'resubmit', 'POST', '/v1/posts/post-1/resubmit'],
	['draft', 'create', 'MCP', 'create_draft'],
	['draft', 'get', 'GET', '/v1/drafts/draft-1'],
	['draft', 'getMany', 'GET', '/v1/drafts'],
	['draft', 'update', 'MCP', 'update_draft'],
	['draft', 'delete', 'DELETE', '/v1/drafts/draft-1'],
	['draft', 'convert', 'MCP', 'convert_draft'],
	['socialAccount', 'get', 'GET', '/v1/accounts/account-1'],
	['socialAccount', 'getMany', 'GET', '/v1/accounts'],
	['socialAccount', 'getTikTokCreatorInfo', 'MCP', 'get_tiktok_creator_info'],
	['socialAccount', 'listPinterestBoards', 'MCP', 'list_pinterest_boards'],
	['socialAccount', 'listDiscordChannels', 'MCP', 'list_discord_channels'],
	['socialAccount', 'listSlackChannels', 'MCP', 'list_slack_channels'],
	['media', 'upload', 'POST', '/v1/posts/presign-media'],
	['media', 'presignUpload', 'POST', '/v1/posts/presign-media'],
	['media', 'uploadLibrary', 'MCP', 'presign_media_upload'],
	['media', 'presignLibraryUpload', 'MCP', 'presign_media_upload'],
	['media', 'get', 'MCP', 'get_media_file'],
	['media', 'list', 'GET', '/v1/media'],
	['media', 'listFolders', 'GET', '/v1/media/folders'],
	['media', 'search', 'GET', '/v1/media/files/search'],
	['media', 'validate', 'POST', '/v1/media/validate'],
	['media', 'getRules', 'GET', '/v1/media/rules'],
	['media', 'delete', 'DELETE', '/v1/media/file-1'],
	['media', 'bulkDelete', 'POST', '/v1/media/files/bulk-delete'],
	['media', 'move', 'PATCH', '/v1/media/files/file-1/move'],
	['media', 'rename', 'PATCH', '/v1/media/files/file-1/rename'],
	['media', 'createFolder', 'POST', '/v1/media/folders'],
	['media', 'deleteFolder', 'DELETE', '/v1/media/folders/folder-1'],
	['media', 'moveFolder', 'PATCH', '/v1/media/folders/folder-1/move'],
	['media', 'renameFolder', 'PATCH', '/v1/media/folders/folder-1/rename'],
];

function context(params: Record<string, unknown>, response?: unknown) {
	const calls: IHttpRequestOptions[] = [];
	const request = vi.fn(async (_credential, options) => {
		calls.push(options);
		if (response instanceof Error) throw response;
		if (response !== undefined) return response;
		if (options.url.endsWith('/mcp/posting')) {
			const body = JSON.parse(options.body);
			const payload =
				body.params.name === 'presign_media_upload'
					? [
							{
								fileId: 'file-1',
								uploadUrl: 'https://storage.example.test/upload',
							},
						]
					: { id: 'result-1', verified: true };
			return `event: message\r\ndata: ${JSON.stringify({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: JSON.stringify(payload) }] } })}\r\n\r\n`;
		}
		if (options.url.endsWith('/presign-media'))
			return [
				{ fileId: 'file-1', uploadUrl: 'https://storage.example.test/upload' },
			];
		if (options.method === 'GET')
			return { data: [{ id: 'result-1' }], meta: { totalPages: 1 } };
		return { id: 'result-1' };
	});
	const ctx = {
		getNode: () => ({
			name: 'Posting QA',
			type: 'socialMediaStudio',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
		getCredentials: async () => ({
			baseUrl: 'http://localhost:58000///',
			apiKey: 'local-qa',
		}),
		getInputData: () => [{ json: {} }],
		continueOnFail: () => false,
		getNodeParameter: (key: string, _index?: number, fallback?: unknown) =>
			key in params ? params[key] : fallback,
		helpers: {
			httpRequestWithAuthentication: request,
			httpRequest: vi.fn(async () => ({})),
			assertBinaryData: () => ({
				fileName: 'image.png',
				mimeType: 'image/png',
			}),
			getBinaryDataBuffer: async () => Buffer.from([1, 2, 3]),
		},
	};
	return { ctx, calls, request };
}

describe('every exposed posting operation', () => {
	it('has a contract case for every exposed operation, without deferred resources', () => {
		const exposed = node.description.properties
			.filter((p) => p.name === 'operation')
			.flatMap((p) =>
				(p.options ?? []).map((o) =>
					[
						p.displayOptions?.show?.resource?.[0],
						'value' in o ? o.value : '',
					].join('.'),
				),
			)
			.sort();
		expect(operationCases.map(([r, o]) => `${r}.${o}`).sort()).toEqual(exposed);
	});
	for (const [resource, operation, method, path] of operationCases) {
		it(`${resource}.${operation}: successful request and paired output`, async () => {
			const { ctx, calls } = context({ ...input, resource, operation });
			const output = await node.execute.call(ctx as never);
			expect(calls[0].url).toBe(
				'http://localhost:58000' + (method === 'MCP' ? '/mcp/posting' : path),
			);
			expect(calls[0].method).toBe(method === 'MCP' ? 'POST' : method);
			if (method === 'MCP')
				expect(JSON.parse(calls[0].body).params.name).toBe(path);
			expect(output[0].length).toBeGreaterThan(0);
			expect(output[0][0].pairedItem).toEqual({ item: 0 });
			if (operation === 'uploadLibrary') expect(calls).toHaveLength(2);
		});
		it(`${resource}.${operation}: auth failure stops execution`, async () => {
			const error = Object.assign(new Error('Unauthorized'), {
				statusCode: 401,
				response: { body: { message: 'Bad key' } },
			});
			const { ctx } = context({ ...input, resource, operation }, error);
			await expect(node.execute.call(ctx as never)).rejects.toThrow(
				'API key invalid',
			);
			expect(ctx.helpers.httpRequest).not.toHaveBeenCalled();
		});
	}
});

describe('posting options and HTTP failure handling', () => {
	for (const returnAll of [true, false])
		it(`media search sends the backend name filter (returnAll=${returnAll})`, async () => {
			const { ctx, request } = context({
				...input,
				resource: 'media',
				operation: 'search',
				query: 'unique-image',
				returnAll,
			});
			await node.execute.call(ctx as never);
			expect(request.mock.calls[0][1].qs).toMatchObject({
				name: 'unique-image',
			});
			expect(request.mock.calls[0][1].qs).not.toHaveProperty('q');
		});
	for (const resource of ['post', 'draft'])
		for (const operation of ['create', 'update']) {
			it(`${resource}.${operation} preserves threads, first comment, media order and explicit false TikTok options`, async () => {
				const { ctx, calls } = context({
					...input,
					resource,
					operation,
					libraryFileIds: 'a, b\nc',
					threadParts: {
						part: [{ text: 'part one' }, { text: 'part two', fileIds: 'x,y' }],
					},
					firstComment: '#tag',
					tiktok: { allowDuet: false, privacyLevel: 'SELF_ONLY' },
				});
				await node.execute.call(ctx as never);
				const body =
					typeof calls[0].body === 'string'
						? JSON.parse(calls[0].body).params.arguments
						: calls[0].body;
				expect(body).toMatchObject({
					fileIds: ['a', 'b', 'c'],
					threadParts: [
						{ text: 'part one' },
						{ text: 'part two', fileIds: ['x', 'y'] },
					],
					firstComment: '#tag',
					tiktok: { allowDuet: false, privacyLevel: 'SELF_ONLY' },
				});
			});
			it(`${resource}.${operation} rejects malformed metadata before sending`, async () => {
				const { ctx, request } = context({
					...input,
					resource,
					operation,
					metaData: '{broken',
				});
				await expect(node.execute.call(ctx as never)).rejects.toThrow();
				expect(request).not.toHaveBeenCalled();
			});
		}
	for (const resource of ['post', 'draft'])
		it(`${resource}: explicit clears differ from omitted fields`, async () => {
			const { ctx, calls } = context({
				...input,
				resource,
				operation: 'update',
				clearMedia: true,
				clearThread: true,
				clearFirstComment: true,
			});
			await node.execute.call(ctx as never);
			const body =
				typeof calls[0].body === 'string'
					? JSON.parse(calls[0].body).params.arguments
					: calls[0].body;
			expect(body).toMatchObject({
				fileIds: [],
				threadParts: [],
				firstComment: '',
			});
		});
	for (const [status, message] of [
		[402, 'Quota exhausted'],
		[403, 'Forbidden'],
		[404, 'Not found'],
		[422, 'Validation failed'],
		[429, 'Rate limited'],
		[500, 'temporarily unavailable'],
		[502, 'temporarily unavailable'],
		[503, 'temporarily unavailable'],
		[504, 'temporarily unavailable'],
	] as const) {
		it(`HTTP ${status} is actionable and supports continue on fail`, async () => {
			const { ctx } = context(
				{ ...input, resource: 'post', operation: 'get' },
				Object.assign(new Error('failed'), {
					statusCode: status,
					response: { body: { message: 'details' } },
				}),
			);
			ctx.continueOnFail = () => true;
			const result = await node.execute.call(ctx as never);
			expect(result[0][0].json.error).toContain(message);
		});
	}
	it('does not attach API credentials to presigned storage PUTs', async () => {
		const { ctx } = context({
			...input,
			resource: 'media',
			operation: 'uploadLibrary',
		});
		await node.execute.call(ctx as never);
		expect(ctx.helpers.httpRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'PUT',
				body: Buffer.from([1, 2, 3]),
				headers: { 'Content-Type': 'image/png' },
			}),
		);
	});
	it('fails malformed or mismatched MCP responses', async () => {
		for (const response of [
			'event: message\ndata: {broken}\n\n',
			{ id: 2, result: {} },
			{},
		]) {
			const { ctx } = context({}, response);
			await expect(
				postingTool.call(ctx as never, 'get_post', {}),
			).rejects.toThrow();
		}
	});
	it('handles protocol errors, tool errors, and structured-only responses', async () => {
		for (const envelope of [
			{ id: 1, error: { message: 'Protocol failed' } },
			{
				id: 1,
				result: {
					isError: true,
					content: [{ type: 'text', text: 'Tool failed' }],
				},
			},
		]) {
			const { ctx } = context({}, envelope);
			await expect(
				postingTool.call(ctx as never, 'get_post', {}),
			).rejects.toThrow('failed');
		}
		const { ctx } = context(
			{},
			JSON.stringify({ id: 1, result: { structuredContent: { id: 'ok' } } }),
		);
		expect(await postingTool.call(ctx as never, 'get_post', {})).toEqual({
			id: 'ok',
		});
	});
	it('keeps array results as items rather than a structuredContent wrapper', async () => {
		const { ctx } = context(
			{},
			{
				id: 1,
				result: {
					content: [{ type: 'text', text: '[{"id":"a"}]' }],
					structuredContent: { items: [{ id: 'a' }] },
				},
			},
		);
		expect(
			await postingTool.call(ctx as never, 'list_slack_channels', {}),
		).toEqual([{ id: 'a' }]);
	});
	it('returns no items for empty lists', async () => {
		const { ctx } = context(
			{ resource: 'post', operation: 'getMany' },
			{ data: [], meta: { totalPages: 0 } },
		);
		expect(await node.execute.call(ctx as never)).toEqual([[]]);
	});
	it('retrieves all pages with original filters', async () => {
		const { ctx, request } = context({
			resource: 'post',
			operation: 'getMany',
			returnAll: true,
			filters: { status: 'SCHEDULED' },
		});
		request
			.mockResolvedValueOnce({ data: [{ id: '1' }], meta: { totalPages: 2 } })
			.mockResolvedValueOnce({ data: [{ id: '2' }], meta: { totalPages: 2 } });
		expect(
			(await node.execute.call(ctx as never))[0].map((x) => x.json.id),
		).toEqual(['1', '2']);
		expect(request.mock.calls[1][1].qs).toEqual({
			status: 'SCHEDULED',
			page: 2,
			limit: 100,
		});
	});
	it('uses actual backend accountName/userName fields in account choices', async () => {
		const { ctx } = context(
			{},
			{
				data: [
					{ id: 'a', platform: 'BLUESKY', accountName: 'QA User' },
					{ id: 'b' },
				],
				meta: { totalPages: 1 },
			},
		);
		expect(await getSocialAccounts.call(ctx as never)).toEqual([
			{ name: 'BLUESKY · QA User', value: 'a' },
			{ name: 'b', value: 'b' },
		]);
	});
	it('rejects deferred resources even when supplied through expressions', async () => {
		for (const resource of ['inbox', 'analytics', 'comment', 'savedReply']) {
			const { ctx, request } = context({ resource, operation: 'getMany' });
			await expect(node.execute.call(ctx as never)).rejects.toThrow(
				'Unknown resource',
			);
			expect(request).not.toHaveBeenCalled();
		}
	});
});
