import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';

/**
 * Output modes for operations that return records with more than 10 fields.
 * The node is also an AI agent tool, so it uses the 'Output' parameter with
 * Simplified, Raw and Selected Fields from the n8n UX guidelines.
 */
type OutputKind = 'post' | 'draft' | 'file' | 'account';

const OUTPUT_OPERATIONS: Record<
	string,
	{ kind: OutputKind; operations: string[] }
> = {
	post: { kind: 'post', operations: ['get', 'getMany', 'getCalendar'] },
	draft: { kind: 'draft', operations: ['get', 'getMany'] },
	media: { kind: 'file', operations: ['get', 'list', 'search'] },
	socialAccount: { kind: 'account', operations: ['get', 'getMany'] },
};

const FIELD_OPTIONS: Record<OutputKind, INodePropertyOptions[]> = {
	post: [
		{ name: 'Account ID', value: 'accountId' },
		{ name: 'Created At', value: 'createdAt' },
		{ name: 'Description', value: 'description' },
		{ name: 'Failure Code', value: 'failureCode' },
		{ name: 'Failure Reason', value: 'failureReason' },
		{ name: 'Files', value: 'file' },
		{ name: 'First Comment Posted At', value: 'firstCommentPostedAt' },
		{ name: 'First Comment Status', value: 'firstCommentStatus' },
		{ name: 'Metadata', value: 'metaData' },
		{ name: 'Platform', value: 'socialMedia' },
		{ name: 'Post Status', value: 'postStatus' },
		{ name: 'Post Type', value: 'postType' },
		{ name: 'Review Comment', value: 'reviewComment' },
		{ name: 'Reviewed At', value: 'reviewedAt' },
		{ name: 'Scheduled At', value: 'scheduledAt' },
		{ name: 'Share ID', value: 'shareId' },
		{ name: 'Share URL', value: 'shareUrl' },
		{ name: 'Social Account', value: 'socialAccount' },
		{ name: 'Text', value: 'text' },
		{ name: 'Thumbnail', value: 'thumbnail' },
		{ name: 'Updated At', value: 'updatedAt' },
	],
	draft: [
		{ name: 'Account ID', value: 'accountId' },
		{ name: 'Created At', value: 'createdAt' },
		{ name: 'Description', value: 'description' },
		{ name: 'Metadata', value: 'metaData' },
		{ name: 'Platform', value: 'socialMedia' },
		{ name: 'Post Type', value: 'postType' },
		{ name: 'Scheduled At', value: 'scheduledAt' },
		{ name: 'Social Account', value: 'socialAccount' },
		{ name: 'Text', value: 'text' },
		{ name: 'Thumbnail', value: 'thumbnail' },
		{ name: 'Title', value: 'title' },
		{ name: 'Updated At', value: 'updatedAt' },
	],
	file: [
		{ name: 'Created At', value: 'createdAt' },
		{ name: 'Duration (Seconds)', value: 'durationSeconds' },
		{ name: 'File URL', value: 'fileSrc' },
		{ name: 'Filename', value: 'filename' },
		{ name: 'Folder ID', value: 'folderId' },
		{ name: 'Frame Rate', value: 'frameRate' },
		{ name: 'Height', value: 'height' },
		{ name: 'MIME Type', value: 'mimetype' },
		{ name: 'Original Name', value: 'originalName' },
		{ name: 'Size (Bytes)', value: 'size' },
		{ name: 'Updated At', value: 'updatedAt' },
		{ name: 'Upload Verified', value: 'uploadVerified' },
		{ name: 'Video Codec', value: 'videoCodec' },
		{ name: 'Width', value: 'width' },
	],
	account: [
		{ name: 'Account Email', value: 'accountEmail' },
		{ name: 'Account Image', value: 'accountImage' },
		{ name: 'Account Name', value: 'accountName' },
		{ name: 'Capabilities', value: 'capabilities' },
		{ name: 'Created At', value: 'createdAt' },
		{ name: 'Page ID', value: 'pageId' },
		{ name: 'Platform', value: 'platform' },
		{ name: 'Platform Account ID', value: 'accountId' },
		{ name: 'Subscribe Comments', value: 'subscribeComments' },
		{ name: 'Subscribe Inbox', value: 'subscribeInbox' },
		{ name: 'Username', value: 'userName' },
	],
};

/** Drops fields the API did not send, so a simplified record never invents a key. */
function defined(record: IDataObject): IDataObject {
	return Object.fromEntries(
		Object.entries(record).filter(([, value]) => value !== undefined),
	) as IDataObject;
}

