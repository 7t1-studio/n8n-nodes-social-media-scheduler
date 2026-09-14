import { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { soMeApiRequestAllItems } from '../GenericFunctions';

interface AccountRow extends IDataObject {
	id: string;
	platform?: string;
	platformDisplayName?: string;
	name?: string;
	username?: string;
}

interface FolderRow extends IDataObject {
	id: string;
	name: string;
	path?: string;
}

interface TemplateRow extends IDataObject {
	id: string;
	name: string;
}

interface SavedReplyRow extends IDataObject {
	id: string;
	title: string;
}

export async function getSocialAccounts(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const accounts = (await soMeApiRequestAllItems.call(this, 'GET', '/v1/accounts')) as AccountRow[];

	return accounts.map((a) => ({
		name:
			a.platformDisplayName ??
			[a.platform, a.name ?? a.username].filter(Boolean).join(' · ') ??
			a.id,
		value: a.id,
	}));
}

export async function getMediaFolders(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const folders = (await soMeApiRequestAllItems.call(this, 'GET', '/v1/media/folders')) as FolderRow[];

	return [
		{ name: '— Root —', value: '' },
		...folders.map((f) => ({ name: f.path ?? f.name, value: f.id })),
	];
}

export async function getTemplates(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const templates = (await soMeApiRequestAllItems.call(this, 'GET', '/v1/templates')) as TemplateRow[];
	return templates.map((t) => ({ name: t.name, value: t.id }));
}

export async function getSavedReplies(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const replies = (await soMeApiRequestAllItems.call(this, 'GET', '/v1/inbox/saved-replies')) as SavedReplyRow[];
	return replies.map((r) => ({ name: r.title, value: r.id }));
}
