import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';
import { soMeApiRequest, soMeApiRequestAllItems } from '../GenericFunctions';
import { POST_TYPE_OPTIONS, SOCIAL_MEDIA_OPTIONS } from '../types';
import { postingTool } from '../PostingFunctions';
import { getResourceId, resourceLocator, unsupportedOperation } from './common';

const folderLocator = (
	displayName: string,
	name: string,
	description: string,
	operations: string[],
	required = false,
) =>
	resourceLocator({
		displayName,
		name,
		entity: 'folder',
		searchListMethod: 'searchFolders',
		required,
		description,
		displayOptions: showFor(operations),
	});

const showFor = (operations: string[]) => ({
	show: { resource: ['media'], operation: operations },
});

export const mediaOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['media'] } },
		options: [
			{
				name: 'Bulk Delete',
				value: 'bulkDelete',
				action: 'Delete many files at once',
			},
			{
				name: 'Create Folder',
				value: 'createFolder',
				action: 'Create a folder',
			},
			{ name: 'Delete', value: 'delete', action: 'Delete a file' },
			{
				name: 'Delete Folder',
				value: 'deleteFolder',
				action: 'Delete a folder',
			},
			{
				name: 'Get File',
				value: 'get',
				action: 'Get or verify an uploaded media file',
			},
			{
				name: 'Get Many Files',
				value: 'list',
				action: 'List files and folders',
			},
			{
				name: 'Get Many Folders',
				value: 'listFolders',
				action: 'List media folders',
			},
			{
				name: 'Get Rules',
				value: 'getRules',
				action: 'Get the media rules table',
			},
			{
				name: 'Move File',
				value: 'move',
				action: 'Move a file to another folder',
			},
			{ name: 'Move Folder', value: 'moveFolder', action: 'Move a folder' },
			{
				name: 'Presign Library Upload',
				value: 'presignLibraryUpload',
				action: 'Reserve library files for upload',
			},
			{
				name: 'Presign Upload',
				value: 'presignUpload',
				action: 'Get a presigned upload URL',
			},
			{ name: 'Rename File', value: 'rename', action: 'Rename a file' },
			{
				name: 'Rename Folder',
				value: 'renameFolder',
				action: 'Rename a folder',
			},
			{ name: 'Search', value: 'search', action: 'Search files by name' },
			{
				name: 'Upload',
				value: 'upload',
				action: 'Upload a file from a binary input',
			},
			{
				name: 'Upload to Library',
				value: 'uploadLibrary',
				action: 'Upload and verify a library file',
			},
			{
				name: 'Validate',
				value: 'validate',
				action: 'Validate media against every destination',
			},
		],
		default: 'upload',
	},
];

