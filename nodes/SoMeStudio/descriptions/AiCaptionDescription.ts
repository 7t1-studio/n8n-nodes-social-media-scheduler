import { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { soMeApiRequest, soMeApiRequestAllItems } from '../GenericFunctions';

const showFor = (operations: string[]) => ({
	show: { resource: ['aiCaption'], operation: operations },
});

export const aiCaptionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['aiCaption'] } },
		options: [
			{ name: 'Generate JSON', value: 'generateJson', action: 'Generate structured JSON via AI' },
			{ name: 'Generate Text', value: 'generateText', action: 'Generate AI caption' },
			{ name: 'Get History', value: 'getHistory', action: 'Get AI prompt history' },
		],
		default: 'generateText',
	},
];

export const aiCaptionFields: INodeProperties[] = [
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		displayOptions: showFor(['generateText', 'generateJson']),
	},
	{
		displayName: 'Additional Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor(['generateText', 'generateJson']),
		options: [
			{ displayName: 'Tone', name: 'tone', type: 'string', default: '' },
			{ displayName: 'Platform', name: 'platform', type: 'string', default: '' },
			{ displayName: 'Max Length', name: 'maxLength', type: 'number', default: 280 },
			{
				displayName: 'JSON Schema',
				name: 'schema',
				type: 'json',
				default: '',
				description: 'Optional JSON schema for the response (only for Generate JSON)',
			},
		],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		description: 'Whether to return all results or only up to a given limit',
		default: false,
		displayOptions: showFor(['getHistory']),
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		description: 'Max number of results to return',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: { show: { resource: ['aiCaption'], operation: ['getHistory'], returnAll: [false] } },
	},
];

export async function executeAiCaption(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	switch (operation) {
		case 'generateText': {
			const prompt = this.getNodeParameter('prompt', itemIndex) as string;
			const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
			return await soMeApiRequest.call(this, 'POST', '/v1/ai/generate/text', { prompt, ...options });
		}
		case 'generateJson': {
			const prompt = this.getNodeParameter('prompt', itemIndex) as string;
			const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
			let schema = options.schema;
			if (typeof schema === 'string' && schema) {
				try { schema = JSON.parse(schema as string); } catch { /* leave as string */ }
			}
			return await soMeApiRequest.call(this, 'POST', '/ai/completion/json', {
				prompt,
				...options,
				schema,
			});
		}
		case 'getHistory': {
			const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
			if (returnAll) return (await soMeApiRequestAllItems.call(this, 'GET', '/v1/ai/history')) as IDataObject[];
			const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
			const r = (await soMeApiRequest.call(this, 'GET', '/v1/ai/history', undefined, { page: 1, limit })) as { data?: IDataObject[] };
			return r?.data ?? [];
		}
		default:
			throw new Error(`Unknown aiCaption operation: ${operation}`);
	}
}
