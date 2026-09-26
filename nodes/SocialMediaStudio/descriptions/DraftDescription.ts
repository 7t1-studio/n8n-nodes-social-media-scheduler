import { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { soMeApiRequest, soMeApiRequestAllItems } from '../GenericFunctions';
import { POST_TYPE_OPTIONS, SOCIAL_MEDIA_OPTIONS } from '../types';
import { postingTool } from '../PostingFunctions';
import { applyPostOptions } from '../postOptions';
import { applyAttachmentOptions, postFields } from './PostDescription';

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
				action: 'Convert draft to post',
			},
			{ name: 'Create', value: 'create', action: 'Create a draft' },
			{ name: 'Delete', value: 'delete', action: 'Delete a draft' },
			{ name: 'Get', value: 'get', action: 'Get a draft' },
			{ name: 'Get Many', value: 'getMany', action: 'Get many drafts' },
			{ name: 'Update', value: 'update', action: 'Update a draft' },
		],
		default: 'create',
	},
];

export const draftFields: INodeProperties[] = [
	...postFields
		.filter((field) =>
			[
				'threadParts',
				'firstComment',
				'tiktok',
				'libraryFileIds',
				'metaData',
				'clearMedia',
				'clearThread',
				'clearFirstComment',
			].includes(field.name),
		)
		.map((field) => ({
			...field,
			displayOptions: showFor(
				field.name === 'tiktok' || field.name === 'libraryFileIds'
					? ['create', 'update', 'convert']
					: field.name.startsWith('clear')
						? ['update']
						: ['create', 'update'],
			),
		})),
	{
		displayName: 'Draft ID',
		name: 'draftId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['get', 'update', 'delete', 'convert']),
	},
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
	{
		displayName: 'Account Name or ID',
		name: 'accountId',
		type: 'options',
		default: '',
		typeOptions: { loadOptionsMethod: 'getSocialAccounts' },
		displayOptions: showFor(['create', 'convert']),
		description:
			'Social account this draft is for. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: showFor(['update']),
		options: [
			{
				displayName: 'Account ID',
				name: 'accountId',
				type: 'string',
				default: '',
			},
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
		description:
			'Optional ISO datetime — convert as scheduled post. Leave empty to publish immediately.',
	},
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
			const accountId = this.getNodeParameter(
				'accountId',
				itemIndex,
				'',
			) as string;
			if (accountId) body.accountId = accountId;
			applyDraftOptions.call(this, body, itemIndex);
			return await postingTool.call(this, 'create_draft', body);
		}
		case 'get': {
			const id = this.getNodeParameter('draftId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'GET', `/v1/drafts/${id}`);
		}
		case 'getMany': {
			const returnAll = this.getNodeParameter(
				'returnAll',
				itemIndex,
				false,
			) as boolean;
			if (returnAll)
				return (await soMeApiRequestAllItems.call(
					this,
					'GET',
					'/v1/drafts',
				)) as IDataObject[];
			const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
			const r = (await soMeApiRequest.call(
				this,
				'GET',
				'/v1/drafts',
				undefined,
				{ page: 1, limit },
			)) as { data?: IDataObject[] };
			return r?.data ?? [];
		}
		case 'update': {
			const id = this.getNodeParameter('draftId', itemIndex) as string;
			const updateFields = this.getNodeParameter(
				'updateFields',
				itemIndex,
				{},
			) as IDataObject;
			const body: IDataObject = { id, ...updateFields };
			applyDraftOptions.call(this, body, itemIndex);
			return await postingTool.call(this, 'update_draft', body);
		}
		case 'delete': {
			const id = this.getNodeParameter('draftId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'DELETE', `/v1/drafts/${id}`);
		}
		case 'convert': {
			const id = this.getNodeParameter('draftId', itemIndex) as string;
			const scheduledAt = this.getNodeParameter(
				'scheduledAt',
				itemIndex,
				'',
			) as string;
			const body: IDataObject = {};
			if (scheduledAt) body.scheduledAt = scheduledAt;
			const accountId = this.getNodeParameter(
				'accountId',
				itemIndex,
				'',
			) as string;
			if (accountId) body.accountId = accountId;
			applyDraftOptions.call(this, body, itemIndex);
			return await postingTool.call(this, 'convert_draft', { id, ...body });
		}
		default:
			throw new Error(`Unknown draft operation: ${operation}`);
	}
}

function applyDraftOptions(
	this: IExecuteFunctions,
	body: IDataObject,
	itemIndex: number,
): void {
	const metadata = this.getNodeParameter('metaData', itemIndex, '') as
		| string
		| IDataObject;
	if (metadata)
		body.metaData =
			typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
	applyPostOptions(body, {
		threadParts: this.getNodeParameter('threadParts', itemIndex, {}),
		firstComment: this.getNodeParameter('firstComment', itemIndex, ''),
		tiktok: this.getNodeParameter('tiktok', itemIndex, {}),
	});
	applyAttachmentOptions.call(this, body, itemIndex);
}
