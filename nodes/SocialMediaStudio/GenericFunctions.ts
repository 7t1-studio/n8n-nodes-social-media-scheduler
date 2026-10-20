import {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';

type ApiContext =
	| IExecuteFunctions
	| ILoadOptionsFunctions
	| IHookFunctions
	| IWebhookFunctions;

interface PaginatedResponse<T> {
	data: T[];
	meta?: {
		total?: number;
		page?: number;
		limit?: number;
		totalPages?: number;
	};
}

export async function soMeApiRequest(
	this: ApiContext,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject | IDataObject[] | undefined = undefined,
	qs: IDataObject = {},
	overrideOptions: Partial<IHttpRequestOptions> = {},
): Promise<IDataObject | IDataObject[]> {
	const credentials = await this.getCredentials('socialMediaStudioApi');
	const baseUrl = (credentials.baseUrl as string) || 'https://api.so-me.studio';

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl.replace(/\/+$/, '')}${resource}`,
		qs,
		body,
		json: true,
		...overrideOptions,
	};

	if (body === undefined || (typeof body === 'object' && Object.keys(body).length === 0)) {
		delete options.body;
	}
	if (Object.keys(qs).length === 0) {
		delete options.qs;
	}

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'socialMediaStudioApi',
			options,
		)) as IDataObject | IDataObject[];
	} catch (error) {
		throw mapError.call(this, error);
	}
}

/** The API answers 400 to a page size above 100. */
const MAX_PAGE_SIZE = 100;

/**
 * Reads every page, or only as many pages as `limit` needs. A list endpoint
 * that answers with a plain array is read as one page.
 */
export async function soMeApiRequestAllItems<T = IDataObject>(
	this: ApiContext,
	method: IHttpRequestMethods,
	resource: string,
	qs: IDataObject = {},
	limit?: number,
): Promise<T[]> {
	const pageSize = Math.min(limit ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE);
	const items: T[] = [];
	let page = 1;
	let totalPages = 1;

	do {
		const response = (await soMeApiRequest.call(this, method, resource, undefined, {
			...qs,
			page,
			limit: pageSize,
		})) as unknown as PaginatedResponse<T> | T[];

		if (Array.isArray(response)) {
			items.push(...response);
			break;
		}
		const batch = Array.isArray(response?.data) ? response.data : [];
		items.push(...batch);

		totalPages = response?.meta?.totalPages ?? page;
		page += 1;
	} while (page <= totalPages && (limit === undefined || items.length < limit));

	return limit === undefined ? items : items.slice(0, limit);
}

/**
 * n8n's request helpers already throw a NodeApiError with `httpCode` and the
 * response body in `context.data`. A NodeApiError passed to the NodeApiError
 * constructor comes back unchanged, so read the status and the body first and
 * build a new error from the body.
 */
function mapError(this: ApiContext, error: unknown): NodeApiError {
	const { status, body } = errorDetails(error);
	// Without an HTTP status (no connection, timeout) n8n's own message is the clearest.
	if (!status && error instanceof NodeApiError) return error;

	const { message, description } = friendlyMessage(status, body);
	const response = (
		body && typeof body === 'object' ? body : { message: apiText(body) ?? message }
	) as JsonObject;

	return new NodeApiError(this.getNode(), response, {
		message,
		description,
		httpCode: status ? String(status) : undefined,
	});
}

function errorDetails(error: unknown): { status?: number; body?: unknown } {
	const errorObject = error as {
		statusCode?: number;
		httpCode?: string | null;
		context?: { data?: unknown };
		response?: { status?: number; statusCode?: number; body?: unknown; data?: unknown };
		cause?: { response?: { status?: number; data?: unknown } };
		error?: unknown;
		message?: string;
	};
	const status =
		Number(
			errorObject.statusCode ??
				errorObject.response?.statusCode ??
				errorObject.response?.status ??
				errorObject.httpCode ??
				errorObject.cause?.response?.status,
		) || undefined;
	const body =
		errorObject.response?.body ??
		errorObject.response?.data ??
		errorObject.context?.data ??
		errorObject.cause?.response?.data ??
		errorObject.error ??
		(status ? undefined : errorObject.message);
	return { status, body };
}

/** The API text without a final period. NestJS validation sends a list of texts. */
function apiText(body: unknown): string | undefined {
	if (typeof body === 'string') return body.trim().replace(/\.$/, '') || undefined;
	if (!body || typeof body !== 'object') return undefined;
	const { message, error } = body as { message?: unknown; error?: unknown };
	const text = Array.isArray(message)
		? message.filter((part) => typeof part === 'string').join('; ')
		: typeof message === 'string'
			? message
			: typeof error === 'string'
				? error
				: undefined;
	return text?.trim().replace(/\.$/, '') || undefined;
}

const RETRY_HINT = "Run the node again later, or turn on 'Retry On Fail' in the node settings.";

/**
 * The message says what happened and the description says what to do next, as
 * the n8n UX guidelines ask. The API text stays in the message, because an AI
 * agent that uses the node as a tool receives only the message.
 */
function friendlyMessage(
	status: number | undefined,
	body: unknown,
): { message: string; description?: string } {
	const text = apiText(body);
	const withText = (message: string) => (text ? `${message}: ${text}` : message);

	switch (status) {
		case 400:
		case 422:
			return {
				message: withText('Social Media Studio did not accept the request'),
				description: 'Check the node parameters and run the node again.',
			};
		case 401:
			return {
				message: 'The API key is not valid',
				description:
					'Create a new API key in Social Media Studio at Settings → API Keys, then update the Social Media Studio API credential.',
			};
		case 402:
			return {
				message: withText('The plan limit is reached'),
				description: 'Upgrade the plan in Social Media Studio, or wait for the next billing period.',
			};
		case 403:
			return {
				message: withText('The API key has no access to this item'),
				description: 'Check that the item belongs to the workspace of the API key.',
			};
		case 404:
			return {
				message: withText('The item does not exist'),
				description: 'Check the ID, or select the item from the list.',
			};
		case 429:
			return {
				message: 'Social Media Studio received too many requests in a short time',
				description: `Wait a moment. ${RETRY_HINT}`,
			};
		case 500:
		case 502:
		case 503:
		case 504:
			return {
				message: `Social Media Studio is not available at the moment (HTTP ${status})`,
				description: RETRY_HINT,
			};
		default:
			return {
				message:
					text ?? `Social Media Studio did not complete the request${status ? ` (HTTP ${status})` : ''}`,
				description: RETRY_HINT,
			};
	}
}
