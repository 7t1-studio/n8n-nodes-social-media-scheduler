import { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { soMeApiRequest, soMeApiRequestAllItems } from '../GenericFunctions';
import {
	getResourceId,
	listLimit,
	parseJsonParameter,
	resourceLocator,
	unsupportedOperation,
} from './common';
import { parseFileIds, postingTool } from '../PostingFunctions';
import {
	platformNames,
	POST_STATUS_OPTIONS,
	POST_TYPE_OPTIONS,
	SOCIAL_MEDIA_OPTIONS,
} from '../types';
import {
	applyPostOptions,
	buildFiles,
	FIRST_COMMENT_PLATFORMS,
	THREAD_PLATFORMS,
	TIKTOK_PRIVACY_LEVEL_OPTIONS,
} from '../postOptions';

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
			{
				name: 'Bulk Delete',
				value: 'bulkDelete',
				description: 'Delete many posts at once',
				action: 'Bulk delete posts',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new post',
				action: 'Create a post',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a post',
				action: 'Delete a post',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single post by ID',
				action: 'Get a post',
			},
			{
				name: 'Get Calendar',
				value: 'getCalendar',
				description: 'Get posts in a date range for calendar view',
				action: 'Get calendar posts',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Retrieve a list of posts',
				action: 'Get many posts',
			},
			{
				name: 'Resubmit',
				value: 'resubmit',
				description: 'Resubmit a rejected post for approval',
				action: 'Resubmit a rejected post',
			},
			{
				name: 'Retry',
				value: 'retry',
				description: 'Retry a failed post',
				action: 'Retry a failed post',
			},
			{
				name: 'Schedule',
				value: 'schedule',
				description: 'Schedule a post for future publishing',
				action: 'Schedule a post',
			},
			{
				name: 'Unschedule',
				value: 'unschedule',
				description: 'Remove a post from the schedule',
				action: 'Unschedule a post',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a post',
				action: 'Update a post',
			},
		],
		default: 'create',
	},
];

