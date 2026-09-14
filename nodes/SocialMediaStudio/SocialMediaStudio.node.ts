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
	getSocialAccounts,
} from './methods/loadOptions';

import { executePost, postFields, postOperations } from './descriptions/PostDescription';
import { executeDraft, draftFields, draftOperations } from './descriptions/DraftDescription';
import { executeMedia, mediaFields, mediaOperations } from './descriptions/MediaDescription';
import { executeSocialAccount, socialAccountFields, socialAccountOperations } from './descriptions/SocialAccountDescription';

export class SocialMediaStudio implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Social media studio',
		name: 'socialMediaStudio',
		icon: {
			light: 'file:somestudio-favicon.svg',
			dark: 'file:somestudio-favicon.dark.svg',
		},
		group: ['output'],
		version: 1,
		usableAsTool: true,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create and schedule posts, drafts, and media across your connected social accounts.',
		defaults: { name: 'Social media studio' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'socialMediaStudioApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'post',
				options: [
					{ name: 'Draft', value: 'draft' },
					{ name: 'Media', value: 'media' },
					{ name: 'Post', value: 'post' },
					{ name: 'Social Account', value: 'socialAccount' },
				],
			},
			...postOperations,
			...postFields,
			...draftOperations,
			...draftFields,
			...mediaOperations,
			...mediaFields,
			...socialAccountOperations,
			...socialAccountFields,
		],
	};

	methods = {
		loadOptions: {
			getSocialAccounts,
			getMediaFolders,
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
					case 'media':          result = await executeMedia.call(this, operation, i); break;
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
