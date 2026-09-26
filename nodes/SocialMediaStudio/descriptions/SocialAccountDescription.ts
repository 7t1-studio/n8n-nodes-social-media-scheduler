import { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { soMeApiRequest, soMeApiRequestAllItems } from '../GenericFunctions';
import { postingTool } from '../PostingFunctions';

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
			{
				name: 'Get TikTok Creator Info',
				value: 'getTikTokCreatorInfo',
				action: 'Get allowed tiktok creator options',
			},
			{
				name: 'List Discord Channels',
				value: 'listDiscordChannels',
				action: 'List discord channels',
			},
			{
				name: 'List Pinterest Boards',
				value: 'listPinterestBoards',
				action: 'List pinterest boards',
			},
			{
				name: 'List Slack Channels',
				value: 'listSlackChannels',
				action: 'List slack channels',
			},
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
		displayOptions: showFor([
			'get',
			'getTikTokCreatorInfo',
			'listPinterestBoards',
			'listDiscordChannels',
			'listSlackChannels',
		]),
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
			show: {
				resource: ['socialAccount'],
				operation: ['getMany'],
				returnAll: [false],
			},
		},
	},
];

export async function executeSocialAccount(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	switch (operation) {
		case 'getTikTokCreatorInfo':
		case 'listPinterestBoards':
		case 'listDiscordChannels':
		case 'listSlackChannels': {
			const tools: Record<string, string> = {
				getTikTokCreatorInfo: 'get_tiktok_creator_info',
				listPinterestBoards: 'list_pinterest_boards',
				listDiscordChannels: 'list_discord_channels',
				listSlackChannels: 'list_slack_channels',
			};
			return await postingTool.call(this, tools[operation], {
				accountId: this.getNodeParameter('accountId', itemIndex),
			});
		}
		case 'get': {
			const id = this.getNodeParameter('accountId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'GET', `/v1/accounts/${id}`);
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
					'/v1/accounts',
				)) as IDataObject[];
			const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
			const r = (await soMeApiRequest.call(
				this,
				'GET',
				'/v1/accounts',
				undefined,
				{ page: 1, limit },
			)) as { data?: IDataObject[] };
			return r?.data ?? [];
		}
		default:
			throw new Error(`Unknown socialAccount operation: ${operation}`);
	}
}
