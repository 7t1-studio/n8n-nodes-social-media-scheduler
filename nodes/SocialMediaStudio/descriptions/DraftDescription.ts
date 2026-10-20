import { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { soMeApiRequest, soMeApiRequestAllItems } from '../GenericFunctions';
import { POST_TYPE_OPTIONS, SOCIAL_MEDIA_OPTIONS } from '../types';
import { postingTool } from '../PostingFunctions';
import { applyPostOptions } from '../postOptions';
import { applyAttachmentOptions, postFields } from './PostDescription';
import {
	getResourceId,
	listLimit,
	parseJsonParameter,
	resourceIdFrom,
	resourceLocator,
	unsupportedOperation,
} from './common';

const accountLocator = (
	description: string,
	displayOptions?: INodeProperties['displayOptions'],
) =>
	resourceLocator({
		displayName: 'Account',
		name: 'accountId',
		entity: 'account',
		searchListMethod: 'searchAccounts',
		searchable: true,
		description,
		displayOptions,
	});

const showFor = (operations: string[]) => ({
	show: { resource: ['draft'], operation: operations },
});

export const draftOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['draft'] } },
		options: [
			{
				name: 'Convert to Post',
				value: 'convert',
				description:
					'Turn a draft into a post that publishes now or at a set time',
				action: 'Convert draft to post',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new draft',
				action: 'Create a draft',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a draft',
				action: 'Delete a draft',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a draft',
				action: 'Get a draft',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Retrieve a list of drafts',
				action: 'Get many drafts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a draft',
				action: 'Update a draft',
			},
		],
		default: 'create',
	},
];

/** Post fields that drafts share, shown for the given draft operations. */
const sharedPostFields = (
	names: string[],
	operations: (name: string) => string[],
): INodeProperties[] =>
	postFields
		.filter((field) => names.includes(field.name))
		.map((field) => ({
			...field,
			displayOptions: showFor(operations(field.name)),
		}));

// The order of this list is the order in the editor: the fields that every
// operation needs come first, the optional ones after.
export const draftFields: INodeProperties[] = [
	resourceLocator({
		displayName: 'Draft',
		name: 'draftId',
		entity: 'draft',
		searchListMethod: 'searchDrafts',
		required: true,
		displayOptions: showFor(['get', 'update', 'delete', 'convert']),
		description: 'The draft to use. The list shows the newest drafts first.',
	}),
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		displayOptions: showFor(['create']),
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
	accountLocator(
		'Social account this draft is for. If empty, the workspace default account for the platform is used.',
		showFor(['create', 'convert']),
	),
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: showFor(['update']),
		options: [
			accountLocator('Social account this draft is for'),
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Platform',
				name: 'socialMedia',
				type: 'options',
				options: [...SOCIAL_MEDIA_OPTIONS],
				default: 'TWITTER',
			},
			{
				displayName: 'Post Type',
				name: 'postType',
				type: 'options',
				options: [...POST_TYPE_OPTIONS],
				default: 'TEXT',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
			},
			{ displayName: 'Title', name: 'title', type: 'string', default: '' },
		],
	},
	{
		displayName: 'Schedule For',
		name: 'scheduledAt',
		type: 'dateTime',
		default: '',
		displayOptions: showFor(['convert']),
		description: 'When to publish the post. Leave empty to publish now.',
	},
	...sharedPostFields(
		['libraryFileIds', 'threadParts', 'firstComment', 'tiktok', 'metaData'],
		(name) =>
			name === 'tiktok' || name === 'libraryFileIds'
				? ['create', 'update', 'convert']
				: ['create', 'update'],
	),
	// Drafts keep their media editable through MCP update_draft, unlike posts.
	{
		displayName: 'Clear Media',
		name: 'clearMedia',
		type: 'boolean',
		default: false,
		displayOptions: showFor(['update']),
		description: 'Whether to remove all existing media attachments',
	},
	...sharedPostFields(['clearThread', 'clearFirstComment'], () => ['update']),
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		description: 'Whether to return all results or only up to a given limit',
		default: false,
		displayOptions: showFor(['getMany']),
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		description: 'Max number of results to return',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: {
			show: { resource: ['draft'], operation: ['getMany'], returnAll: [false] },
		},
	},
];

export async function executeDraft(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	switch (operation) {
		case 'create': {
			const body: IDataObject = {
				text: this.getNodeParameter('text', itemIndex),
				socialMedia: this.getNodeParameter('socialMedia', itemIndex),
				postType: this.getNodeParameter('postType', itemIndex),
			};
			const accountId = getResourceId.call(this, 'accountId', itemIndex);
			if (accountId) body.accountId = accountId;
			applyDraftOptions.call(this, body, itemIndex, body.socialMedia);
			return await postingTool.call(this, 'create_draft', body);
		}
		case 'get': {
			const id = getResourceId.call(this, 'draftId', itemIndex);
			return await soMeApiRequest.call(this, 'GET', `/v1/drafts/${id}`);
		}
		case 'getMany':
			return (await soMeApiRequestAllItems.call(
				this,
				'GET',
				'/v1/drafts',
				{},
				listLimit.call(this, itemIndex),
			)) as IDataObject[];
		case 'update': {
			const id = getResourceId.call(this, 'draftId', itemIndex);
			const updateFields = this.getNodeParameter(
				'updateFields',
				itemIndex,
				{},
			) as IDataObject;
			const body: IDataObject = { id, ...updateFields };
			if ('accountId' in updateFields) {
				const accountId = resourceIdFrom(updateFields.accountId);
				if (accountId) body.accountId = accountId;
				else delete body.accountId;
			}
			applyDraftOptions.call(this, body, itemIndex);
			return await postingTool.call(this, 'update_draft', body);
		}
		case 'delete': {
			const id = getResourceId.call(this, 'draftId', itemIndex);
			await soMeApiRequest.call(this, 'DELETE', `/v1/drafts/${id}`);
			return { deleted: true };
		}
		case 'convert': {
			const id = getResourceId.call(this, 'draftId', itemIndex);
			const scheduledAt = this.getNodeParameter(
				'scheduledAt',
				itemIndex,
				'',
			) as string;
			const body: IDataObject = {};
			if (scheduledAt) body.scheduledAt = scheduledAt;
			const accountId = getResourceId.call(this, 'accountId', itemIndex);
			if (accountId) body.accountId = accountId;
			applyDraftOptions.call(this, body, itemIndex);
			return await postingTool.call(this, 'convert_draft', { id, ...body });
		}
		default:
			throw unsupportedOperation.call(this, 'draft', operation);
	}
}

function applyDraftOptions(
	this: IExecuteFunctions,
	body: IDataObject,
	itemIndex: number,
	platform?: unknown,
): void {
	const metadata = parseJsonParameter.call(
		this,
		'metaData',
		'Metadata',
		itemIndex,
	);
	if (metadata) body.metaData = metadata;
	applyPostOptions(body, {
		threadParts: this.getNodeParameter('threadParts', itemIndex, {}),
		firstComment: this.getNodeParameter('firstComment', itemIndex, ''),
		tiktok: this.getNodeParameter('tiktok', itemIndex, {}),
		platform,
	});
	applyAttachmentOptions.call(this, body, itemIndex);
}
