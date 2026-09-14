import { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { soMeApiRequest, soMeApiRequestAllItems } from '../GenericFunctions';

const showFor = (operations: string[]) => ({
	show: { resource: ['savedReply'], operation: operations },
});

export const savedReplyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['savedReply'] } },
		options: [
			{ name: 'Create', value: 'create', action: 'Create a saved reply' },
			{ name: 'Delete', value: 'delete', action: 'Delete a saved reply' },
			{ name: 'Get', value: 'get', action: 'Get a saved reply' },
			{ name: 'Get Many', value: 'getMany', action: 'List saved replies' },
			{ name: 'Update', value: 'update', action: 'Update a saved reply' },
		],
		default: 'getMany',
	},
];

export const savedReplyFields: INodeProperties[] = [
	{
		displayName: 'Saved Reply Name or ID',
		name: 'savedReplyId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: { loadOptionsMethod: 'getSavedReplies' },
		displayOptions: showFor(['get', 'update', 'delete']),
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['create']),
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		displayOptions: showFor(['create']),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: showFor(['update']),
		options: [
			{ displayName: 'Title', name: 'title', type: 'string', default: '' },
			{ displayName: 'Content', name: 'content', type: 'string', typeOptions: { rows: 4 }, default: '' },
		],
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
		displayOptions: { show: { resource: ['savedReply'], operation: ['getMany'], returnAll: [false] } },
	},
];

export async function executeSavedReply(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	switch (operation) {
		case 'create': {
			const title = this.getNodeParameter('title', itemIndex) as string;
			const content = this.getNodeParameter('content', itemIndex) as string;
			return await soMeApiRequest.call(this, 'POST', '/v1/inbox/saved-replies', { title, content });
		}
		case 'get': {
			const id = this.getNodeParameter('savedReplyId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'GET', `/v1/inbox/saved-replies/${id}`);
		}
		case 'getMany': {
			const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
			if (returnAll) return (await soMeApiRequestAllItems.call(this, 'GET', '/v1/inbox/saved-replies')) as IDataObject[];
			const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
			const r = (await soMeApiRequest.call(this, 'GET', '/v1/inbox/saved-replies', undefined, { page: 1, limit })) as { data?: IDataObject[] };
			return r?.data ?? [];
		}
		case 'update': {
			const id = this.getNodeParameter('savedReplyId', itemIndex) as string;
			const updateFields = this.getNodeParameter('updateFields', itemIndex, {}) as IDataObject;
			return await soMeApiRequest.call(this, 'PATCH', `/v1/inbox/saved-replies/${id}`, updateFields);
		}
		case 'delete': {
			const id = this.getNodeParameter('savedReplyId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'DELETE', `/v1/inbox/saved-replies/${id}`);
		}
		default:
			throw new Error(`Unknown savedReply operation: ${operation}`);
	}
}
