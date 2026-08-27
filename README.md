# @social-media-scheduler/n8n-nodes-social-media-scheduler

[![npm version](https://img.shields.io/npm/v/@social-media-scheduler/n8n-nodes-social-media-scheduler.svg)](https://www.npmjs.com/package/@social-media-scheduler/n8n-nodes-social-media-scheduler)

**Social media scheduling inside n8n.** A community node for
[So-me Studio](https://so-me.studio) — schedule posts, manage inbox
conversations, generate AI content and automate social-media operations across
20 platforms (X/Twitter, LinkedIn, Instagram, Facebook, TikTok, YouTube,
Threads, WhatsApp, Pinterest, Bluesky, Mastodon, Reddit, Discord, Slack,
Dribbble and more).

[Website](https://so-me.studio) · [Documentation](https://docs.so-me.studio/integrations/n8n) · [Pricing](https://so-me.studio/pricing) · [Free tools](https://so-me.studio/free-tools)

## Installation

In your n8n instance: **Settings → Community Nodes → Install** → enter `@social-media-scheduler/n8n-nodes-social-media-scheduler`.

For self-hosted Docker:
```bash
npm install @social-media-scheduler/n8n-nodes-social-media-scheduler
```

## Authentication

1. Sign in to https://so-me.studio.
2. Go to **Settings → API Keys** and create a new key.
3. In n8n, create a new credential of type **so-me.studio API** and paste the key.

## What's included

This package ships two nodes:

| Node | Purpose |
|---|---|
| **so-me studio - Social media management** | Action node — perform operations on Posts, Drafts, Inbox, Comments, Media, AI generation, Analytics, Saved Replies, Social Accounts, and Webhook subscriptions. |
| **so-me.studio Trigger** | Webhook trigger — fire a workflow when posts publish, comments arrive, AI generation completes, or any of 40+ other events. HMAC-SHA256 verified. |

## Resources & operations (Top 12)

- **Post** — create, get, list, update, delete, schedule, unschedule, retry, resubmit, bulk delete, calendar
- **Draft** — create, get, list, update, delete, convert to post
- **Webhook** — create / list / update / delete subscription, test, retry delivery, list events
- **Inbox** — list conversations, get messages, reply, update, delete, subscribe / unsubscribe accounts
- **Comment** — list, add, update, delete, mark-read
- **AI Caption** — generate text, generate JSON, get history
- **AI Image** — generate, get, list, delete
- **AI Video / UGC** — generate, get, list, delete, list avatars, list sounds
- **Media** — upload (binary input), presign upload, list, search, delete, bulk delete, move, rename, folder CRUD
- **Analytics** — platform, post, Twitter/X, LinkedIn, Instagram, Facebook, YouTube, WhatsApp
- **Saved Reply** — create, get, list, update, delete
- **Social Account** — get, list

## Trigger events

40+ events grouped by category — `post.*`, `draft.*`, `inbox.*`, `media.*`, `ai.*`, `analytics.*`, `social.*`, `quota.*`. The trigger node creates a webhook subscription against the configured n8n webhook URL on activation, captures the per-subscription `secret`, and verifies every incoming POST with HMAC-SHA256 to match the backend's signing scheme.

## Example workflows

### 1. RSS → AI caption → schedule
**Trigger:** RSS Feed Read (built-in)
**Step 2:** so-me studio - Social media management → AI Caption → Generate Text → prompt = `"Write a Twitter post about: {{$json.title}}"`
**Step 3:** so-me studio - Social media management → Post → Create → text = `{{$json.text}}`, platform = `TWITTER`, scheduledAt = `{{$now.plus({hours: 2}).toISO()}}`

### 2. New comment → Slack
**Trigger:** so-me.studio Trigger → events = `post.published`, `inbox.comment_received`
**Step 2:** Slack → Send Message → channel = `#social`, text = `📥 New ${{$json.event}}: ${{$json.data.text}}`

### 3. Weekly analytics digest → email
**Trigger:** Schedule Trigger (weekly Monday 8am)
**Step 2:** so-me studio - Social media management → Analytics → Platform Analytics → loop over each connected account
**Step 3:** Format → Send Email

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
npm link @social-media-scheduler/n8n-nodes-social-media-scheduler
n8n start
```

## License

MIT — see [LICENSE](./LICENSE).

## Links

- **Docs:** https://docs.so-me.studio
- **App:** https://so-me.studio
- **Issues:** https://github.com/7t1-studio/n8n-nodes-social-media-scheduler/issues
