import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SocialMediaStudioApi implements ICredentialType {
	name = 'socialMediaStudioApi';

	displayName = 'Social Media Studio API';

	icon = 'file:somestudio-favicon.svg' as const;

	documentationUrl = 'https://docs.so-me.studio/authentication';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Create an API key in Social Media Studio at Settings → API Keys.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.so-me.studio',
			description:
				'The address of the Social Media Studio API. Keep the default. Change it only to test against another API host.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-Key': '={{ $credentials.apiKey }}',
			},
		},
	};

	// The same default as the nodes, so an emptied Base URL still tests the key.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.baseUrl || "https://api.so-me.studio" }}',
			url: '/v1/settings/profile',
			method: 'GET',
		},
	};
}
