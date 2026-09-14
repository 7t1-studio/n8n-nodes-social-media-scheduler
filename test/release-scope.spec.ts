import { describe, expect, it } from 'vitest';
import { SocialMediaStudio } from '../nodes/SocialMediaStudio/SocialMediaStudio.node';
import { SO_ME_EVENTS } from '../nodes/SocialMediaStudioTrigger/events';

describe('initial release scope', () => {
	it('only exposes core publishing resources', () => {
		const node = new SocialMediaStudio();
		const resource = node.description.properties.find((property) => property.name === 'resource');
		const values = resource?.options?.map((option) => 'value' in option ? option.value : undefined);

		expect(values).toEqual(['draft', 'media', 'post', 'socialAccount']);
	});

	it('only exposes essential publishing events', () => {
		expect(SO_ME_EVENTS.map((event) => event.value)).toEqual([
			'post.created',
			'post.published',
			'post.failed',
			'post.scheduled',
			'draft.converted',
			'quota.limit_reached',
		]);
	});
});
