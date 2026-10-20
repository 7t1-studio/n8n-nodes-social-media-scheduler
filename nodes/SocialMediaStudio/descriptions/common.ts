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

/**
 * The Limit value, or `undefined` when Return All is on. A limit above the
 * API page size of 100 is read page by page.
 */
export function listLimit(
	this: IExecuteFunctions,
	itemIndex: number,
): number | undefined {
	return this.getNodeParameter('returnAll', itemIndex, false)
		? undefined
		: (this.getNodeParameter('limit', itemIndex, 50) as number);
}

const OFFSET_SUFFIX = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;
const WALL_TIME = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3})\d*)?)?)?$/;

/** Milliseconds that the time zone is ahead of UTC at the given instant. */
function zoneOffset(instant: number, timeZone: string): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	}).formatToParts(new Date(instant));
	const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
	const asUtc = Date.UTC(
		part('year'),
		part('month') - 1,
		part('day'),
		part('hour'),
		part('minute'),
		part('second'),
	);
	return asUtc - Math.floor(instant / 1000) * 1000;
}

/**
 * n8n date fields hold a wall time in the workflow's time zone, without an
 * offset. The API reads a time without an offset in the server's time zone,
 * so the node sends the absolute time in UTC instead.
 */
export function toApiDateTime(this: IExecuteFunctions, value: unknown): string {
	if (value === undefined || value === null || value === '') return '';
	if (value instanceof Date) return value.toISOString();
	if (typeof value === 'object' && typeof (value as { toISO?: unknown }).toISO === 'function') {
		// A Luxon DateTime from an expression already knows its zone.
		return (value as { toUTC: () => { toISO: () => string } }).toUTC().toISO();
	}
	const text = String(value).trim();
	if (OFFSET_SUFFIX.test(text)) {
		const instant = Date.parse(text);
		return Number.isNaN(instant) ? text : new Date(instant).toISOString();
	}
	const match = WALL_TIME.exec(text);
	if (!match) return text;
	const [, year, month, day, hour = '0', minute = '0', second = '0', ms = '0'] = match;
	const wall = Date.UTC(
		Number(year),
		Number(month) - 1,
		Number(day),
		Number(hour),
		Number(minute),
		Number(second),
		Number(ms.padEnd(3, '0')),
	);
	try {
		const timeZone = this.getTimezone();
		let instant = wall - zoneOffset(wall, timeZone);
		// Near a daylight saving change the offset at the result can differ.
		const corrected = zoneOffset(instant, timeZone);
		if (corrected !== wall - instant) instant = wall - corrected;
		return new Date(instant).toISOString();
	} catch {
		return text;
	}
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
