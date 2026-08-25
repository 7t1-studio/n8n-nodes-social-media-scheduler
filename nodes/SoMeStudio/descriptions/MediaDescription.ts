import { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { soMeApiRequest, soMeApiRequestAllItems } from '../GenericFunctions';

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
			{ name: 'Bulk Delete', value: 'bulkDelete', action: 'Delete many files at once' },
			{ name: 'Create Folder', value: 'createFolder', action: 'Create a folder' },
			{ name: 'Delete', value: 'delete', action: 'Delete a file' },
			{ name: 'Delete Folder', value: 'deleteFolder', action: 'Delete a folder' },
			{ name: 'Get Many Files', value: 'list', action: 'List files and folders' },
			{ name: 'Move File', value: 'move', action: 'Move a file to another folder' },
			{ name: 'Move Folder', value: 'moveFolder', action: 'Move a folder' },
			{ name: 'Presign Upload', value: 'presignUpload', action: 'Get a presigned upload URL' },
			{ name: 'Rename File', value: 'rename', action: 'Rename a file' },
			{ name: 'Rename Folder', value: 'renameFolder', action: 'Rename a folder' },
			{ name: 'Search', value: 'search', action: 'Search files by name' },
			{ name: 'Upload', value: 'upload', action: 'Upload a file from a binary input' },
		],
		default: 'upload',
	},
];

