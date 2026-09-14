# Social media studio for n8n

[![npm version](https://img.shields.io/npm/v/@social-media-scheduler/n8n-nodes-social-media-studio.svg)](https://www.npmjs.com/package/@social-media-scheduler/n8n-nodes-social-media-studio)

**Social media scheduling inside n8n.** A focused community node for
[So-me Studio](https://so-me.studio) — create drafts, schedule posts, manage media,
and automate publishing across
20 platforms (X/Twitter, LinkedIn, Instagram, Facebook, TikTok, YouTube,
Threads, WhatsApp, Pinterest, Bluesky, Mastodon, Reddit, Discord, Slack,
Dribbble and more).

[Website](https://so-me.studio) · [Documentation](https://docs.so-me.studio/integrations/n8n) · [Pricing](https://so-me.studio/pricing) · [Free tools](https://so-me.studio/free-tools)

## Installation

This connector is not published yet. The commands below use the package name planned for the first release; use the local development steps until it is published.

In your n8n instance: **Settings → Community Nodes → Install** → enter `@social-media-scheduler/n8n-nodes-social-media-studio`.

For self-hosted Docker:
```bash
npm install @social-media-scheduler/n8n-nodes-social-media-studio
```

## Authentication

1. Sign in to https://so-me.studio.
2. Go to **Settings → API Keys** and create a new key.
3. In n8n, create a new credential of type **Social media studio API** and paste the key.

## What's included

This package ships two nodes:

| Node | Purpose |
|---|---|
| **Social media studio** | Action node for Posts, Drafts, Media, and Social Accounts. |
| **Social media studio Trigger** | HMAC-SHA256 verified trigger for essential publishing events. |

## Resources & operations

- **Post** — create, get, list, update, delete, schedule, unschedule, retry, resubmit, bulk delete, calendar
- **Draft** — create, get, list, update, delete, convert to post
- **Media** — upload (binary input), presign upload, list, search, delete, bulk delete, move, rename, folder CRUD
- **Social Account** — get, list

Analytics, Comments, Inbox, and Saved Replies are retained for a future release; see [FUTURE_RELEASE.md](./FUTURE_RELEASE.md).

## Trigger events

The initial release exposes `post.created`, `post.scheduled`, `post.published`, `post.failed`, `draft.converted`, and `quota.limit_reached`. The trigger node creates a webhook subscription against the configured n8n webhook URL on activation, captures the per-subscription `secret`, and verifies every incoming POST with HMAC-SHA256 to match the backend's signing scheme.

## Example workflows

### 1. RSS → create a draft
**Trigger:** RSS Feed Read (built-in)
**Step 2:** Social media studio → Draft → Create → text = `{{$json.title}}\n\n{{$json.link}}`

### 2. Failed publication → Slack
**Trigger:** Social media studio Trigger → event = `post.failed`
**Step 2:** Slack → Send Message → channel = `#social`, text = `Publication failed: {{$json.data}}`

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm dev        # tsc --watch
```

To test in a local n8n instance:
```bash
pnpm build
npm link
cd ~/.n8n/custom
npm link @social-media-scheduler/n8n-nodes-social-media-studio
n8n start
```

## License

MIT — see [LICENSE](./LICENSE).

## Links

- **Docs:** https://docs.so-me.studio
- **App:** https://so-me.studio
- **Issues:** https://github.com/7t1-studio/n8n-nodes-social-media-scheduler/issues
