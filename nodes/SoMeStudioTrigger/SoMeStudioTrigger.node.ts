import {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	NodeOperationError,
} from 'n8n-workflow';
import { createHmac, timingSafeEqual } from 'crypto';
import { soMeApiRequest } from '../SoMeStudio/GenericFunctions';
import { categoriesForEvents, eventOptionsForTrigger } from './events';

interface SubscriptionResponse {
	id: string;
	secret: string;
	url?: string;
	events?: string[];
}

export class SoMeStudioTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'so-me.studio Trigger',
		name: 'soMeStudioTrigger',
		icon: 'file:somestudio.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description:
			'Starts a workflow when a so-me.studio event fires (post published, inbox message received, AI generation finished, etc.).',
		defaults: { name: 'so-me.studio Trigger' },
		inputs: [],
		outputs: ['main'],
		credentials: [{ name: 'soMeStudioApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				options: eventOptionsForTrigger(),
				description: 'Subscribe to one or more so-me.studio webhook events',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description:
					'Optional description shown in the so-me.studio webhook subscriptions list. Defaults to the workflow name.',
			},
			{
				displayName: 'Verify Signature',
				name: 'verifySignature',
				type: 'boolean',
				default: true,
				description:
					'Whether to require a valid HMAC-SHA256 signature on incoming webhooks. Disable only for debugging.',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const staticData = this.getWorkflowStaticData('node') as IDataObject;

				const response = (await soMeApiRequest.call(
					this,
					'GET',
					'/v1/webhooks/subscriptions',
					undefined,
					{ page: 1, limit: 100 },
				)) as { data?: SubscriptionResponse[] } | SubscriptionResponse[];

				const list = Array.isArray(response) ? response : response?.data ?? [];
				const match = list.find((s) => s.url === webhookUrl);

				if (match) {
					staticData.subscriptionId = match.id;
					return true;
				}
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string[];
				const description =
					(this.getNodeParameter('description') as string) ||
					`n8n: ${this.getWorkflow().name ?? 'workflow'}`;

				if (!events?.length) {
					throw new NodeOperationError(this.getNode(), 'Select at least one event to subscribe to');
				}

				const subscription = (await soMeApiRequest.call(
					this,
					'POST',
					'/v1/webhooks/subscriptions',
					{
						url: webhookUrl,
						categories: categoriesForEvents(events),
						events,
						description,
					},
				)) as SubscriptionResponse;

				const staticData = this.getWorkflowStaticData('node') as IDataObject;
				staticData.subscriptionId = subscription.id;
				staticData.secret = subscription.secret;
				staticData.subscribedEvents = events;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as IDataObject;
				const id = staticData.subscriptionId as string | undefined;
				if (!id) return true;

				try {
					await soMeApiRequest.call(this, 'DELETE', `/v1/webhooks/subscriptions/${id}`);
				} catch {
					// Subscription may already be gone — treat as cleaned up
				}

				delete staticData.subscriptionId;
				delete staticData.secret;
				delete staticData.subscribedEvents;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const headers = this.getHeaderData() as Record<string, string | undefined>;
		const verifySignature = this.getNodeParameter('verifySignature', true) as boolean;
		const subscribedEvents = this.getNodeParameter('events') as string[];
		const staticData = this.getWorkflowStaticData('node') as IDataObject;

		// Resolve raw body. n8n delivers the parsed body in req.body; rawBody for HMAC.
		const rawBody = (req as any).rawBody?.toString?.('utf8') ?? JSON.stringify(req.body ?? {});

		if (verifySignature) {
			const provided = headers['x-webhook-signature'] ?? headers['X-Webhook-Signature'];
			const secret = staticData.secret as string | undefined;

			if (!secret) {
				return {
					webhookResponse: { status: 401, body: { error: 'No webhook secret on record' } },
					noWebhookResponse: false,
				};
			}
			if (!provided) {
				return {
					webhookResponse: { status: 401, body: { error: 'Missing X-Webhook-Signature header' } },
					noWebhookResponse: false,
				};
			}

			const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
			const match = safeEqualHex(expected, provided);
			if (!match) {
				return {
					webhookResponse: { status: 401, body: { error: 'Invalid signature' } },
					noWebhookResponse: false,
				};
			}
		}

		const body = (req.body ?? {}) as { event?: string; category?: string; timestamp?: string; data?: IDataObject };
		const event = body.event;

		// Filter against the user's selected events
		if (event && subscribedEvents?.length && !subscribedEvents.includes(event)) {
			return { webhookResponse: { status: 200, body: { ignored: true, event } }, noWebhookResponse: false };
		}

		const payload: IDataObject = {
			event: body.event,
			category: body.category,
			timestamp: body.timestamp,
			data: body.data ?? {},
		};

		return {
			workflowData: [this.helpers.returnJsonArray([payload])],
		};
	}
}

function safeEqualHex(expectedHex: string, providedHex: string): boolean {
	try {
		const a = Buffer.from(expectedHex, 'hex');
		const b = Buffer.from(providedHex, 'hex');
		if (a.length !== b.length) return false;
		return timingSafeEqual(a, b);
	} catch {
		return false;
	}
}