export const mediaFields: INodeProperties[] = [
	{
		displayName: 'Verify Upload',
		name: 'verifyUpload',
		type: 'boolean',
		default: false,
		displayOptions: showFor(['get']),
		description: 'Whether to verify the stored file bytes, MIME type, and size',
	},
	folderLocator(
		'Library Folder',
		'libraryFolderId',
		'The folder to upload into. Leave empty to upload to the root folder.',
		['uploadLibrary', 'presignLibraryUpload'],
	),
	// IDs
	resourceLocator({
		displayName: 'File',
		name: 'fileId',
		entity: 'file',
		searchListMethod: 'searchFiles',
		searchable: true,
		required: true,
		displayOptions: showFor(['get', 'delete', 'move', 'rename']),
		description:
			'The media library file to use. The list shows the root folder; type a name to search every folder.',
	}),
	folderLocator(
		'Folder',
		'folderId',
		'The media library folder to use',
		['deleteFolder', 'renameFolder', 'moveFolder'],
		true,
	),
	// Upload (binary input)
	{
		displayName: 'Binary Property',
		name: 'binaryProperty',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: showFor(['upload', 'uploadLibrary']),
		description: 'Name of the binary property containing the file to upload',
	},
	{
		displayName: 'Filename',
		name: 'filename',
		type: 'string',
		default: '',
		displayOptions: showFor(['upload', 'uploadLibrary']),
		description:
			'Override the filename. Defaults to the binary input fileName.',
	},
	{
		displayName: 'Post Type',
		name: 'postType',
		type: 'options',
		default: 'IMAGE',
		options: [
			{ name: 'Image', value: 'IMAGE' },
			{ name: 'Reel', value: 'REEL' },
			{ name: 'Story', value: 'STORY' },
			{ name: 'Video', value: 'VIDEO' },
		],
		displayOptions: showFor(['upload', 'presignUpload']),
	},
	{
		displayName: 'Platform',
		name: 'socialMedia',
		type: 'options',
		default: 'INSTAGRAM',
		options: [
			{ name: 'Facebook', value: 'FACEBOOK' },
			{ name: 'Instagram', value: 'INSTAGRAM' },
			{ name: 'LinkedIn', value: 'LINKEDIN' },
			{ name: 'Pinterest', value: 'PINTEREST' },
			{ name: 'Threads', value: 'THREADS' },
			{ name: 'TikTok', value: 'TIKTOK' },
			{ name: 'Twitter / X', value: 'TWITTER' },
			{ name: 'YouTube', value: 'YOUTUBE' },
		],
		displayOptions: showFor(['upload', 'presignUpload']),
	},
	// Presign without binary
	{
		displayName: 'Files',
		name: 'presignFiles',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		displayOptions: showFor(['presignUpload', 'presignLibraryUpload']),
		options: [
			{
				name: 'file',
				displayName: 'File',
				values: [
					{
						displayName: 'Filename',
						name: 'filename',
						type: 'string',
						default: '',
					},
					{
						displayName: 'MIME Type',
						name: 'mimetype',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Size (Bytes)',
						name: 'size',
						type: 'number',
						default: 0,
					},
				],
			},
		],
	},
	// Validate
	{
		displayName: 'File IDs',
		name: 'validateFileIds',
		type: 'string',
		typeOptions: { rows: 2 },
		required: true,
		default: '',
		displayOptions: showFor(['validate']),
		description:
			'Comma- or newline-separated media library UUIDs to check. Every file is measured from its own bytes.',
	},
	{
		displayName: 'Targets',
		name: 'targets',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		displayOptions: showFor(['validate']),
		description:
			'Destinations to check the files against. Each result reports status, limits, issues and warnings. A dimension or aspect-ratio issue carries measured, required, fix and suggestedDimensions, so a workflow can crop the file to a size the platform accepts.',
		options: [
			{
				name: 'target',
				displayName: 'Target',
				values: [
					{
						displayName: 'Platform',
						name: 'socialMedia',
						type: 'options',
						default: 'INSTAGRAM',
						options: [...SOCIAL_MEDIA_OPTIONS],
					},
					{
						displayName: 'Post Type',
						name: 'postType',
						type: 'options',
						default: 'IMAGE',
						options: [...POST_TYPE_OPTIONS],
					},
				],
			},
		],
	},
	// Rules
	{
		displayName: 'Rule Filters',
		name: 'ruleFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: showFor(['getRules']),
		description:
			'Narrow the returned rules table. Without a filter the whole table is returned: allowed types, file and total size, count, duration, width, height, aspect ratio, video codecs and frame rate per platform and post type.',
		options: [
			{
				displayName: 'Platform',
				name: 'socialMedia',
				type: 'options',
				default: 'INSTAGRAM',
				options: [...SOCIAL_MEDIA_OPTIONS],
			},
			{
				displayName: 'Post Type',
				name: 'postType',
				type: 'options',
				default: 'IMAGE',
				options: [...POST_TYPE_OPTIONS],
			},
		],
	},
	// Search
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['search']),
	},
	// Bulk delete
	{
		displayName: 'File IDs',
		name: 'fileIds',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		displayOptions: showFor(['bulkDelete']),
		description: 'Comma- or newline-separated list of file UUIDs',
	},
	// Move file/folder targets
	folderLocator(
		'Target Folder',
		'targetFolderId',
		'The folder to move into. Leave empty to move to the root folder.',
		['move', 'moveFolder'],
	),
	// Rename target
	{
		displayName: 'New Name',
		name: 'newName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['rename', 'renameFolder']),
	},
	// Create folder
	{
		displayName: 'Folder Name',
		name: 'folderName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['createFolder']),
	},
	folderLocator(
		'Parent Folder',
		'parentFolderId',
		'The folder to create the new folder in. Leave empty to create it in the root folder.',
		['createFolder'],
	),
	// List
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		description: 'Whether to return all results or only up to a given limit',
		default: false,
		displayOptions: showFor(['list', 'search', 'listFolders']),
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
				resource: ['media'],
				operation: ['list', 'search', 'listFolders'],
				returnAll: [false],
			},
		},
	},
];

