# Social media studio for n8n

A posting connector for [So-me Studio](https://so-me.studio). This release includes posts, drafts, media, connected account lookups, and publishing event triggers. Inbox, comments management, analytics, saved replies, and account administration are deferred.

## Installation

Install `@social-media-scheduler/n8n-nodes-social-media-scheduler` through **Settings → Community Nodes**. This release is version `0.2.0`.

For a local self-hosted n8n instance, build and pack this repository, then install the resulting archive in n8n's user nodes directory:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm pack --pack-destination ../artifacts
# Inside the n8n environment, with the archive copied to /tmp:
cd ~/.n8n/nodes
npm install --omit=dev --legacy-peer-deps /tmp/social-media-scheduler-n8n-nodes-social-media-scheduler-0.2.0.tgz
# Restart n8n to load the package.
```

Podman can run the self-hosted n8n container and install the archive with `podman cp` and `podman exec`.

## Authentication

Create an API key in So-me Studio's **Settings → API Keys**, then create a **Social media studio API** credential in n8n. Use the default API base URL for the hosted service or set it to your self-hosted backend. New posting features use the `/mcp/posting` endpoint; other operations use `/v1`. The account must have the corresponding API/MCP access and available credits. Webhook subscriptions require a supported plan.

## Included nodes and operations

**Social media studio** exposes 41 operations in four resources:

| Resource | Operations |
|---|---|
| Post | Create, get, list, update, delete, schedule, unschedule, retry, resubmit, bulk delete, calendar |
| Draft | Create, get, list, update, delete, convert to post |
| Media | Upload, presign upload, upload to library, presign library upload, get/verify upload, list, search, validate, get rules, delete, bulk delete, move, rename, create/list/rename/move/delete folders |
| Social Account | Get, list, TikTok creator info, Pinterest boards, Discord channels, Slack channels |

**Social media studio Trigger** subscribes to publishing events and verifies incoming signatures.

The posting platform choices are Twitter/X, Instagram, LinkedIn personal and page, Facebook, TikTok, YouTube, Threads, WhatsApp, Pinterest, Dribbble, Bluesky, Mastodon, WordPress, Dev.to, Telegram, Discord, and Slack. Reddit and Google Business Profile are outside this release's posting scope. Available post types and options depend on the destination account.

## Threads, first comments, and media

Post create/update/schedule and draft create/update/convert expose **Thread Parts** and **First Comment**. The head uses **Text**, followed by the thread parts in order. Parts accept text, media library file IDs, or both. Threads are supported on Twitter/X, Threads, Bluesky, and Mastodon. The backend validates each platform's limits.

Use **Media Library File IDs** to attach existing uploaded files. On update or schedule/convert, explicit **Clear Media**, **Clear Thread**, and **Clear First Comment** controls distinguish removal from leaving an existing value unchanged. Typed options take precedence over the corresponding metadata fields.

Use **Upload to Library** for binary input: the node creates a library upload, sends the bytes to the presigned storage URL, then verifies the stored object. For external uploaders, use **Presign Library Upload**, PUT the bytes, and call **Get** with **Verify Upload** enabled before attaching the returned file IDs. Legacy URL upload operations remain available.

**Media → Validate** checks files against destination rules, and **Get Rules** returns the platform constraints. Check validation results before scheduling.

## TikTok

Read **Social Account → TikTok Creator Info**, then choose an allowed privacy level explicitly. TikTok Options also support comments, duet, stitch, brand content, and brand organic settings. The backend rejects missing or disallowed privacy levels. Explicit `false` settings are preserved.

Social account results include capability information for threads and first comments. Unsupported first comments can produce warnings; callers should inspect the result.

## Trigger events

The release includes `post.created`, `post.scheduled`, `post.published`, `post.failed`, `draft.converted`, and `quota.limit_reached`.

Activation registers the workflow webhook URL and saves the subscription secret. Incoming POST bodies are checked with HMAC-SHA256; missing or invalid signatures receive HTTP 401. Only selected events start the workflow. Keep **Verify Signature** enabled outside debugging. The backend must be able to reach n8n's configured webhook URL.

## Development and checks

```sh
pnpm install --frozen-lockfile
pnpm check-types
pnpm lint
pnpm test
pnpm build
```

Tests cover the operation inventory, request mapping, thread and media options, error handling, MCP JSON/SSE responses, and webhook signatures and subscription lifecycle. Local integration testing should also run the packed artifact inside n8n against an isolated backend and storage service.

## License

MIT — see [LICENSE](./LICENSE).
