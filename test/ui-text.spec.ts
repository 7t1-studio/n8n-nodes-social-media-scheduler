import { describe, expect, it } from 'vitest';
import type { INodeProperties } from 'n8n-workflow';
import { SocialMediaStudio } from '../nodes/SocialMediaStudio/SocialMediaStudio.node';
import { SocialMediaStudioTrigger } from '../nodes/SocialMediaStudioTrigger/SocialMediaStudioTrigger.node';
import { SocialMediaStudioApi } from '../credentials/SocialMediaStudioApi.credentials';
import {
	POST_STATUS_OPTIONS,
	POST_TYPE_OPTIONS,
	SOCIAL_MEDIA_OPTIONS,
} from '../nodes/SocialMediaStudio/types';

const node = new SocialMediaStudio();
const trigger = new SocialMediaStudioTrigger();
const credential = new SocialMediaStudioApi();
const properties = node.description.properties;

/** Every displayName and description in a list of properties, nested ones too. */
function texts(list: INodeProperties[]): string[] {
	const out: string[] = [];
	const visit = (entry: Record<string, unknown>) => {
		for (const key of ['displayName', 'description', 'action', 'placeholder'])
			if (typeof entry[key] === 'string') out.push(entry[key] as string);
		for (const key of ['options', 'values'])
			if (Array.isArray(entry[key]))
				for (const child of entry[key] as Record<string, unknown>[]) visit(child);
	};
	list.forEach((property) => visit(property as unknown as Record<string, unknown>));
	return out;
}

/** The fields shown for one operation, in editor order. */
function fieldsFor(resource: string, operation: string): string[] {
	return properties
		.filter((p) => {
			const show = p.displayOptions?.show;
			return (
				p.name !== 'operation' &&
				show?.resource?.includes(resource) &&
				show?.operation?.includes(operation) &&
				Object.keys(show).length === 2
			);
		})
		.map((p) => p.name);
}

const sorted = (names: string[]) =>
	[...names].sort((a, b) => a.localeCompare(b));

describe('labels and descriptions', () => {
	it('call the binary input field Input Data Field Name and keep its parameter name', () => {
		const field = properties.find((p) => p.name === 'binaryProperty');
		expect(field?.displayName).toBe('Input Data Field Name');
	});

	it('use no storage or API jargon', () => {
		const jargon = /\b(S3|Src|Presign|presigned|UUIDs?|Binary Property|ISO 8601|graphemes)\b/;
		for (const text of texts(properties)) expect(text).not.toMatch(jargon);
	});

	it('use display names instead of platform constants in help text', () => {
		const constants = new RegExp(
			`\\b(${SOCIAL_MEDIA_OPTIONS.map((o) => o.value).join('|')})\\b`,
		);
		const descriptions = properties.flatMap((p) =>
			texts([p]).filter((text) => text !== p.displayName),
		);
		for (const text of descriptions) expect(text).not.toMatch(constants);
	});

	it('give every operation a description that names the resource', () => {
		const resourceWord: Record<string, string> = {
			draft: 'draft',
			media: 'media',
			post: 'post',
			socialAccount: 'social account',
		};
		for (const operation of properties.filter((p) => p.name === 'operation')) {
			const resource = operation.displayOptions?.show?.resource?.[0] as string;
			for (const option of operation.options ?? []) {
				const description = (option as { description?: string }).description;
				expect(description, `${resource}.${option.name}`).toBeTruthy();
				expect(description?.toLowerCase()).toContain(resourceWord[resource]);
				expect(description?.[0]).toBe(description?.[0].toUpperCase());
			}
		}
	});

	it('use one product name in the node, trigger and credential', () => {
		const all = [
			...texts(properties),
			...texts(trigger.description.properties),
			...texts(credential.properties),
			node.description.description,
			trigger.description.description,
			credential.displayName,
		];
		for (const text of all) {
			expect(text).not.toMatch(/so-me\.studio(?!\/)|Social media studio|self-hosted/);
		}
	});

	it('give the credential test the default base URL of the nodes', () => {
		expect(credential.test.request.baseURL).toContain('https://api.so-me.studio');
		const baseUrl = credential.properties.find((p) => p.name === 'baseUrl');
		expect(baseUrl?.default).toBe('https://api.so-me.studio');
	});
});

describe('field order', () => {
	it('shows the required post fields first on Post Create and Draft Create', () => {
		for (const resource of ['post', 'draft'])
			expect(fieldsFor(resource, 'create').slice(0, 4)).toEqual([
				'text',
				'socialMedia',
				'postType',
				'accountId',
			]);
	});

	it('shows the record and the changed fields first on update', () => {
		expect(fieldsFor('post', 'update').slice(0, 2)).toEqual([
			'postId',
			'updateFields',
		]);
		expect(fieldsFor('draft', 'update').slice(0, 2)).toEqual([
			'draftId',
			'updateFields',
		]);
		expect(fieldsFor('post', 'schedule').slice(0, 2)).toEqual([
			'postId',
			'scheduleFor',
		]);
	});

	it('shows the clear switches last', () => {
		for (const [resource, operation] of [
			['post', 'update'],
			['post', 'schedule'],
			['draft', 'update'],
		]) {
			const fields = fieldsFor(resource, operation);
			const clears = fields.filter((name) => name.startsWith('clear'));
			expect(fields.slice(-clears.length)).toEqual(clears);
		}
	});
});

describe('dropdown order', () => {
	it('sorts platforms, post types and statuses by name', () => {
		for (const list of [SOCIAL_MEDIA_OPTIONS, POST_TYPE_OPTIONS, POST_STATUS_OPTIONS]) {
			const names = list.map((option) => option.name);
			expect(names).toEqual(sorted(names));
		}
	});

	it('sorts the trigger events by name', () => {
		const events = trigger.description.properties.find((p) => p.name === 'events');
		const names = (events?.options ?? []).map((option) => option.name);
		expect(names.length).toBeGreaterThan(1);
		expect(names).toEqual(sorted(names));
	});

	it('labels the empty filter option All', () => {
		const filters = properties.find((p) => p.name === 'filters');
		for (const filter of (filters?.options ?? []) as INodeProperties[]) {
			expect(filter.default).toBe('');
			expect(filter.options?.[0]).toEqual({ name: 'All', value: '' });
		}
	});
});
