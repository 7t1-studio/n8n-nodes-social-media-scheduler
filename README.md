# Social Media Studio for n8n

This is an n8n community node for [Social media studio](https://so-me.studio). It lets your n8n workflows create and schedule social media posts, manage drafts, upload media, read connected accounts, and start workflows on publishing events.

Social media studio is a social media management platform. It publishes and schedules content to Twitter/X, Instagram, LinkedIn, Facebook, TikTok, YouTube, Threads, Pinterest, Bluesky, Mastodon, and other networks from one account.

[Installation](#installation) · [Operations](#operations) · [Credentials](#credentials) · [Compatibility](#compatibility) · [Usage](#usage) · [Resources](#resources) · [Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation. In **Settings → Community Nodes → Install**, enter:

```
@social-media-scheduler/n8n-nodes-social-media-scheduler
```

## Operations

The package contains two nodes.

### Social Media Studio

| Resource | Operations |
|---|---|
| Post | Create, Get, Get Many, Update, Delete, Schedule, Unschedule, Retry, Resubmit, Bulk Delete, Get Calendar |
| Draft | Create, Get, Get Many, Update, Delete, Convert to Post |
| Media | Upload, Upload to Library, Presign Upload, Presign Library Upload, Get File, Get Many Files, Search, Validate, Get Rules, Delete, Bulk Delete, Move File, Rename File, Create Folder, Get Many Folders, Rename Folder, Move Folder, Delete Folder |
| Social Account | Get, Get Many, Get TikTok Creator Info, List Pinterest Boards, List Discord Channels, List Slack Channels |

Posts and drafts can go to Twitter/X, Instagram, LinkedIn (personal and Page), Facebook, TikTok, YouTube, Threads, Pinterest, Dribbble, Bluesky, Mastodon, WordPress, Dev.to, Discord, and Slack. The post types and options that you can use depend on the destination account.

Fields that point to one post, draft, file, folder, or social account have a **From List** mode and a **By ID** mode. **From List** shows the records of your workspace. In the file list, type a name to search every folder.

**Get**, **Get Many**, **Get Calendar**, and **Search** operations have an **Output** option:

| Output | Returns |
|---|---|
| Simplified (default) | Up to 10 of the most useful fields. Nested values, such as the account name, move to the top level. |
| Raw | All the fields that the API returns. |
| Selected Fields | The ID and the fields that you select in **Fields**. |

The n8n AI Agent can use this node as a tool. Use **Simplified** or **Selected Fields** for a tool, so that the agent receives fewer fields.

### Social Media Studio Trigger

Starts a workflow on these events:

| Event | Fires when |
|---|---|
| `post.created` | A post is created. |
| `post.scheduled` | A post is scheduled. |
| `post.published` | A post is published on the platform. |
| `post.failed` | A post fails to publish. |
| `draft.converted` | A draft is converted to a post. |
| `quota.limit_reached` | The plan reaches a usage limit. |

When you activate the workflow, the trigger registers a webhook subscription in Social media studio. When you deactivate the workflow, it removes the subscription. The trigger checks the HMAC-SHA256 signature of each delivery and answers HTTP 401 to a missing or wrong signature. Keep **Verify Signature** on, except for debugging.

## Credentials

The nodes use an API key.

1. [Sign up](https://app.so-me.studio/signup) for Social media studio.
2. Connect at least one social account in the Social media studio dashboard.
3. Go to **Settings → API Keys** and create a key.
4. In n8n, create a **Social Media Studio API** credential and paste the key. n8n tests the key when you save the credential.

Keep the default **Base URL** (`https://api.so-me.studio`) unless you run your own Social media studio backend. Your plan must include API access, and some operations use plan credits. Webhook subscriptions need a plan that includes webhooks. See [Authentication](https://docs.so-me.studio/authentication).

## Compatibility

- Requires n8n with community nodes enabled (`n8nNodesApiVersion` 1).
- Built against `n8n-workflow` 2.16.
- The package has no runtime dependencies.

## Usage

### Publish a post with an image

1. Add a **Social Media Studio** node with **Media → Upload to Library**. Set **Binary Property** to the binary field that holds the image. The node uploads and verifies the file and returns its file ID.
2. Add a second **Social Media Studio** node with **Post → Create**. Set **Platform** and **Post Type**, then select the destination in **Account**.
3. Put the file ID from step 1 in **Media Library File IDs**, write the **Text**, and set **Schedule For**. Leave **Schedule For** empty to publish now.

Run **Media → Validate** before you schedule a post. It checks each file against the rules of each destination. **Media → Get Rules** returns the limits of each platform.

### Threads and first comments

**Post → Create**, **Update**, and **Schedule**, and **Draft → Create**, **Update**, and **Convert to Post**, have **Thread Parts** and **First Comment** fields. The **Text** field is the first part of the thread, and the thread parts follow in order. Each part can have text, media library file IDs, or both. Threads work on Twitter/X, Threads, Bluesky, and Mastodon.

To remove a value from an existing post or draft, use **Clear Media**, **Clear Thread**, or **Clear First Comment**. An empty field keeps the current value.

### Uploads from other tools

To upload bytes from outside n8n, use **Media → Presign Library Upload**, send the bytes with an HTTP PUT to the returned URL, then run **Media → Get File** with **Verify Upload** on. Attach the file IDs after the verification.

### TikTok

Run **Social Account → Get TikTok Creator Info** first. Then choose one of the returned privacy levels in **TikTok Options → Privacy Level**. TikTok refuses a post without an allowed privacy level. **TikTok Options** also controls comments, duet, stitch, and branded content.

### Error messages

An error message tells what happened and shows the item number, for example `The item does not exist: Post not found [Item 0]`. The description below the message tells what to do next. Turn on **Retry On Fail** in the node settings to retry when Social media studio is not available or receives too many requests.

### Trigger

Social media studio must be able to reach the n8n webhook URL. A self-hosted n8n on `localhost` needs a public URL, for example a tunnel, before the trigger can receive events.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Social media studio n8n guide](https://docs.so-me.studio/integrations/n8n)
- [Social media studio API documentation](https://docs.so-me.studio)
- [Webhook payloads](https://docs.so-me.studio/webhooks/payloads)

## Development

```sh
pnpm install --frozen-lockfile
pnpm check-types
pnpm lint
pnpm test
pnpm build
```

The tests cover the operation list, request mapping, thread and media options, the **Output** modes, the **From List** searches, error messages, MCP JSON and SSE responses, webhook signatures, and the subscription lifecycle.

## Version history

- **0.2.1** — Passes the n8n community package scan: title-case credential name, supported node categories, and correct codex node IDs. Removes WhatsApp and Telegram from the posting platforms, because Social media studio cannot publish to them. Removes unused code for deferred features. Adds the **Output** option (Simplified, Raw, Selected Fields) to the read operations and **From List** pickers for posts, drafts, files, folders, and accounts, as the n8n UX guidelines ask. Error messages now tell what to do next and show the item number. IDs from 0.2.0 workflows still work.
- **0.2.0** — Posting-only release: posts, drafts, media, social accounts, thread parts, first comments, TikTok options, media validation, and six publishing events.
- **0.1.x** — First releases.

## License

MIT — see [LICENSE.md](./LICENSE.md).