// The order of this list is the order in the editor: the fields that every
// operation needs come first, the optional ones after.
export const postFields: INodeProperties[] = [
	// ── Common: post ID ─────────────────────────────────────────
	resourceLocator({
		displayName: 'Post',
		name: 'postId',
		entity: 'post',
		searchListMethod: 'searchPosts',
		required: true,
		displayOptions: showFor([
			'get',
			'update',
			'delete',
			'schedule',
			'unschedule',
			'retry',
			'resubmit',
		]),
		description: 'The post to use. The list shows the newest posts first.',
	}),

	// ── Create ──────────────────────────────────────────────────
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		displayOptions: showFor(['create']),
		description: 'The text or caption of the post',
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
	resourceLocator({
		displayName: 'Account',
		name: 'accountId',
		entity: 'account',
		searchListMethod: 'searchAccounts',
		searchable: true,
		displayOptions: showFor(['create']),
		description:
			'Connected social account to post from. If empty, the workspace default account for the platform is used.',
	}),
	{
		displayName: 'Schedule For',
		name: 'scheduledAt',
		type: 'dateTime',
		default: '',
		displayOptions: showFor(['create']),
		description: 'When to publish the post. Leave empty to publish now.',
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
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
			},
			{
				displayName: 'Schedule For',
				name: 'scheduledAt',
				type: 'dateTime',
				default: '',
			},
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
		description: 'When to publish the post. Must be in the future.',
	},

	// ── Media (create only: the API cannot change the media of a post) ──
	{
		displayName: 'Media Library File IDs',
		name: 'libraryFileIds',
		type: 'string',
		default: '',
		displayOptions: showFor(['create']),
		description:
			'Comma-separated IDs of media library files. Use Media → Upload to Library, which also checks the upload.',
	},
	{
		displayName: 'Files',
		name: 'files',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		displayOptions: showFor(['create']),
		description:
			'Files uploaded with Media → Upload or Media → Get Upload URL. Copy the file URL and storage key from that output. Leave empty when you use Media Library File IDs.',
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
						description: 'The file ID that the upload returned',
					},
					{
						displayName: 'File URL',
						name: 'fileSrc',
						type: 'string',
						default: '',
						description: 'The file URL that the upload returned',
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
						displayName: 'Size (Bytes)',
						name: 'size',
						type: 'number',
						default: 0,
					},
					{
						displayName: 'Storage Key',
						name: 's3Prefix',
						type: 'string',
						default: '',
						description: 'The storage key that the upload returned',
					},
				],
			},
		],
	},

	// ── Posting options ─────────────────────────────────────────
	{
		displayName: 'Thread Parts',
		name: 'threadParts',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, sortable: true },
		default: {},
		displayOptions: showFor(['create', 'update', 'schedule']),
		description: `Posts that follow the head post, in order. The Text field above is the head post, so the first part here is the second post of the chain. Supported on ${platformNames(THREAD_PLATFORMS)}; any other platform returns an error. Limits per part: Twitter / X 280 characters, Threads 500, Bluesky 300, Mastodon 500; 24 parts at most.`,
		options: [
			{
				name: 'part',
				displayName: 'Part',
				values: [
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						typeOptions: { rows: 3 },
						default: '',
						description: 'Text of this part of the chain',
					},
					{
						displayName: 'File IDs',
						name: 'fileIds',
						type: 'string',
						default: '',
						description:
							'Comma-separated IDs of media library files to attach to this part. The file must stay in the library until the post publishes.',
					},
				],
			},
		],
	},
	{
		displayName: 'First Comment',
		name: 'firstComment',
		type: 'string',
		typeOptions: { rows: 2 },
		default: '',
		displayOptions: showFor(['create', 'update', 'schedule']),
		description: `One comment posted automatically under the post right after it publishes, for hashtags or a link. Supported on ${platformNames(FIRST_COMMENT_PLATFORMS)}; another platform publishes the post without the comment and returns a warning. Leave empty to keep any existing comment. With Thread Parts the comment goes under the last part of the chain.`,
	},
	{
		displayName: 'TikTok Options',
		name: 'tiktok',
		type: 'collection',
		placeholder: 'Add TikTok Option',
		default: {},
		displayOptions: showFor(['create', 'update', 'schedule']),
		description:
			'TikTok only. TikTok rejects every post that carries no privacy level. On create the node sends these options only when Platform is TikTok. On update or schedule, Social Media Studio rejects them for a post on another platform.',
		options: [
			{
				displayName: 'Allow Comments',
				name: 'allowComments',
				type: 'boolean',
				default: true,
				description: 'Whether viewers can comment on the post',
			},
			{
				displayName: 'Allow Duet',
				name: 'allowDuet',
				type: 'boolean',
				default: true,
				description: 'Whether viewers can duet the video. Video only.',
			},
			{
				displayName: 'Allow Stitch',
				name: 'allowStitch',
				type: 'boolean',
				default: true,
				description: 'Whether viewers can stitch the video. Video only.',
			},
			{
				displayName: 'Brand Content',
				name: 'brandContentToggle',
				type: 'boolean',
				default: false,
				description:
					'Whether the post is a paid partnership that promotes a third-party brand',
			},
			{
				displayName: 'Brand Organic',
				name: 'brandOrganicToggle',
				type: 'boolean',
				default: false,
				description: "Whether the post promotes the creator's own business",
			},
			{
				displayName: 'Privacy Level',
				name: 'privacyLevel',
				type: 'options',
				default: 'PUBLIC_TO_EVERYONE',
				options: [...TIKTOK_PRIVACY_LEVEL_OPTIONS],
				description:
					'Who can see the post. Required for TikTok. Check the creator info of the account first — a private account cannot use Public to Everyone, and an unusable value returns an error.',
			},
		],
	},
	{
		displayName: 'Metadata',
		name: 'metaData',
		type: 'json',
		default: '',
		displayOptions: showFor(['create', 'update']),
		description:
			'Platform options as JSON, for example hashtags, mentions or a location. The fields above win over the same option in this JSON.',
	},
	{
		displayName: 'Clear Thread',
		name: 'clearThread',
		type: 'boolean',
		default: false,
		displayOptions: showFor(['update', 'schedule']),
		description: 'Whether to remove the existing thread parts',
	},
	{
		displayName: 'Clear First Comment',
		name: 'clearFirstComment',
		type: 'boolean',
		default: false,
		displayOptions: showFor(['update', 'schedule']),
		description: 'Whether to remove the existing first comment',
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
		displayOptions: {
			show: { resource: ['post'], operation: ['getMany'], returnAll: [false] },
		},
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
				options: [{ name: 'All', value: '' }, ...POST_STATUS_OPTIONS],
			},
			{
				displayName: 'Platform',
				name: 'socialMedia',
				type: 'options',
				default: '',
				options: [{ name: 'All', value: '' }, ...SOCIAL_MEDIA_OPTIONS],
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
		description: 'Comma- or newline-separated list of post IDs',
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
			const socialMedia = this.getNodeParameter(
				'socialMedia',
				itemIndex,
			) as string;
			const postType = this.getNodeParameter('postType', itemIndex) as string;
			const accountId = getResourceId.call(this, 'accountId', itemIndex);
			const scheduledAt = this.getNodeParameter(
				'scheduledAt',
				itemIndex,
				'',
			) as string;
			const files = buildFiles(this.getNodeParameter('files', itemIndex, {}));
			const metaData = parseJsonParameter.call(
				this,
				'metaData',
				'Metadata',
				itemIndex,
			);

			const body: IDataObject = { text, socialMedia, postType };
			if (accountId) body.accountId = accountId;
			if (scheduledAt) body.scheduledAt = scheduledAt;
			if (files) body.files = files;
			if (metaData) body.metaData = metaData;

			applyPostOptions(body, {
				threadParts: this.getNodeParameter('threadParts', itemIndex, {}),
				firstComment: this.getNodeParameter('firstComment', itemIndex, ''),
				tiktok: this.getNodeParameter('tiktok', itemIndex, {}),
				platform: socialMedia,
			});

			applyAttachmentOptions.call(this, body, itemIndex);
			return await soMeApiRequest.call(this, 'POST', '/v1/posts', body);
		}

		case 'get': {
			const postId = getResourceId.call(this, 'postId', itemIndex);
			return await soMeApiRequest.call(this, 'GET', `/v1/posts/${postId}`);
		}

		case 'getMany': {
			const filters = this.getNodeParameter(
				'filters',
				itemIndex,
				{},
			) as IDataObject;

			const qs: IDataObject = {};
			if (filters.status) qs.status = filters.status;
			if (filters.socialMedia) qs.socialMedia = filters.socialMedia;

			return (await soMeApiRequestAllItems.call(
				this,
				'GET',
				'/v1/posts',
				qs,
				listLimit.call(this, itemIndex),
			)) as IDataObject[];
		}

		case 'getCalendar': {
			const startDate = this.getNodeParameter('startDate', itemIndex) as string;
			const endDate = this.getNodeParameter('endDate', itemIndex) as string;
			return await soMeApiRequest.call(
				this,
				'GET',
				'/v1/posts/calendar',
				undefined,
				{
					startDate,
					endDate,
				},
			);
		}

		case 'update': {
			const postId = getResourceId.call(this, 'postId', itemIndex);
			const updateFields = this.getNodeParameter(
				'updateFields',
				itemIndex,
				{},
			) as IDataObject;
			const metaData = parseJsonParameter.call(
				this,
				'metaData',
				'Metadata',
				itemIndex,
			);

			const body: IDataObject = { ...updateFields };
			if (metaData) body.metaData = metaData;

			applyPostOptions(body, {
				threadParts: this.getNodeParameter('threadParts', itemIndex, {}),
				firstComment: this.getNodeParameter('firstComment', itemIndex, ''),
				tiktok: this.getNodeParameter('tiktok', itemIndex, {}),
			});

			applyAttachmentOptions.call(this, body, itemIndex, false);
			return await soMeApiRequest.call(
				this,
				'PATCH',
				`/v1/posts/${postId}`,
				body,
			);
		}

		case 'delete': {
			const postId = getResourceId.call(this, 'postId', itemIndex);
			await soMeApiRequest.call(this, 'DELETE', `/v1/posts/${postId}`);
			return { deleted: true };
		}

		case 'bulkDelete': {
			const idsRaw = this.getNodeParameter('ids', itemIndex) as string;
			const ids = idsRaw
				.split(/[\s,]+/)
				.map((s) => s.trim())
				.filter(Boolean);
			return await soMeApiRequest.call(this, 'POST', '/v1/posts/bulk-delete', {
				ids,
			});
		}

		case 'schedule': {
			const postId = getResourceId.call(this, 'postId', itemIndex);
			const scheduleFor = this.getNodeParameter(
				'scheduleFor',
				itemIndex,
			) as string;
			const body: IDataObject = { scheduledAt: scheduleFor };
			applyPostOptions(body, {
				threadParts: this.getNodeParameter('threadParts', itemIndex, {}),
				firstComment: this.getNodeParameter('firstComment', itemIndex, ''),
				tiktok: this.getNodeParameter('tiktok', itemIndex, {}),
			});
			applyAttachmentOptions.call(this, body, itemIndex, false);
			return await postingTool.call(this, 'schedule_post', {
				id: postId,
				...body,
			});
		}

		case 'unschedule': {
			const postId = getResourceId.call(this, 'postId', itemIndex);
			return await soMeApiRequest.call(
				this,
				'POST',
				`/v1/posts/${postId}/unschedule`,
			);
		}

		case 'retry': {
			const postId = getResourceId.call(this, 'postId', itemIndex);
			return await soMeApiRequest.call(
				this,
				'POST',
				`/v1/posts/${postId}/retry`,
			);
		}

		case 'resubmit': {
			const postId = getResourceId.call(this, 'postId', itemIndex);
			return await soMeApiRequest.call(
				this,
				'POST',
				`/v1/posts/${postId}/resubmit`,
			);
		}

		default:
			throw unsupportedOperation.call(this, 'post', operation);
	}
}

/**
 * Adds the media library files and the clear switches. Post Update and
 * Schedule pass `includeMedia: false`: PATCH /v1/posts/:id drops `fileIds`,
 * so the node does not offer media there.
 */
export function applyAttachmentOptions(
	this: IExecuteFunctions,
	body: IDataObject,
	itemIndex: number,
	includeMedia = true,
): void {
	if (includeMedia) {
		const ids = parseFileIds(
			this.getNodeParameter('libraryFileIds', itemIndex, '') as string,
		);
		if (ids.length) body.fileIds = ids;
		if (this.getNodeParameter('clearMedia', itemIndex, false))
			body.fileIds = [];
	}
	if (this.getNodeParameter('clearThread', itemIndex, false))
		body.threadParts = [];
	if (this.getNodeParameter('clearFirstComment', itemIndex, false))
		body.firstComment = '';
}
