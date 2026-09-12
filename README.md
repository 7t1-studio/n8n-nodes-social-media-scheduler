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
| **so-me studio - Social media management** | Action node — perform operations on Posts, Drafts, Inbox, Comments, Media, Analytics, Saved Replies, and Social Accounts. |
| **so-me.studio Trigger** | Webhook trigger — fire a workflow when posts publish, comments arrive, AI generation completes, or any of 40+ other events. HMAC-SHA256 verified. |

## Resources & operations

- **Post** — create, get, list, update, delete, schedule, unschedule, retry, resubmit, bulk delete, calendar
- **Draft** — create, get, list, update, delete, convert to post
- **Inbox** — list conversations, get messages, reply, update, delete, subscribe / unsubscribe accounts
- **Comment** — list, add, update, delete, mark-read
- **Media** — upload (binary input), presign upload, list, search, validate, get rules, delete, bulk delete, move, rename, folder CRUD
- **Analytics** — platform, post, Twitter/X, LinkedIn, Instagram, Facebook, YouTube, WhatsApp
- **Saved Reply** — create, get, list, update, delete
- **Social Account** — get, list

## Post options

The **Post** resource exposes three typed fields next to the free-form **Metadata** JSON. A typed field wins over the same feature written into that JSON.

| Field | Operations | What it does |
|---|---|---|
| **Thread Parts** | Create, Update | Publishes a chain. The **Text** field is the head post and each part follows it, in order. Each part takes text, a comma-separated list of media library file IDs, or both. Supported on TWITTER, THREADS, BLUESKY and MASTODON; another platform returns an error. Limits per part: TWITTER 280 characters, THREADS 500, BLUESKY 300 graphemes, MASTODON 500, and 24 parts at most. Publishing is best effort past the head post: the response carries a warning when the chain stops early. |
| **First Comment** | Create, Update | Posts one comment under the post right after it publishes — hashtags or a link you keep out of the caption. Supported on FACEBOOK, INSTAGRAM, TWITTER, LINKEDIN, LINKEDIN_PAGE, THREADS and YOUTUBE, each with its own length limit. Another platform publishes the post without the comment and returns `warnings: [{ code: "FIRST_COMMENT_UNSUPPORTED" }]`. With **Thread Parts** the comment goes under the last part of the chain. |
| **TikTok Options** | Create, Update, Schedule | Privacy Level, Allow Comments, Allow Duet, Allow Stitch, Brand Content and Brand Organic. |

### TikTok note

TikTok rejects every post that carries no privacy level, and only the creator may choose one. Set **Privacy Level** on every TikTok post. A missing value returns HTTP 400 `TIKTOK_PRIVACY_LEVEL_REQUIRED` with the `privacyLevelOptions` the account may use. Read the creator info of the account first: a private account cannot use `PUBLIC_TO_EVERYONE`, and a level the creator cannot use returns `TIKTOK_PRIVACY_LEVEL_NOT_ALLOWED`. The options are ignored on every other platform.

Social accounts report what they support. **Social Account → Get / List** returns `capabilities`, for example `{ "firstComment": true, "firstCommentMaxLength": 280, "threads": true, "threadPartMaxLength": 280 }`.

## Media validation

**Media → Validate** checks media library files against every destination before you post. Each result carries the destination limits, the issues and the warnings. A dimension or aspect-ratio issue reports `measured`, `required`, a `fix` string and `suggestedDimensions`, so a workflow can crop the file to a size the platform accepts. **Media → Get Rules** returns the rules table itself — allowed types, file and total size, count, duration, width, height, aspect ratio, video codecs and frame rate — and accepts an optional platform and post type filter.

## Trigger events

40+ events grouped by category — `post.*`, `draft.*`, `inbox.*`, `media.*`, `ai.*`, `analytics.*`, `social.*`, `quota.*`. The trigger node creates a webhook subscription against the configured n8n webhook URL on activation, captures the per-subscription `secret`, and verifies every incoming POST with HMAC-SHA256 to match the backend's signing scheme.

## Example workflows

### 1. RSS → create a draft
**Trigger:** RSS Feed Read (built-in)
**Step 2:** so-me studio - Social media management → Draft → Create → text = `{{$json.title}}\n\n{{$json.link}}`

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
