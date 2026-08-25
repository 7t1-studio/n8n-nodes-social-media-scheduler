import { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { soMeApiRequest, soMeApiRequestAllItems } from '../GenericFunctions';

const showFor = (operations: string[]) => ({
	show: { resource: ['inbox'], operation: operations },
});

export const inboxOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['inbox'] } },
		options: [
			{ name: 'Delete Conversation', value: 'deleteConversation', action: 'Delete a conversation' },
			{ name: 'Get Messages', value: 'getMessages', action: 'Get conversation messages' },
			{ name: 'List Conversations', value: 'listConversations', action: 'List conversations' },
			{ name: 'Reply', value: 'reply', action: 'Reply to a conversation' },
			{ name: 'Subscribe Account', value: 'subscribe', action: 'Enable inbox for a social account' },
			{ name: 'Unsubscribe Account', value: 'unsubscribe', action: 'Disable inbox for a social account' },
			{ name: 'Update Conversation', value: 'updateConversation', action: 'Update a conversation' },
		],
		default: 'listConversations',
	},
];

export const inboxFields: INodeProperties[] = [
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['getMessages', 'reply', 'updateConversation', 'deleteConversation']),
	},
	{
		displayName: 'Reply Text',
		name: 'message',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		displayOptions: showFor(['reply']),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: showFor(['updateConversation']),
		options: [
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'open',
				options: [
					{ name: 'Archived', value: 'archived' },
					{ name: 'Open', value: 'open' },
					{ name: 'Resolved', value: 'resolved' },
				],
			},
			{ displayName: 'Read', name: 'read', type: 'boolean', default: false },
		],
	},
	{
		displayName: 'Account Name or ID',
		name: 'accountId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: { loadOptionsMethod: 'getSocialAccounts' },
		displayOptions: showFor(['subscribe', 'unsubscribe']),
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: showFor(['listConversations']),
		options: [
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: '',
				options: [
					{ name: 'Archived', value: 'archived' },
					{ name: 'Open', value: 'open' },
					{ name: 'Resolved', value: 'resolved' },
					{ name: '— Any —', value: '' },
				],
			},
			{ displayName: 'Account ID', name: 'accountId', type: 'string', default: '' },
		],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		description: 'Whether to return all results or only up to a given limit',
		default: false,
		displayOptions: showFor(['listConversations', 'getMessages']),
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		description: 'Max number of results to return',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: {
			show: { resource: ['inbox'], operation: ['listConversations', 'getMessages'], returnAll: [false] },
		},
	},
];

export async function executeInbox(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	switch (operation) {
		case 'listConversations': {
			const filters = this.getNodeParameter('filters', itemIndex, {}) as IDataObject;
			const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
			const qs: IDataObject = { ...filters };
			if (returnAll) return (await soMeApiRequestAllItems.call(this, 'GET', '/v1/inbox/conversations', qs)) as IDataObject[];
			const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
			const r = (await soMeApiRequest.call(this, 'GET', '/v1/inbox/conversations', undefined, { ...qs, page: 1, limit })) as { data?: IDataObject[] };
			return r?.data ?? [];
		}
		case 'getMessages': {
			const id = this.getNodeParameter('conversationId', itemIndex) as string;
			const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
			if (returnAll) return (await soMeApiRequestAllItems.call(this, 'GET', `/v1/inbox/conversations/${id}/messages`)) as IDataObject[];
			const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
			const r = (await soMeApiRequest.call(this, 'GET', `/v1/inbox/conversations/${id}/messages`, undefined, { page: 1, limit })) as { data?: IDataObject[] };
			return r?.data ?? [];
		}
		case 'reply': {
			const id = this.getNodeParameter('conversationId', itemIndex) as string;
			const message = this.getNodeParameter('message', itemIndex) as string;
			return await soMeApiRequest.call(this, 'POST', `/v1/inbox/conversations/${id}/reply`, { message });
		}
		case 'updateConversation': {
			const id = this.getNodeParameter('conversationId', itemIndex) as string;
			const updateFields = this.getNodeParameter('updateFields', itemIndex, {}) as IDataObject;
			return await soMeApiRequest.call(this, 'PATCH', `/v1/inbox/conversations/${id}`, updateFields);
		}
		case 'deleteConversation': {
			const id = this.getNodeParameter('conversationId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'DELETE', `/v1/inbox/conversations/${id}`);
		}
		case 'subscribe': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'POST', '/v1/inbox/subscribe', { accountId });
		}
		case 'unsubscribe': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'DELETE', '/v1/inbox/unsubscribe', undefined, { accountId });
		}
		default:
			throw new Error(`Unknown inbox operation: ${operation}`);
	}
}
