import { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { soMeApiRequest, soMeApiRequestAllItems } from '../GenericFunctions';

const showFor = (operations: string[]) => ({
	show: { resource: ['aiImage'], operation: operations },
});

export const aiImageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['aiImage'] } },
		options: [
			{ name: 'Delete', value: 'delete', action: 'Delete a generated image' },
			{ name: 'Generate', value: 'generate', action: 'Generate an AI image' },
			{ name: 'Get', value: 'get', action: 'Get a generated image' },
			{ name: 'Get Many', value: 'getMany', action: 'List generated images' },
		],
		default: 'generate',
	},
];

export const aiImageFields: INodeProperties[] = [
	{
		displayName: 'Image ID',
		name: 'imageId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['get', 'delete']),
	},
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		displayOptions: showFor(['generate']),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor(['generate']),
		options: [
			{
				displayName: 'Aspect Ratio',
				name: 'aspectRatio',
				type: 'options',
				default: '1:1',
				options: [
					{ name: 'Landscape (16:9)', value: '16:9' },
					{ name: 'Portrait (9:16)', value: '9:16' },
					{ name: 'Square (1:1)', value: '1:1' },
					{ name: 'Story (4:5)', value: '4:5' },
				],
			},
			{ displayName: 'Style', name: 'style', type: 'string', default: '' },
			{ displayName: 'Negative Prompt', name: 'negativePrompt', type: 'string', default: '' },
			{ displayName: 'Quantity', name: 'quantity', type: 'number', default: 1, typeOptions: { minValue: 1, maxValue: 4 } },
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
		displayOptions: { show: { resource: ['aiImage'], operation: ['getMany'], returnAll: [false] } },
	},
];

export async function executeAiImage(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	switch (operation) {
		case 'generate': {
			const prompt = this.getNodeParameter('prompt', itemIndex) as string;
			const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
			return await soMeApiRequest.call(this, 'POST', '/v1/ai/generate/image', { prompt, ...options });
		}
		case 'get': {
			const id = this.getNodeParameter('imageId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'GET', `/v1/ai/images/${id}`);
		}
		case 'getMany': {
			const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
			if (returnAll) return (await soMeApiRequestAllItems.call(this, 'GET', '/v1/ai/images')) as IDataObject[];
			const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
			const r = (await soMeApiRequest.call(this, 'GET', '/v1/ai/images', undefined, { page: 1, limit })) as { data?: IDataObject[] };
			return r?.data ?? [];
		}
		case 'delete': {
			const id = this.getNodeParameter('imageId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'DELETE', `/v1/ai/images/${id}`);
		}
		default:
			throw new Error(`Unknown aiImage operation: ${operation}`);
	}
}