function accountName(record: IDataObject): string | null | undefined {
	const account = (record.socialAccount ?? record.socialAccountSnapshot) as
		| IDataObject
		| null
		| undefined;
	return (account?.accountName ?? account?.userName) as
		| string
		| null
		| undefined;
}

/** At most 10 fields each, the most used first, nested values flattened. */
const SIMPLIFY: Record<OutputKind, (record: IDataObject) => IDataObject> = {
	post: (post) =>
		defined({
			id: post.id,
			postStatus: post.postStatus,
			socialMedia: post.socialMedia,
			postType: post.postType,
			text: post.text,
			scheduledAt: post.scheduledAt,
			shareUrl: post.shareUrl,
			accountId: post.accountId,
			accountName: accountName(post),
			failureReason: post.failureReason,
		}),
	draft: (draft) =>
		defined({
			id: draft.id,
			title: draft.title,
			text: draft.text,
			socialMedia: draft.socialMedia,
			postType: draft.postType,
			scheduledAt: draft.scheduledAt,
			accountId: draft.accountId,
			accountName: accountName(draft),
			createdAt: draft.createdAt,
			updatedAt: draft.updatedAt,
		}),
	file: (file) =>
		defined({
			id: file.id,
			originalName: file.originalName ?? file.filename,
			mimetype: file.mimetype,
			size: file.size,
			width: file.width,
			height: file.height,
			durationSeconds: file.durationSeconds,
			fileSrc: file.fileSrc,
			createdAt: file.createdAt,
			uploadVerified: file.uploadVerified,
		}),
	account: (account) => {
		const capabilities = (account.capabilities ?? {}) as IDataObject;
		return defined({
			id: account.id,
			platform: account.platform,
			accountName: account.accountName,
			userName: account.userName,
			accountId: account.accountId,
			accountImage: account.accountImage,
			supportsFirstComment: capabilities.firstComment,
			firstCommentMaxLength: capabilities.firstCommentMaxLength,
			supportsThreads: capabilities.threads,
			threadPartMaxLength: capabilities.threadPartMaxLength,
		});
	},
};

export const outputFields: INodeProperties[] = [
	{
		displayName: 'Output',
		name: 'output',
		type: 'options',
		default: 'simple',
		displayOptions: {
			show: {
				resource: Object.keys(OUTPUT_OPERATIONS),
				operation: [
					...new Set(
						Object.values(OUTPUT_OPERATIONS).flatMap(
							(entry) => entry.operations,
						),
					),
				],
			},
		},
		options: [
			{
				name: 'Simplified',
				value: 'simple',
				description: 'Return up to 10 of the most useful fields',
			},
			{
				name: 'Raw',
				value: 'raw',
				description: 'Return all the fields',
			},
			{
				name: 'Selected Fields',
				value: 'fields',
				description: 'Return the ID and the fields that you select',
			},
		],
		description: 'How much of each record to return',
	},
	...Object.entries(OUTPUT_OPERATIONS).map(
		([resource, { kind, operations }]): INodeProperties => ({
			displayName: 'Fields',
			name: 'fields',
			type: 'multiOptions',
			default: [],
			options: FIELD_OPTIONS[kind],
			displayOptions: {
				show: {
					resource: [resource],
					operation: operations,
					output: ['fields'],
				},
			},
			description:
				'The fields to add to the output. The output always contains the ID.',
		}),
	),
];

/** Applies the 'Output' parameter. Operations without it return the API response unchanged. */
export function shapeOutput(
	this: IExecuteFunctions,
	resource: string,
	operation: string,
	result: unknown,
	itemIndex: number,
): unknown {
	const entry = OUTPUT_OPERATIONS[resource];
	if (!entry?.operations.includes(operation)) return result;
	const output = this.getNodeParameter('output', itemIndex, 'simple') as string;
	if (output === 'raw') return result;
	const selected =
		output === 'fields'
			? (this.getNodeParameter('fields', itemIndex, []) as string[])
			: [];
	const shape = (record: unknown): unknown => {
		if (!record || typeof record !== 'object' || Array.isArray(record))
			return record;
		if (output !== 'fields') return SIMPLIFY[entry.kind](record as IDataObject);
		return defined(
			Object.fromEntries(
				['id', ...selected].map((key) => [key, (record as IDataObject)[key]]),
			) as IDataObject,
		);
	};
	return Array.isArray(result) ? result.map(shape) : shape(result);
}
