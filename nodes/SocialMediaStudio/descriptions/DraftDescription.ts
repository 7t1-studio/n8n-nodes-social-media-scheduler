import { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { soMeApiRequest, soMeApiRequestAllItems } from '../GenericFunctions';
import { POST_TYPE_OPTIONS, SOCIAL_MEDIA_OPTIONS } from '../types';

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
			{ name: 'Convert to Post', value: 'convert', action: 'Convert draft to post' },
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
		displayOptions: showFor(['create']),
		description: 'Social account this draft is for. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: showFor(['update']),
		options: [
			{ displayName: 'Text', name: 'text', type: 'string', typeOptions: { rows: 4 }, default: '' },
		],
	},
	{
		displayName: 'Schedule For',
		name: 'scheduledAt',
		type: 'dateTime',
		default: '',
		displayOptions: showFor(['convert']),
		description: 'Optional ISO datetime — convert as scheduled post. Leave empty to publish immediately.',
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
		displayOptions: { show: { resource: ['draft'], operation: ['getMany'], returnAll: [false] } },
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
			const accountId = this.getNodeParameter('accountId', itemIndex, '') as string;
			if (accountId) body.accountId = accountId;
			return await soMeApiRequest.call(this, 'POST', '/v1/drafts', body);
		}
		case 'get': {
			const id = this.getNodeParameter('draftId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'GET', `/v1/drafts/${id}`);
		}
		case 'getMany': {
			const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
			if (returnAll) return (await soMeApiRequestAllItems.call(this, 'GET', '/v1/drafts')) as IDataObject[];
			const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
			const r = (await soMeApiRequest.call(this, 'GET', '/v1/drafts', undefined, { page: 1, limit })) as { data?: IDataObject[] };
			return r?.data ?? [];
		}
		case 'update': {
			const id = this.getNodeParameter('draftId', itemIndex) as string;
			const updateFields = this.getNodeParameter('updateFields', itemIndex, {}) as IDataObject;
			return await soMeApiRequest.call(this, 'PATCH', `/v1/drafts/${id}`, updateFields);
		}
		case 'delete': {
			const id = this.getNodeParameter('draftId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'DELETE', `/v1/drafts/${id}`);
		}
		case 'convert': {
			const id = this.getNodeParameter('draftId', itemIndex) as string;
			const scheduledAt = this.getNodeParameter('scheduledAt', itemIndex, '') as string;
			const body: IDataObject = {};
			if (scheduledAt) body.scheduledAt = scheduledAt;
			return await soMeApiRequest.call(this, 'POST', `/v1/drafts/${id}/convert`, body);
		}
		default:
			throw new Error(`Unknown draft operation: ${operation}`);
	}
}
