import { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { soMeApiRequest, soMeApiRequestAllItems } from '../GenericFunctions';

const showFor = (operations: string[]) => ({
	show: { resource: ['comment'], operation: operations },
});

export const commentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['comment'] } },
		options: [
			{ name: 'Add', value: 'add', action: 'Add a comment to a post' },
			{ name: 'Delete', value: 'delete', action: 'Delete a comment' },
			{ name: 'List for Post', value: 'list', action: 'List comments for a post' },
			{ name: 'Mark Read', value: 'markRead', action: 'Mark all comments on a post as read' },
			{ name: 'Update', value: 'update', action: 'Update a comment' },
		],
		default: 'list',
	},
];

export const commentFields: INodeProperties[] = [
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['list', 'add', 'markRead']),
	},
	{
		displayName: 'Comment ID',
		name: 'commentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['update', 'delete']),
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		displayOptions: showFor(['add', 'update']),
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		description: 'Whether to return all results or only up to a given limit',
		default: false,
		displayOptions: showFor(['list']),
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		description: 'Max number of results to return',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: { show: { resource: ['comment'], operation: ['list'], returnAll: [false] } },
	},
];

export async function executeComment(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	switch (operation) {
		case 'list': {
			const postId = this.getNodeParameter('postId', itemIndex) as string;
			const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
			if (returnAll) return (await soMeApiRequestAllItems.call(this, 'GET', `/v1/posts/${postId}/comments`)) as IDataObject[];
			const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
			const r = (await soMeApiRequest.call(this, 'GET', `/v1/posts/${postId}/comments`, undefined, { page: 1, limit })) as { data?: IDataObject[] };
			return r?.data ?? [];
		}
		case 'add': {
			const postId = this.getNodeParameter('postId', itemIndex) as string;
			const content = this.getNodeParameter('content', itemIndex) as string;
			return await soMeApiRequest.call(this, 'POST', `/v1/posts/${postId}/comments`, { content });
		}
		case 'update': {
			const id = this.getNodeParameter('commentId', itemIndex) as string;
			const content = this.getNodeParameter('content', itemIndex) as string;
			return await soMeApiRequest.call(this, 'PATCH', `/v1/posts/comments/${id}`, { content });
		}
		case 'delete': {
			const id = this.getNodeParameter('commentId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'DELETE', `/v1/posts/comments/${id}`);
		}
		case 'markRead': {
			const postId = this.getNodeParameter('postId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'POST', `/v1/posts/${postId}/comments/mark-read`);
		}
		default:
			throw new Error(`Unknown comment operation: ${operation}`);
	}
}
