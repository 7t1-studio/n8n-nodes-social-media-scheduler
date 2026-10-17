import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';

import {
	searchAccounts,
	searchDrafts,
	searchFiles,
	searchFolders,
	searchPosts,
} from './methods/listSearch';
import { outputFields, shapeOutput } from './output';

import { executePost, postFields, postOperations } from './descriptions/PostDescription';
import { executeDraft, draftFields, draftOperations } from './descriptions/DraftDescription';
import { executeMedia, mediaFields, mediaOperations } from './descriptions/MediaDescription';
import { executeSocialAccount, socialAccountFields, socialAccountOperations } from './descriptions/SocialAccountDescription';

export class SocialMediaStudio implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Social Media Studio',
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
		defaults: { name: 'Social Media Studio' },
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
			...outputFields,
		],
	};

	methods = {
		listSearch: {
			searchAccounts,
			searchDrafts,
			searchFiles,
			searchFolders,
			searchPosts,
		},
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
						throw new NodeOperationError(this.getNode(), `The resource '${resource}' is not supported`);
				}
				result = shapeOutput.call(this, resource, operation, result, i);

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
				const itemLabel = ` [Item ${i}]`;
				const message = (error as Error).message ?? '';
				const labeled = message.endsWith(itemLabel) ? message : `${message}${itemLabel}`;
				// Both constructors return the same object for an error of their own class.
				if (error instanceof NodeApiError || error instanceof NodeOperationError) {
					error.message = labeled;
					error.context.itemIndex = i;
				}
				if (error instanceof NodeApiError)
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject);
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i, message: labeled });
			}
		}

		return [returnData];
	}
}
