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
	const credentials = await this.getCredentials('soMeStudioApi');
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
			'soMeStudioApi',
			options,
		)) as IDataObject | IDataObject[];
	} catch (error) {
		throw mapError.call(this, error);
	}
}

export async function soMeApiRequestAllItems<T = IDataObject>(
	this: ApiContext,
	method: IHttpRequestMethods,
	resource: string,
	qs: IDataObject = {},
	pageSize = 100,
): Promise<T[]> {
	const items: T[] = [];
	let page = 1;
	let totalPages = 1;

	do {
		const response = (await soMeApiRequest.call(this, method, resource, undefined, {
			...qs,
			page,
			limit: pageSize,
		})) as unknown as PaginatedResponse<T>;

		const batch = Array.isArray(response?.data) ? response.data : [];
		items.push(...batch);

		totalPages = response?.meta?.totalPages ?? page;
		page += 1;
	} while (page <= totalPages);

	return items;
}

function mapError(this: ApiContext, error: unknown): NodeApiError {
	const errorObject = error as {
		statusCode?: number;
		response?: { statusCode?: number; body?: unknown; data?: unknown };
		error?: unknown;
	};
	const status = errorObject.statusCode ?? errorObject.response?.statusCode;
	const responseBody =
		errorObject.response?.body ?? errorObject.response?.data ?? errorObject.error ?? error;

	const friendly = friendlyMessage(status, responseBody);

	return new NodeApiError(this.getNode(), responseBody as JsonObject, {
		message: friendly,
		httpCode: status ? String(status) : undefined,
	});
}

function friendlyMessage(status: number | undefined, body: unknown): string {
	const bodyObject = body as { message?: unknown; error?: unknown } | null;
	const apiMsg =
		(typeof body === 'object' &&
			bodyObject &&
			(typeof bodyObject.message === 'string'
				? bodyObject.message
				: typeof bodyObject.error === 'string'
					? bodyObject.error
					: undefined)) ||
		(typeof body === 'string' ? body : undefined);

	switch (status) {
		case 401:
			return 'API key invalid or revoked. Regenerate one at so-me.studio → Settings → API Keys.';
		case 402:
			return `Quota exhausted: ${apiMsg ?? 'plan limit reached'}. Upgrade your plan or wait for the next billing cycle.`;
		case 403:
			return `Forbidden: ${apiMsg ?? 'this API key lacks permission for the requested resource.'}`;
		case 404:
			return `Not found: ${apiMsg ?? 'the requested resource does not exist.'}`;
		case 422:
			return `Validation failed: ${apiMsg ?? 'check field values and try again.'}`;
		case 429:
			return 'Rate limited. Slow down requests or upgrade your plan for a higher rate limit.';
		case 500:
		case 502:
		case 503:
		case 504:
			return `so-me.studio is temporarily unavailable (HTTP ${status}). The request will be retried by n8n if configured.`;
		default:
			return apiMsg ?? `Unexpected error from so-me.studio API${status ? ` (HTTP ${status})` : ''}.`;
	}
}
