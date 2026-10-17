import {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import { soMeApiRequestAllItems } from '../GenericFunctions';

interface AccountRow extends IDataObject {
	id: string;
	platform?: string;
	platformDisplayName?: string;
	name?: string;
	username?: string;
	accountName?: string;
	userName?: string;
}

interface FolderRow extends IDataObject {
	id: string;
	name: string;
	path?: string;
}

export async function getSocialAccounts(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const accounts = (await soMeApiRequestAllItems.call(
		this,
		'GET',
		'/v1/accounts',
	)) as AccountRow[];

	return accounts.map((a) => ({
		name:
			a.platformDisplayName ??
			([a.platform, a.accountName ?? a.name ?? a.userName ?? a.username]
				.filter(Boolean)
				.join(' · ') ||
				a.id),
		value: a.id,
	}));
}

export async function getMediaFolders(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const folders = (await soMeApiRequestAllItems.call(
		this,
		'GET',
		'/v1/media/folders',
	)) as FolderRow[];

	return [
		{ name: '— Root —', value: '' },
		...folders.map((f) => ({ name: f.path ?? f.name, value: f.id })),
	];
}