export async function executeMedia(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	switch (operation) {
		case 'get':
			return await postingTool.call(this, 'get_media_file', {
				id: getResourceId.call(this, 'fileId', itemIndex),
				verifyUpload: this.getNodeParameter('verifyUpload', itemIndex, false),
			});
		case 'listFolders': {
			if (this.getNodeParameter('returnAll', itemIndex, false))
				return (await soMeApiRequestAllItems.call(
					this,
					'GET',
					'/v1/media/folders',
				)) as IDataObject[];
			const result = (await soMeApiRequest.call(
				this,
				'GET',
				'/v1/media/folders',
				undefined,
				{ page: 1, limit: this.getNodeParameter('limit', itemIndex, 50) },
			)) as { data?: IDataObject[] };
			return result.data ?? [];
		}
		case 'presignLibraryUpload':
		case 'uploadLibrary': {
			const folderId = getResourceId.call(this, 'libraryFolderId', itemIndex);
			const body: IDataObject = {};
			if (folderId) body.folderId = folderId;
			let buffer: Buffer | undefined;
			let mimetype = '';
			if (operation === 'uploadLibrary') {
				const property = this.getNodeParameter(
					'binaryProperty',
					itemIndex,
					'data',
				) as string;
				const binary = this.helpers.assertBinaryData(itemIndex, property);
				buffer = await this.helpers.getBinaryDataBuffer(itemIndex, property);
				mimetype = binary.mimeType || 'application/octet-stream';
				body.files = [
					{
						filename:
							this.getNodeParameter('filename', itemIndex, '') ||
							binary.fileName ||
							'upload.bin',
						mimetype,
						size: buffer.byteLength,
					},
				];
			} else {
				body.files =
					(
						this.getNodeParameter('presignFiles', itemIndex, {}) as {
							file?: IDataObject[];
						}
					).file ?? [];
			}
			const result = await postingTool.call(this, 'presign_media_upload', body);
			if (!buffer) return result;
			const entry = (result as IDataObject[])[0];
			if (!entry?.uploadUrl || !entry?.fileId)
				throw missingUploadUrl.call(this, itemIndex);
			await this.helpers.httpRequest({
				method: 'PUT',
				url: entry.uploadUrl as string,
				body: buffer,
				headers: { 'Content-Type': mimetype },
			});
			return await postingTool.call(this, 'get_media_file', {
				id: entry.fileId,
				verifyUpload: true,
			});
		}
		case 'upload': {
			// Presign + binary PUT in one shot.
			const binaryProperty = this.getNodeParameter(
				'binaryProperty',
				itemIndex,
			) as string;
			const postType = this.getNodeParameter('postType', itemIndex) as string;
			const socialMedia = this.getNodeParameter(
				'socialMedia',
				itemIndex,
			) as string;
			const filenameOverride = this.getNodeParameter(
				'filename',
				itemIndex,
				'',
			) as string;

			const binary = this.helpers.assertBinaryData(itemIndex, binaryProperty);
			const buffer = await this.helpers.getBinaryDataBuffer(
				itemIndex,
				binaryProperty,
			);

			const filename = filenameOverride || binary.fileName || 'upload.bin';
			const mimetype = binary.mimeType || 'application/octet-stream';
			const size = buffer.byteLength;

			const presigned = (await soMeApiRequest.call(
				this,
				'POST',
				'/v1/posts/presign-media',
				{
					postType,
					socialMedia,
					files: [{ filename, mimetype, size }],
				},
			)) as Array<IDataObject>;

			const urlEntry = presigned?.[0];
			if (!urlEntry?.uploadUrl) throw missingUploadUrl.call(this, itemIndex);

			await this.helpers.httpRequest({
				method: 'PUT',
				url: urlEntry.uploadUrl as string,
				body: buffer,
				headers: { 'Content-Type': mimetype },
			});

			return urlEntry;
		}
		case 'presignUpload': {
			const postType = this.getNodeParameter('postType', itemIndex) as string;
			const socialMedia = this.getNodeParameter(
				'socialMedia',
				itemIndex,
			) as string;
			const filesParam = this.getNodeParameter(
				'presignFiles',
				itemIndex,
				{},
			) as { file?: IDataObject[] };
			const files = filesParam.file ?? [];
			return await soMeApiRequest.call(
				this,
				'POST',
				'/v1/posts/presign-media',
				{
					postType,
					socialMedia,
					files,
				},
			);
		}
		case 'validate': {
			const idsRaw = this.getNodeParameter(
				'validateFileIds',
				itemIndex,
			) as string;
			const fileIds = idsRaw
				.split(/[\s,]+/)
				.map((s) => s.trim())
				.filter(Boolean);
			const targetsParam = this.getNodeParameter('targets', itemIndex, {}) as {
				target?: IDataObject[];
			};
			return await soMeApiRequest.call(this, 'POST', '/v1/media/validate', {
				fileIds,
				targets: targetsParam.target ?? [],
			});
		}
		case 'getRules': {
			const filters = this.getNodeParameter(
				'ruleFilters',
				itemIndex,
				{},
			) as IDataObject;
			const qs: IDataObject = {};
			if (filters.socialMedia) qs.socialMedia = filters.socialMedia;
			if (filters.postType) qs.postType = filters.postType;
			return await soMeApiRequest.call(
				this,
				'GET',
				'/v1/media/rules',
				undefined,
				qs,
			);
		}
		case 'list': {
			const returnAll = this.getNodeParameter(
				'returnAll',
				itemIndex,
				false,
			) as boolean;
			if (returnAll)
				return (await soMeApiRequestAllItems.call(
					this,
					'GET',
					'/v1/media',
				)) as IDataObject[];
			const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
			const r = (await soMeApiRequest.call(
				this,
				'GET',
				'/v1/media',
				undefined,
				{ page: 1, limit },
			)) as { data?: IDataObject[] };
			return r?.data ?? [];
		}
		case 'search': {
			const query = this.getNodeParameter('query', itemIndex) as string;
			const returnAll = this.getNodeParameter(
				'returnAll',
				itemIndex,
				false,
			) as boolean;
			if (returnAll) {
				return (await soMeApiRequestAllItems.call(
					this,
					'GET',
					'/v1/media/files/search',
					{ name: query },
				)) as IDataObject[];
			}
			const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
			const r = (await soMeApiRequest.call(
				this,
				'GET',
				'/v1/media/files/search',
				undefined,
				{ name: query, page: 1, limit },
			)) as { data?: IDataObject[] };
			return r?.data ?? [];
		}
		case 'delete': {
			const id = getResourceId.call(this, 'fileId', itemIndex);
			await soMeApiRequest.call(this, 'DELETE', `/v1/media/${id}`);
			return { deleted: true };
		}
		case 'bulkDelete': {
			const idsRaw = this.getNodeParameter('fileIds', itemIndex) as string;
			const fileIds = idsRaw
				.split(/[\s,]+/)
				.map((s) => s.trim())
				.filter(Boolean);
			return await soMeApiRequest.call(
				this,
				'POST',
				'/v1/media/files/bulk-delete',
				{ fileIds },
			);
		}
		case 'move': {
			const id = getResourceId.call(this, 'fileId', itemIndex);
			const targetFolderId = getResourceId.call(
				this,
				'targetFolderId',
				itemIndex,
			);
			return await soMeApiRequest.call(
				this,
				'PATCH',
				`/v1/media/files/${id}/move`,
				{ folderId: targetFolderId || null },
			);
		}
		case 'rename': {
			const id = getResourceId.call(this, 'fileId', itemIndex);
			const newName = this.getNodeParameter('newName', itemIndex) as string;
			return await soMeApiRequest.call(
				this,
				'PATCH',
				`/v1/media/files/${id}/rename`,
				{ name: newName },
			);
		}
		case 'createFolder': {
			const name = this.getNodeParameter('folderName', itemIndex) as string;
			const parentFolderId = getResourceId.call(
				this,
				'parentFolderId',
				itemIndex,
			);
			const body: IDataObject = { name };
			if (parentFolderId) body.parentFolderId = parentFolderId;
			return await soMeApiRequest.call(this, 'POST', '/v1/media/folders', body);
		}
		case 'deleteFolder': {
			const id = getResourceId.call(this, 'folderId', itemIndex);
			await soMeApiRequest.call(this, 'DELETE', `/v1/media/folders/${id}`);
			return { deleted: true };
		}
		case 'renameFolder': {
			const id = getResourceId.call(this, 'folderId', itemIndex);
			const newName = this.getNodeParameter('newName', itemIndex) as string;
			return await soMeApiRequest.call(
				this,
				'PATCH',
				`/v1/media/folders/${id}/rename`,
				{ name: newName },
			);
		}
		case 'moveFolder': {
			const id = getResourceId.call(this, 'folderId', itemIndex);
			const targetFolderId = getResourceId.call(
				this,
				'targetFolderId',
				itemIndex,
			);
			return await soMeApiRequest.call(
				this,
				'PATCH',
				`/v1/media/folders/${id}/move`,
				{ parentFolderId: targetFolderId || null },
			);
		}
		default:
			throw unsupportedOperation.call(this, 'media', operation);
	}
}

function missingUploadUrl(
	this: IExecuteFunctions,
	itemIndex: number,
): NodeOperationError {
	return new NodeOperationError(
		this.getNode(),
		'Social Media Studio did not return an upload URL for the file',
		{
			itemIndex,
			description:
				"Run the node again. Use the 'Get Rules' operation to check that the platform accepts this file type and size.",
		},
	);
}
