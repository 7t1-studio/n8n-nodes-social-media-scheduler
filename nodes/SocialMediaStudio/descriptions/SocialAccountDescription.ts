import { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { soMeApiRequest, soMeApiRequestAllItems } from '../GenericFunctions';
import { postingTool } from '../PostingFunctions';
import {
	getResourceId,
	listLimit,
	resourceLocator,
	unsupportedOperation,
} from './common';

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
			// n8n lint requires sentence case in `action`, so brand names are
			// written in full only in `description`.
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a connected social account',
				action: 'Get a connected account',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Retrieve a list of the connected social accounts',
				action: 'List connected accounts',
			},
			{
				name: 'Get TikTok Creator Info',
				value: 'getTikTokCreatorInfo',
				description:
					'Retrieve the privacy levels and options that a TikTok social account allows',
				action: 'Get allowed tiktok creator options',
			},
			{
				name: 'List Discord Channels',
				value: 'listDiscordChannels',
				description:
					'Retrieve the Discord channels that a social account can post to',
				action: 'List discord channels',
			},
			{
				name: 'List Pinterest Boards',
				value: 'listPinterestBoards',
				description:
					'Retrieve the Pinterest boards that a social account can post to',
				action: 'List pinterest boards',
			},
			{
				name: 'List Slack Channels',
				value: 'listSlackChannels',
				description:
					'Retrieve the Slack channels that a social account can post to',
				action: 'List slack channels',
			},
		],
		default: 'getMany',
	},
];

export const socialAccountFields: INodeProperties[] = [
	resourceLocator({
		displayName: 'Account',
		name: 'accountId',
		entity: 'account',
		searchListMethod: 'searchAccounts',
		searchable: true,
		required: true,
		displayOptions: showFor([
			'get',
			'getTikTokCreatorInfo',
			'listPinterestBoards',
			'listDiscordChannels',
			'listSlackChannels',
		]),
		description: 'The connected social account to use',
	}),
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
				accountId: getResourceId.call(this, 'accountId', itemIndex),
			});
		}
		case 'get': {
			const id = getResourceId.call(this, 'accountId', itemIndex);
			return await soMeApiRequest.call(this, 'GET', `/v1/accounts/${id}`);
		}
		case 'getMany':
			return (await soMeApiRequestAllItems.call(
				this,
				'GET',
				'/v1/accounts',
				{},
				listLimit.call(this, itemIndex),
			)) as IDataObject[];
		default:
			throw unsupportedOperation.call(this, 'socialAccount', operation);
	}
}
