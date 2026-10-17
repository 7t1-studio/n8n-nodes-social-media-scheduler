import {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	NodeOperationError,
} from 'n8n-workflow';
import { soMeApiRequest } from './GenericFunctions';

interface Envelope {
	id: number;
	error?: { message?: string };
	result?: {
		isError?: boolean;
		structuredContent?: IDataObject;
		content?: Array<{ type: string; text?: string }>;
	};
}

/** Use the posting profile for features whose current contract lives in MCP. */
export async function postingTool(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	name: string,
	args: IDataObject,
): Promise<IDataObject | IDataObject[]> {
	const request: IDataObject = {
		jsonrpc: '2.0',
		id: 1,
		method: 'tools/call',
		params: { name, arguments: args },
	};
	const response: unknown = await soMeApiRequest.call(
		this,
		'POST',
		'/mcp/posting',
		request,
		{},
		{
			json: false,
			body: JSON.stringify(request),
			headers: {
				Accept: 'application/json, text/event-stream',
				'Content-Type': 'application/json',
			},
		},
	);
	let envelope = response as Envelope | undefined;
	if (typeof response === 'string') {
		envelope = parseEnvelope.call(this, response);
	}
	if (!envelope || envelope.id !== 1 || (!envelope.result && !envelope.error)) {
		throw unreadableResponse.call(this);
	}
	const result = envelope.result;
	const text = result?.content
		?.filter((entry) => entry.type === 'text')
		.map((entry) => entry.text)
		.join('\n');
	if (envelope.error || result?.isError) {
		throw new NodeOperationError(
			this.getNode(),
			envelope.error?.message ||
				text ||
				'Social Media Studio did not complete the request',
		);
	}
	if (!text) return result?.structuredContent ?? {};
	try {
		return JSON.parse(text);
	} catch {
		return { message: text };
	}
}

function unreadableResponse(
	this: IExecuteFunctions | ILoadOptionsFunctions,
): NodeOperationError {
	return new NodeOperationError(
		this.getNode(),
		'Social Media Studio sent a response that the node cannot read',
		{
			description: 'Run the node again. If the same message comes back, run it later.',
		},
	);
}

function parseEnvelope(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	response: string,
): Envelope | undefined {
	try {
		const messages = response
			.split(/\r?\n\r?\n/)
			.map((event: string) =>
				event
					.split(/\r?\n/)
					.filter((line: string) => line.startsWith('data:'))
					.map((line: string) => line.slice(5).trimStart())
					.join('\n'),
			)
			.filter(Boolean);
		return messages.length
			? messages
					.map((message: string) => JSON.parse(message) as Envelope)
					.find((message) => message.id === 1)
			: (JSON.parse(response) as Envelope);
	} catch {
		throw unreadableResponse.call(this);
	}
}

export function parseFileIds(raw: string): string[] {
	return raw.split(/[\s,]+/).filter(Boolean);
}
