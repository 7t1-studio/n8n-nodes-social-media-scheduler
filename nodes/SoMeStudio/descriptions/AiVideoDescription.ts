import { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { soMeApiRequest, soMeApiRequestAllItems } from '../GenericFunctions';

const showFor = (operations: string[]) => ({
	show: { resource: ['aiVideo'], operation: operations },
});

export const aiVideoOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['aiVideo'] } },
		options: [
			{ name: 'Delete', value: 'delete', action: 'Delete a generated video' },
			{ name: 'Generate', value: 'generate', action: 'Generate a UGC video' },
			{ name: 'Get', value: 'get', action: 'Get a generated video' },
			{ name: 'Get Many', value: 'getMany', action: 'List generated videos' },
			{ name: 'List Avatars', value: 'listAvatars', action: 'List available AI avatars' },
			{ name: 'List Sounds', value: 'listSounds', action: 'List available background sounds' },
		],
		default: 'generate',
	},
];

export const aiVideoFields: INodeProperties[] = [
	{
		displayName: 'Video ID',
		name: 'videoId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['get', 'delete']),
	},
	{
		displayName: 'Script',
		name: 'script',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		displayOptions: showFor(['generate']),
		description: 'Voiceover / spoken script for the avatar',
	},
	{
		displayName: 'Avatar ID',
		name: 'avatarId',
		type: 'string',
		default: '',
		displayOptions: showFor(['generate']),
		description: 'Use the List Avatars operation to discover IDs',
	},
	{
		displayName: 'Sound ID',
		name: 'soundId',
		type: 'string',
		default: '',
		displayOptions: showFor(['generate']),
		description: 'Use the List Sounds operation to discover IDs',
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
				default: '9:16',
				options: [
					{ name: 'Landscape (16:9)', value: '16:9' },
					{ name: 'Square (1:1)', value: '1:1' },
					{ name: 'Vertical (9:16)', value: '9:16' },
				],
			},
			{ displayName: 'Voice ID', name: 'voiceId', type: 'string', default: '' },
			{ displayName: 'Hook (Opening Line)', name: 'hook', type: 'string', default: '' },
			{ displayName: 'Background', name: 'background', type: 'string', default: '' },
		],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		description: 'Whether to return all results or only up to a given limit',
		default: false,
		displayOptions: showFor(['getMany', 'listAvatars', 'listSounds']),
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		description: 'Max number of results to return',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: {
			show: {
				resource: ['aiVideo'],
				operation: ['getMany', 'listAvatars', 'listSounds'],
				returnAll: [false],
			},
		},
	},
];

export async function executeAiVideo(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	const listOp = async (path: string) => {
		const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
		if (returnAll) return (await soMeApiRequestAllItems.call(this, 'GET', path)) as IDataObject[];
		const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
		const r = (await soMeApiRequest.call(this, 'GET', path, undefined, { page: 1, limit })) as { data?: IDataObject[] };
		return r?.data ?? [];
	};

	switch (operation) {
		case 'generate': {
			const script = this.getNodeParameter('script', itemIndex) as string;
			const avatarId = this.getNodeParameter('avatarId', itemIndex, '') as string;
			const soundId = this.getNodeParameter('soundId', itemIndex, '') as string;
			const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
			const body: IDataObject = { script, ...options };
			if (avatarId) body.avatarId = avatarId;
			if (soundId) body.soundId = soundId;
			return await soMeApiRequest.call(this, 'POST', '/v1/ai/video/generate', body);
		}
		case 'get': {
			const id = this.getNodeParameter('videoId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'GET', `/v1/ai/video/${id}`);
		}
		case 'getMany':
			return await listOp('/v1/ai/video');
		case 'listAvatars':
			return await listOp('/v1/ai/video/avatars');
		case 'listSounds':
			return await listOp('/v1/ai/video/sounds');
		case 'delete': {
			const id = this.getNodeParameter('videoId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'DELETE', `/v1/ai/video/${id}`);
		}
		default:
			throw new Error(`Unknown aiVideo operation: ${operation}`);
	}
}
