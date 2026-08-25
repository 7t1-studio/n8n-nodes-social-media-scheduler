import { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { soMeApiRequest, soMeApiRequestAllItems } from '../GenericFunctions';
import { eventOptionsForTrigger, categoriesForEvents } from '../../SoMeStudioTrigger/events';

const showFor = (operations: string[]) => ({
	show: { resource: ['webhook'], operation: operations },
});

export const webhookOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['webhook'] } },
		options: [
			{ name: 'Create Subscription', value: 'createSubscription', action: 'Create a webhook subscription' },
			{ name: 'Delete Subscription', value: 'deleteSubscription', action: 'Delete a webhook subscription' },
			{ name: 'Get Subscription', value: 'getSubscription', action: 'Get a webhook subscription' },
			{ name: 'List Events', value: 'listEvents', action: 'List available webhook event types' },
			{ name: 'List Subscriptions', value: 'listSubscriptions', action: 'List webhook subscriptions' },
			{ name: 'Retry Delivery', value: 'retryDelivery', action: 'Retry a failed webhook delivery' },
			{ name: 'Test Subscription', value: 'testSubscription', action: 'Send a test webhook delivery' },
			{ name: 'Update Subscription', value: 'updateSubscription', action: 'Update a webhook subscription' },
		],
		default: 'createSubscription',
	},
];

export const webhookFields: INodeProperties[] = [
	{
		displayName: 'Subscription ID',
		name: 'subscriptionId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['getSubscription', 'updateSubscription', 'deleteSubscription', 'testSubscription']),
	},
	{
		displayName: 'Delivery ID',
		name: 'deliveryId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['retryDelivery']),
	},
	{
		displayName: 'Target URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['createSubscription']),
		description: 'HTTPS URL that should receive webhook POSTs',
	},
	{
		displayName: 'Events',
		name: 'events',
		type: 'multiOptions',
		required: true,
		default: [],
		options: eventOptionsForTrigger(),
		displayOptions: showFor(['createSubscription']),
		description: 'Event types to subscribe to',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		displayOptions: showFor(['createSubscription', 'updateSubscription']),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: showFor(['updateSubscription']),
		options: [
			{ displayName: 'URL', name: 'url', type: 'string', default: '' },
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				default: [],
				options: eventOptionsForTrigger(),
			},
			{ displayName: 'Active', name: 'isActive', type: 'boolean', default: true },
		],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		description: 'Whether to return all results or only up to a given limit',
		default: false,
		displayOptions: showFor(['listSubscriptions']),
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		description: 'Max number of results to return',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: {
			show: { resource: ['webhook'], operation: ['listSubscriptions'], returnAll: [false] },
		},
	},
];

export async function executeWebhook(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	switch (operation) {
		case 'createSubscription': {
			const url = this.getNodeParameter('url', itemIndex) as string;
			const events = this.getNodeParameter('events', itemIndex, []) as string[];
			const description = this.getNodeParameter('description', itemIndex, '') as string;
			const body: IDataObject = {
				url,
				categories: categoriesForEvents(events),
				events,
			};
			if (description) body.description = description;
			return await soMeApiRequest.call(this, 'POST', '/v1/webhooks/subscriptions', body);
		}
		case 'getSubscription': {
			const id = this.getNodeParameter('subscriptionId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'GET', `/v1/webhooks/subscriptions/${id}`);
		}
		case 'listSubscriptions': {
			const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
			if (returnAll) {
				return (await soMeApiRequestAllItems.call(this, 'GET', '/v1/webhooks/subscriptions')) as IDataObject[];
			}
			const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
			const r = (await soMeApiRequest.call(this, 'GET', '/v1/webhooks/subscriptions', undefined, { page: 1, limit })) as { data?: IDataObject[] };
			return r?.data ?? [];
		}
		case 'updateSubscription': {
			const id = this.getNodeParameter('subscriptionId', itemIndex) as string;
			const updateFields = this.getNodeParameter('updateFields', itemIndex, {}) as IDataObject;
			if (Array.isArray(updateFields.events)) {
				updateFields.categories = categoriesForEvents(updateFields.events as string[]);
			}
			return await soMeApiRequest.call(this, 'PATCH', `/v1/webhooks/subscriptions/${id}`, updateFields);
		}
		case 'deleteSubscription': {
			const id = this.getNodeParameter('subscriptionId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'DELETE', `/v1/webhooks/subscriptions/${id}`);
		}
		case 'testSubscription': {
			const id = this.getNodeParameter('subscriptionId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'POST', `/v1/webhooks/subscriptions/${id}/test`);
		}
		case 'listEvents':
			return await soMeApiRequest.call(this, 'GET', '/v1/webhooks/events');
		case 'retryDelivery': {
			const id = this.getNodeParameter('deliveryId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'POST', `/v1/webhooks/deliveries/${id}/retry`);
		}
		default:
			throw new Error(`Unknown webhook operation: ${operation}`);
	}
}
