import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SoMeStudioApi implements ICredentialType {
	name = 'soMeStudioApi';

	displayName = 'So-me.studio API';

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
				'Create an API key in the so-me.studio dashboard at Settings → API Keys.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.so-me.studio',
			description:
				'The so-me.studio API base URL. Override only if you are running a self-hosted instance.',
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

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.baseUrl }}',
			url: '/v1/settings/profile',
			method: 'GET',
		},
	};
}
