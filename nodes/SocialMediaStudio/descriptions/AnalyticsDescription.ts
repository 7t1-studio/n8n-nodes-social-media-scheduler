import { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { soMeApiRequest } from '../GenericFunctions';

const showFor = (operations: string[]) => ({
	show: { resource: ['analytics'], operation: operations },
});

export const analyticsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['analytics'] } },
		options: [
			{ name: 'Facebook Page', value: 'facebookPage', action: 'Get facebook page analytics' },
			{ name: 'Facebook Posts', value: 'facebookPosts', action: 'Get facebook posts analytics' },
			{ name: 'Facebook Videos', value: 'facebookVideos', action: 'Get facebook videos analytics' },
			{ name: 'Instagram Account', value: 'instagramAccount', action: 'Get instagram account analytics' },
			{ name: 'Instagram Media', value: 'instagramMedia', action: 'Get instagram media analytics' },
			{ name: 'Instagram Stories', value: 'instagramStories', action: 'Get instagram stories analytics' },
			{ name: 'LinkedIn Page', value: 'linkedinPage', action: 'Get linked in page analytics' },
			{ name: 'LinkedIn Posts', value: 'linkedinPosts', action: 'Get linked in posts analytics' },
			{ name: 'Platform Analytics', value: 'getPlatform', action: 'Get platform wide analytics for a social account' },
			{ name: 'Post Analytics', value: 'getPost', action: 'Get analytics for a single post' },
			{ name: 'Twitter / X Account', value: 'twitterAccount', action: 'Get twitter x account analytics' },
			{ name: 'Twitter / X Content', value: 'twitterContent', action: 'Get twitter x content analytics' },
			{ name: 'WhatsApp Account', value: 'whatsappAccount', action: 'Get whats app account analytics' },
			{ name: 'YouTube Channel', value: 'youtubeChannel', action: 'Get you tube channel analytics' },
			{ name: 'YouTube Videos', value: 'youtubeVideos', action: 'Get you tube videos analytics' },
		],
		default: 'getPlatform',
	},
];

export const analyticsFields: INodeProperties[] = [
	{
		displayName: 'Account Name or ID',
		name: 'accountId',
		type: 'options',
		default: '',
		typeOptions: { loadOptionsMethod: 'getSocialAccounts' },
		displayOptions: showFor(['getPlatform']),
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Identifier',
		name: 'identifier',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['analytics'],
				operation: [
					'twitterAccount',
					'twitterContent',
					'linkedinPage',
					'linkedinPosts',
					'instagramAccount',
					'instagramMedia',
					'instagramStories',
					'facebookPage',
					'facebookPosts',
					'facebookVideos',
					'youtubeChannel',
					'youtubeVideos',
					'whatsappAccount',
				],
			},
		},
		description: 'Account ID or platform-specific handle (depends on operation)',
	},
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['getPost']),
	},
	{
		displayName: 'Date Range',
		name: 'dateRange',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['analytics'],
				operation: [
					'getPlatform',
					'twitterAccount',
					'twitterContent',
					'linkedinPage',
					'linkedinPosts',
					'instagramAccount',
					'instagramMedia',
					'instagramStories',
					'facebookPage',
					'facebookPosts',
					'facebookVideos',
					'youtubeChannel',
					'youtubeVideos',
					'whatsappAccount',
				],
			},
		},
		options: [
			{ displayName: 'Start Date', name: 'startDate', type: 'dateTime', default: '' },
			{ displayName: 'End Date', name: 'endDate', type: 'dateTime', default: '' },
		],
	},
];

const PATH_MAP: Record<string, (id: string) => string> = {
	twitterAccount: (id) => `/v1/analytics/x/${id}/account`,
	twitterContent: (id) => `/v1/analytics/x/${id}/content`,
	linkedinPage: (id) => `/v1/analytics/linkedin/${id}/page`,
	linkedinPosts: (id) => `/v1/analytics/linkedin/${id}/posts`,
	instagramAccount: (id) => `/v1/analytics/instagram/${id}/account`,
	instagramMedia: (id) => `/v1/analytics/instagram/${id}/media`,
	instagramStories: (id) => `/v1/analytics/instagram/${id}/stories`,
	facebookPage: (id) => `/v1/analytics/facebook/${id}/page`,
	facebookPosts: (id) => `/v1/analytics/facebook/${id}/posts`,
	facebookVideos: (id) => `/v1/analytics/facebook/${id}/videos`,
	youtubeChannel: (id) => `/v1/analytics/youtube/${id}/channel`,
	youtubeVideos: (id) => `/v1/analytics/youtube/${id}/videos`,
	whatsappAccount: (id) => `/v1/analytics/whatsapp/${id}/account`,
};

export async function executeAnalytics(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'getPlatform') {
		const accountId = this.getNodeParameter('accountId', itemIndex) as string;
		const dateRange = this.getNodeParameter('dateRange', itemIndex, {}) as IDataObject;
		return await soMeApiRequest.call(this, 'GET', `/v1/analytics/platform/${accountId}`, undefined, dateRange);
	}
	if (operation === 'getPost') {
		const postId = this.getNodeParameter('postId', itemIndex) as string;
		return await soMeApiRequest.call(this, 'GET', `/v1/analytics/post/${postId}`);
	}

	const builder = PATH_MAP[operation];
	if (!builder) throw new Error(`Unknown analytics operation: ${operation}`);

	const identifier = this.getNodeParameter('identifier', itemIndex) as string;
	const dateRange = this.getNodeParameter('dateRange', itemIndex, {}) as IDataObject;
	return await soMeApiRequest.call(this, 'GET', builder(identifier), undefined, dateRange);
}