export const mediaFields: INodeProperties[] = [
	// IDs
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['delete', 'move', 'rename']),
	},
	{
		displayName: 'Folder ID',
		name: 'folderId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['deleteFolder', 'renameFolder', 'moveFolder']),
	},
	// Upload (binary input)
	{
		displayName: 'Binary Property',
		name: 'binaryProperty',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: showFor(['upload']),
		description: 'Name of the binary property containing the file to upload',
	},
	{
		displayName: 'Filename',
		name: 'filename',
		type: 'string',
		default: '',
		displayOptions: showFor(['upload']),
		description: 'Override the filename. Defaults to the binary input fileName.',
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
			{ name: 'WhatsApp', value: 'WHATSAPP' },
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
		displayOptions: showFor(['presignUpload']),
		options: [
			{
				name: 'file',
				displayName: 'File',
				values: [
					{ displayName: 'Filename', name: 'filename', type: 'string', default: '' },
					{ displayName: 'MIME Type', name: 'mimetype', type: 'string', default: '' },
					{ displayName: 'Size (Bytes)', name: 'size', type: 'number', default: 0 },
				],
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
	{
		displayName: 'Target Folder Name or ID',
		name: 'targetFolderId',
		type: 'options',
		default: '',
		typeOptions: { loadOptionsMethod: 'getMediaFolders' },
		displayOptions: showFor(['move', 'moveFolder']),
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
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
	{
		displayName: 'Parent Folder Name or ID',
		name: 'parentFolderId',
		type: 'options',
		default: '',
		typeOptions: { loadOptionsMethod: 'getMediaFolders' },
		displayOptions: showFor(['createFolder']),
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	// List
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		description: 'Whether to return all results or only up to a given limit',
		default: false,
		displayOptions: showFor(['list', 'search']),
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		description: 'Max number of results to return',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: { show: { resource: ['media'], operation: ['list', 'search'], returnAll: [false] } },
	},
];

export async function executeMedia(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	switch (operation) {
		case 'upload': {
			// Presign + binary PUT in one shot.
			const binaryProperty = this.getNodeParameter('binaryProperty', itemIndex) as string;
			const postType = this.getNodeParameter('postType', itemIndex) as string;
			const socialMedia = this.getNodeParameter('socialMedia', itemIndex) as string;
			const filenameOverride = this.getNodeParameter('filename', itemIndex, '') as string;

			const binary = this.helpers.assertBinaryData(itemIndex, binaryProperty);
			const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryProperty);

			const filename = filenameOverride || binary.fileName || 'upload.bin';
			const mimetype = binary.mimeType || 'application/octet-stream';
			const size = buffer.byteLength;

			const presigned = (await soMeApiRequest.call(this, 'POST', '/v1/posts/presign-media', {
				postType,
				socialMedia,
				files: [{ filename, mimetype, size }],
			})) as Array<IDataObject>;

			const urlEntry = presigned?.[0];
			if (!urlEntry?.uploadUrl) {
				throw new Error('Presign did not return uploadUrl');
			}

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
			const socialMedia = this.getNodeParameter('socialMedia', itemIndex) as string;
			const filesParam = this.getNodeParameter('presignFiles', itemIndex, {}) as { file?: IDataObject[] };
			const files = filesParam.file ?? [];
			return await soMeApiRequest.call(this, 'POST', '/v1/posts/presign-media', {
				postType,
				socialMedia,
				files,
			});
		}
		case 'list': {
			const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
			if (returnAll) return (await soMeApiRequestAllItems.call(this, 'GET', '/v1/media')) as IDataObject[];
			const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
			const r = (await soMeApiRequest.call(this, 'GET', '/v1/media', undefined, { page: 1, limit })) as { data?: IDataObject[] };
			return r?.data ?? [];
		}
		case 'search': {
			const query = this.getNodeParameter('query', itemIndex) as string;
			const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
			if (returnAll) {
				return (await soMeApiRequestAllItems.call(this, 'GET', '/v1/media/files/search', { q: query })) as IDataObject[];
			}
			const limit = this.getNodeParameter('limit', itemIndex, 50) as number;
			const r = (await soMeApiRequest.call(this, 'GET', '/v1/media/files/search', undefined, { q: query, page: 1, limit })) as { data?: IDataObject[] };
			return r?.data ?? [];
		}
		case 'delete': {
			const id = this.getNodeParameter('fileId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'DELETE', `/v1/media/${id}`);
		}
		case 'bulkDelete': {
			const idsRaw = this.getNodeParameter('fileIds', itemIndex) as string;
			const fileIds = idsRaw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
			return await soMeApiRequest.call(this, 'POST', '/v1/media/files/bulk-delete', { fileIds });
		}
		case 'move': {
			const id = this.getNodeParameter('fileId', itemIndex) as string;
			const targetFolderId = this.getNodeParameter('targetFolderId', itemIndex, '') as string;
			return await soMeApiRequest.call(this, 'PATCH', `/v1/media/files/${id}/move`, { folderId: targetFolderId || null });
		}
		case 'rename': {
			const id = this.getNodeParameter('fileId', itemIndex) as string;
			const newName = this.getNodeParameter('newName', itemIndex) as string;
			return await soMeApiRequest.call(this, 'PATCH', `/v1/media/files/${id}/rename`, { name: newName });
		}
		case 'createFolder': {
			const name = this.getNodeParameter('folderName', itemIndex) as string;
			const parentFolderId = this.getNodeParameter('parentFolderId', itemIndex, '') as string;
			const body: IDataObject = { name };
			if (parentFolderId) body.parentFolderId = parentFolderId;
			return await soMeApiRequest.call(this, 'POST', '/v1/media/folders', body);
		}
		case 'deleteFolder': {
			const id = this.getNodeParameter('folderId', itemIndex) as string;
			return await soMeApiRequest.call(this, 'DELETE', `/v1/media/folders/${id}`);
		}
		case 'renameFolder': {
			const id = this.getNodeParameter('folderId', itemIndex) as string;
			const newName = this.getNodeParameter('newName', itemIndex) as string;
			return await soMeApiRequest.call(this, 'PATCH', `/v1/media/folders/${id}/rename`, { name: newName });
		}
		case 'moveFolder': {
			const id = this.getNodeParameter('folderId', itemIndex) as string;
			const targetFolderId = this.getNodeParameter('targetFolderId', itemIndex, '') as string;
			return await soMeApiRequest.call(this, 'PATCH', `/v1/media/folders/${id}/move`, { parentFolderId: targetFolderId || null });
		}
		default:
			throw new Error(`Unknown media operation: ${operation}`);
	}
}
