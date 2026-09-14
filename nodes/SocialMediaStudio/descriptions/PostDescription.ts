import { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { soMeApiRequest, soMeApiRequestAllItems } from '../GenericFunctions';
import {
	POST_STATUS_OPTIONS,
	POST_TYPE_OPTIONS,
	SOCIAL_MEDIA_OPTIONS,
} from '../types';

const showFor = (operations: string[]) => ({
	show: { resource: ['post'], operation: operations },
});

export const postOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['post'] } },
		options: [
			{ name: 'Bulk Delete', value: 'bulkDelete', description: 'Delete many posts at once', action: 'Bulk delete posts' },
			{ name: 'Create', value: 'create', description: 'Create a new post', action: 'Create a post' },
			{ name: 'Delete', value: 'delete', description: 'Delete a post', action: 'Delete a post' },
			{ name: 'Get', value: 'get', description: 'Get a single post by ID', action: 'Get a post' },
			{ name: 'Get Calendar', value: 'getCalendar', description: 'Get posts in a date range for calendar view', action: 'Get calendar posts' },
			{ name: 'Get Many', value: 'getMany', description: 'List posts (paginated)', action: 'Get many posts' },
			{ name: 'Resubmit', value: 'resubmit', description: 'Resubmit a rejected post for approval', action: 'Resubmit a rejected post' },
			{ name: 'Retry', value: 'retry', description: 'Retry a failed post', action: 'Retry a failed post' },
			{ name: 'Schedule', value: 'schedule', description: 'Schedule a post for future publishing', action: 'Schedule a post' },
			{ name: 'Unschedule', value: 'unschedule', description: 'Remove a post from the schedule', action: 'Unschedule a post' },
			{ name: 'Update', value: 'update', description: 'Update a post', action: 'Update a post' },
		],
		default: 'create',
	},
];

export const postFields: INodeProperties[] = [
	// ── Common: post ID ─────────────────────────────────────────
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['get', 'update', 'delete', 'schedule', 'unschedule', 'retry', 'resubmit']),
		description: 'UUID of the post',
	},

	// ── Create ──────────────────────────────────────────────────
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		displayOptions: showFor(['create']),
		description: 'Post body / caption text',
	},
	{
		displayName: 'Platform',
		name: 'socialMedia',
		type: 'options',
		required: true,
		default: 'TWITTER',
		options: [...SOCIAL_MEDIA_OPTIONS],
		displayOptions: showFor(['create']),
	},
	{
		displayName: 'Post Type',
		name: 'postType',
		type: 'options',
		required: true,
		default: 'TEXT',
		options: [...POST_TYPE_OPTIONS],
		displayOptions: showFor(['create']),
	},
	{
		displayName: 'Account Name or ID',
		name: 'accountId',
		type: 'options',
		default: '',
		typeOptions: { loadOptionsMethod: 'getSocialAccounts' },
		displayOptions: showFor(['create']),
		description: 'Connected social account to post from. If not set, the workspace default for the platform is used. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Schedule For',
		name: 'scheduledAt',
		type: 'dateTime',
		default: '',
		displayOptions: showFor(['create']),
		description: 'ISO 8601 datetime to publish at. Leave empty for immediate publishing.',
	},
	{
		displayName: 'Files',
		name: 'files',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		displayOptions: showFor(['create']),
		description: 'Media files to attach. First call the Media → Presign Upload operation to get s3Prefix + fileSrc.',
		options: [
			{
				name: 'file',
				displayName: 'File',
				values: [
					{
						displayName: 'Duration (Seconds)',
						name: 'duration',
						type: 'number',
						default: 0,
						description: 'Required for video files',
					},
					{
						displayName: 'File ID',
						name: 'id',
						type: 'string',
						default: '',
					},
					{
						displayName: 'File Src URL',
						name: 'fileSrc',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Filename',
						name: 'filename',
						type: 'string',
						default: '',
					},
					{
						displayName: 'MIME Type',
						name: 'mimetype',
						type: 'string',
						default: '',
					},
					{
						displayName: 'S3 Prefix',
						name: 's3Prefix',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Size (Bytes)',
						name: 'size',
						type: 'number',
						default: 0
					},
				],
			},
		],
	},
	{
		displayName: 'Metadata',
		name: 'metaData',
		type: 'json',
		default: '',
		displayOptions: showFor(['create', 'update']),
		description: 'Platform-specific metadata as JSON (hashtags, mentions, location, first-comment, etc.)',
	},

	// ── Update ──────────────────────────────────────────────────
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: showFor(['update']),
		options: [
			{ displayName: 'Text', name: 'text', type: 'string', typeOptions: { rows: 4 }, default: '' },
			{ displayName: 'Schedule For', name: 'scheduledAt', type: 'dateTime', default: '' },
		],
	},

	// ── Schedule ────────────────────────────────────────────────
	{
		displayName: 'Schedule For',
		name: 'scheduleFor',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: showFor(['schedule']),
		description: 'ISO 8601 datetime — must be in the future',
	},

	// ── Get Many ────────────────────────────────────────────────
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: showFor(['getMany']),
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: { show: { resource: ['post'], operation: ['getMany'], returnAll: [false] } },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: showFor(['getMany']),
		options: [
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: '',
				options: [{ name: '— Any —', value: '' }, ...POST_STATUS_OPTIONS],
			},
			{
				displayName: 'Platform',
				name: 'socialMedia',
				type: 'options',
				default: '',
				options: [{ name: '— Any —', value: '' }, ...SOCIAL_MEDIA_OPTIONS],
			},
		],
	},

	// ── Calendar ────────────────────────────────────────────────
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: showFor(['getCalendar']),
	},
	{
		displayName: 'End Date',
		name: 'endDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: showFor(['getCalendar']),
	},

	// ── Bulk Delete ─────────────────────────────────────────────
	{
		displayName: 'Post IDs',
		name: 'ids',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		displayOptions: showFor(['bulkDelete']),
		description: 'Comma- or newline-separated list of post UUIDs',
	},
];

