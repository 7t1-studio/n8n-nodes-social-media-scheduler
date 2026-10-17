import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { soMeApiRequest } from '../GenericFunctions';
import { POST_STATUS_OPTIONS, SOCIAL_MEDIA_OPTIONS } from '../types';

const PAGE_SIZE = 50;

interface Page {
	data?: IDataObject[];
	meta?: { totalPages?: number; nextPage?: number | null };
}

async function fetchPage(
	this: ILoadOptionsFunctions,
	resource: string,
	qs: IDataObject,
	paginationToken?: string,
): Promise<{ rows: IDataObject[]; paginationToken?: string }> {
	const page = Number(paginationToken) || 1;
	const response = (await soMeApiRequest.call(
		this,
		'GET',
		resource,
		undefined,
		{
			...qs,
			page,
			limit: PAGE_SIZE,
		},
	)) as Page;
	const totalPages = response?.meta?.totalPages ?? page;
	const next =
		response?.meta?.nextPage ?? (page < totalPages ? page + 1 : null);
	return {
		rows: Array.isArray(response?.data) ? response.data : [],
		paginationToken: next ? String(next) : undefined,
	};
}

function label(
	options: ReadonlyArray<{ name: string; value: string }>,
	value: unknown,
): string {
	return (
		options.find((option) => option.value === value)?.name ??
		String(value ?? '')
	);
}

function preview(text: unknown, max = 60): string {
	const flat = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '';
	return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** For lists that the API cannot filter by text, filter the loaded page. */
function matching(
	items: INodeListSearchItems[],
	filter?: string,
): INodeListSearchItems[] {
	if (!filter) return items;
	const needle = filter.toLowerCase();
	return items.filter(
		(item) =>
			item.name.toLowerCase().includes(needle) ||
			String(item.value).toLowerCase().includes(needle),
	);
}

export async function searchPosts(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const { rows, paginationToken: next } = await fetchPage.call(
		this,
		'/v1/posts',
		{},
		paginationToken,
	);
	const results = rows.map((post) => ({
		name: [
			preview(post.text) || '(no text)',
			label(SOCIAL_MEDIA_OPTIONS, post.socialMedia),
			label(POST_STATUS_OPTIONS, post.postStatus),
		]
			.filter(Boolean)
			.join(' · '),
		value: post.id as string,
	}));
	return { results: matching(results, filter), paginationToken: next };
}

export async function searchDrafts(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const { rows, paginationToken: next } = await fetchPage.call(
		this,
		'/v1/drafts',
		{},
		paginationToken,
	);
	const results = rows.map((draft) => ({
		name: [
			(draft.title as string) || preview(draft.text) || '(no text)',
			label(SOCIAL_MEDIA_OPTIONS, draft.socialMedia),
		]
			.filter(Boolean)
			.join(' · '),
		value: draft.id as string,
	}));
	return { results: matching(results, filter), paginationToken: next };
}

/** Without a filter the API lists the root folder; a filter searches every folder by name. */
export async function searchFiles(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const { rows, paginationToken: next } = filter
		? await fetchPage.call(
				this,
				'/v1/media/files/search',
				{ name: filter },
				paginationToken,
			)
		: await fetchPage.call(this, '/v1/media', {}, paginationToken);
	return {
		results: rows.map((file) => ({
			name:
				(file.originalName as string) ||
				(file.filename as string) ||
				(file.id as string),
			value: file.id as string,
			url: (file.fileSrc as string) || undefined,
		})),
		paginationToken: next,
	};
}

export async function searchFolders(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const { rows, paginationToken: next } = await fetchPage.call(
		this,
		'/v1/media/folders',
		{ parentId: 'all' },
		paginationToken,
	);
	const results = rows.map((folder) => ({
		name: (folder.name as string) || (folder.id as string),
		value: folder.id as string,
	}));
	return { results: matching(results, filter), paginationToken: next };
}

export async function searchAccounts(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const { rows, paginationToken: next } = await fetchPage.call(
		this,
		'/v1/accounts',
		filter ? { search: filter } : {},
		paginationToken,
	);
	return {
		results: rows.map((account) => ({
			name:
				[
					label(SOCIAL_MEDIA_OPTIONS, account.platform),
					(account.accountName as string) || (account.userName as string),
				]
					.filter(Boolean)
					.join(' · ') || (account.id as string),
			value: account.id as string,
		})),
		paginationToken: next,
	};
}
