import { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { soMeApiRequest, soMeApiRequestAllItems } from '../GenericFunctions';

const showFor = (operations: string[]) => ({
	show: { resource: ['socialAccount'], operation: operations },
});

export const socialAccountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['socialAccount'] } },
		options: [
			{ name: 'Get', value: 'get', action: 'Get a connected account' },
			{ name: 'Get Many', value: 'getMany', action: 'List connected accounts' },
		],
		default: 'getMany',
	},
];

export const socialAccountFields: INodeProperties[] = [
	{
		displayName: 'Account Name or ID',
		name: 'accountId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: { loadOptionsMethod: 'getSocialAccounts' },
		displayOptions: showFor(['get']),
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
		displayOptions: { show: { resource: ['socialAccount'], operation: ['getMany'], returnAll: [false] } },
	},
];

export async function executeSocialAccount(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	switch (operation) {
		case 'get': {
			const id = this.getNodeParameter('accountId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'GET', `/v1/accounts/${id}`);
		}
		case 'getMany': {
			const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
			if (returnAll) return (await soMeApiRequestAllItems.call(this, 'GET', '/v1/accounts')) as IDataObject[];
			const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
			const r = (await soMeApiRequest.call(this, 'GET', '/v1/accounts', undefined, { page: 1, limit })) as { data?: IDataObject[] };
			return r?.data ?? [];
		}
		default:
			throw new Error(`Unknown socialAccount operation: ${operation}`);
	}
}