export async function executePost(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	switch (operation) {
		case 'create': {
			const text = this.getNodeParameter('text', itemIndex) as string;
			const socialMedia = this.getNodeParameter('socialMedia', itemIndex) as string;
			const postType = this.getNodeParameter('postType', itemIndex) as string;
			const accountId = this.getNodeParameter('accountId', itemIndex, '') as string;
			const scheduledAt = this.getNodeParameter('scheduledAt', itemIndex, '') as string;
			const filesParam = this.getNodeParameter('files', itemIndex, {}) as {
				file?: IDataObject[];
			};
			const metaDataRaw = this.getNodeParameter('metaData', itemIndex, '') as string | object;

			const body: IDataObject = { text, socialMedia, postType };
			if (accountId) body.accountId = accountId;
			if (scheduledAt) body.scheduledAt = scheduledAt;
			if (filesParam?.file?.length) body.files = filesParam.file;
			if (metaDataRaw) {
				body.metaData = typeof metaDataRaw === 'string' ? JSON.parse(metaDataRaw) : metaDataRaw;
			}

			return await soMeApiRequest.call(this, 'POST', '/v1/posts', body);
		}

		case 'get': {
			const postId = this.getNodeParameter('postId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'GET', `/v1/posts/${postId}`);
		}

		case 'getMany': {
			const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
			const filters = this.getNodeParameter('filters', itemIndex, {}) as IDataObject;

			const qs: IDataObject = {};
			if (filters.status) qs.status = filters.status;
			if (filters.socialMedia) qs.socialMedia = filters.socialMedia;

			if (returnAll) {
				return (await soMeApiRequestAllItems.call(this, 'GET', '/v1/posts', qs)) as IDataObject[];
			}
			const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
			const response = (await soMeApiRequest.call(this, 'GET', '/v1/posts', undefined, {
				...qs,
				page: 1,
				limit,
			})) as { data?: IDataObject[] };
			return response?.data ?? [];
		}

		case 'getCalendar': {
			const startDate = this.getNodeParameter('startDate', itemIndex) as string;
			const endDate = this.getNodeParameter('endDate', itemIndex) as string;
			return await soMeApiRequest.call(this, 'GET', '/v1/posts/calendar', undefined, {
				startDate,
				endDate,
			});
		}

		case 'update': {
			const postId = this.getNodeParameter('postId', itemIndex) as string;
			const updateFields = this.getNodeParameter('updateFields', itemIndex, {}) as IDataObject;
			const metaDataRaw = this.getNodeParameter('metaData', itemIndex, '') as string | object;

			const body: IDataObject = { ...updateFields };
			if (metaDataRaw) {
				body.metaData = typeof metaDataRaw === 'string' ? JSON.parse(metaDataRaw) : metaDataRaw;
			}

			return await soMeApiRequest.call(this, 'PATCH', `/v1/posts/${postId}`, body);
		}

		case 'delete': {
			const postId = this.getNodeParameter('postId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'DELETE', `/v1/posts/${postId}`);
		}

		case 'bulkDelete': {
			const idsRaw = this.getNodeParameter('ids', itemIndex) as string;
			const ids = idsRaw
				.split(/[\s,]+/)
				.map((s) => s.trim())
				.filter(Boolean);
			return await soMeApiRequest.call(this, 'POST', '/v1/posts/bulk-delete', { ids });
		}

		case 'schedule': {
			const postId = this.getNodeParameter('postId', itemIndex) as string;
			const scheduleFor = this.getNodeParameter('scheduleFor', itemIndex) as string;
			return await soMeApiRequest.call(this, 'POST', `/v1/posts/${postId}/schedule`, {
				scheduledAt: scheduleFor,
			});
		}

		case 'unschedule': {
			const postId = this.getNodeParameter('postId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'POST', `/v1/posts/${postId}/unschedule`);
		}

		case 'retry': {
			const postId = this.getNodeParameter('postId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'POST', `/v1/posts/${postId}/retry`);
		}

		case 'resubmit': {
			const postId = this.getNodeParameter('postId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'POST', `/v1/posts/${postId}/resubmit`);
		}

		default:
			throw new Error(`Unknown post operation: ${operation}`);
	}
}
