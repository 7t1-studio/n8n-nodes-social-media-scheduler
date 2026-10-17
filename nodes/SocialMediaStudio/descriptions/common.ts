import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

const UUID_REGEX =
	'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

interface ResourceLocatorOptions {
	displayName: string;
	name: string;
	/** Lowercase entity name for placeholders and validation text, e.g. "post". */
	entity: string;
	searchListMethod: string;
	/** True only when the API can filter by text; otherwise n8n filters the loaded list. */
	searchable?: boolean;
	required?: boolean;
	description?: string;
	displayOptions?: INodeProperties['displayOptions'];
}

/** A "From List" / "By ID" picker for one record, as the n8n UX guidelines ask. */
export function resourceLocator(
	options: ResourceLocatorOptions,
): INodeProperties {
	const property: INodeProperties = {
		displayName: options.displayName,
		name: options.name,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: options.required ?? false,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: `Select a ${options.entity}...`,
				typeOptions: {
					searchListMethod: options.searchListMethod,
					searchable: options.searchable ?? false,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: UUID_REGEX,
							errorMessage: `Enter a valid ${options.entity} ID`,
						},
					},
				],
			},
		],
	};
	if (options.description) property.description = options.description;
	if (options.displayOptions) property.displayOptions = options.displayOptions;
	return property;
}

/** Plain IDs from workflows made before the pickers existed are still accepted. */
export function resourceIdFrom(value: unknown): string {
	if (value && typeof value === 'object' && 'value' in value)
		return resourceIdFrom((value as IDataObject).value);
	if (typeof value === 'string') return value.trim();
	if (typeof value === 'number') return String(value);
	return '';
}

export function getResourceId(
	this: IExecuteFunctions,
	name: string,
	itemIndex: number,
): string {
	return resourceIdFrom(
		this.getNodeParameter(name, itemIndex, '', { extractValue: true }),
	);
}

export function parseJsonParameter(
	this: IExecuteFunctions,
	name: string,
	displayName: string,
	itemIndex: number,
): IDataObject | undefined {
	const raw = this.getNodeParameter(name, itemIndex, '') as
		| string
		| IDataObject;
	if (!raw) return undefined;
	if (typeof raw !== 'string') return raw;
	try {
		return JSON.parse(raw) as IDataObject;
	} catch {
		throw new NodeOperationError(
			this.getNode(),
			`The '${displayName}' parameter is not valid JSON`,
			{
				itemIndex,
				description:
					'Enter a JSON object, for example {"hashtags": ["n8n"]}, or leave the field empty.',
			},
		);
	}
}

export function unsupportedOperation(
	this: IExecuteFunctions,
	resource: string,
	operation: string,
): NodeOperationError {
	return new NodeOperationError(
		this.getNode(),
		`The operation '${operation}' is not supported for the resource '${resource}'`,
	);
}
