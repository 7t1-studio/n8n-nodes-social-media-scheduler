import {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';

import {
	getMediaFolders,
	getSavedReplies,
	getSocialAccounts,
	getTemplates,
} from './methods/loadOptions';

import { executePost, postFields, postOperations } from './descriptions/PostDescription';
import { executeDraft, draftFields, draftOperations } from './descriptions/DraftDescription';
import { executeInbox, inboxFields, inboxOperations } from './descriptions/InboxDescription';
import { executeComment, commentFields, commentOperations } from './descriptions/CommentDescription';
import { executeMedia, mediaFields, mediaOperations } from './descriptions/MediaDescription';
import { executeAnalytics, analyticsFields, analyticsOperations } from './descriptions/AnalyticsDescription';
import { executeSavedReply, savedReplyFields, savedReplyOperations } from './descriptions/SavedReplyDescription';
import { executeSocialAccount, socialAccountFields, socialAccountOperations } from './descriptions/SocialAccountDescription';

export class SoMeStudio implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'so-me studio - Social media management',
		name: 'soMeStudio',
		icon: { light: 'file:somestudio.svg', dark: 'file:somestudio.dark.svg' },
		group: ['output'],
		version: 1,
		usableAsTool: true,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Schedule posts, manage inbox, media, analytics, and social accounts.',
		defaults: { name: 'so-me studio - Social media management' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'soMeStudioApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'post',
				options: [
					{ name: 'Analytics', value: 'analytics' },
					{ name: 'Comment', value: 'comment' },
					{ name: 'Draft', value: 'draft' },
					{ name: 'Inbox', value: 'inbox' },
					{ name: 'Media', value: 'media' },
					{ name: 'Post', value: 'post' },
					{ name: 'Saved Reply', value: 'savedReply' },
					{ name: 'Social Account', value: 'socialAccount' },
				],
			},
			...postOperations,
			...postFields,
			...draftOperations,
			...draftFields,
			...inboxOperations,
			...inboxFields,
			...commentOperations,
			...commentFields,
			...mediaOperations,
			...mediaFields,
			...analyticsOperations,
			...analyticsFields,
			...savedReplyOperations,
			...savedReplyFields,
			...socialAccountOperations,
			...socialAccountFields,
		],
	};

	methods = {
		loadOptions: {
			getSocialAccounts,
			getMediaFolders,
			getTemplates,
			getSavedReplies,
		} as Record<string, (this: ILoadOptionsFunctions) => Promise<INodePropertyOptions[]>>,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				let result: unknown;
				switch (resource) {
					case 'post':           result = await executePost.call(this, operation, i); break;
					case 'draft':          result = await executeDraft.call(this, operation, i); break;
					case 'inbox':          result = await executeInbox.call(this, operation, i); break;
					case 'comment':        result = await executeComment.call(this, operation, i); break;
					case 'media':          result = await executeMedia.call(this, operation, i); break;
					case 'analytics':      result = await executeAnalytics.call(this, operation, i); break;
					case 'savedReply':     result = await executeSavedReply.call(this, operation, i); break;
					case 'socialAccount':  result = await executeSocialAccount.call(this, operation, i); break;
					default:
						throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`);
				}

				if (Array.isArray(result)) {
					returnData.push(
						...result.map((r) => ({ json: r as IDataObject, pairedItem: { item: i } })),
					);
				} else if (result !== undefined && result !== null) {
					returnData.push({ json: result as IDataObject, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
