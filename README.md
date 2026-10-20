# Social Media Studio for n8n

This is an n8n community node for [Social Media Studio](https://so-me.studio). It lets your n8n workflows create and schedule social media posts, manage drafts, upload media, read connected accounts, and start workflows on publishing events.

Social Media Studio is a social media management platform. It publishes and schedules content to Twitter/X, Instagram, LinkedIn, Facebook, TikTok, YouTube, Threads, Pinterest, Bluesky, Mastodon, and other networks from one account.

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
| Media | Upload, Upload to Library, Get Upload URL, Get Library Upload URL, Get File, Get Many Files, Search, Validate, Get Rules, Delete, Bulk Delete, Move File, Rename File, Create Folder, Get Many Folders, Rename Folder, Move Folder, Delete Folder |
| Social Account | Get, Get Many, Get TikTok Creator Info, List Pinterest Boards, List Discord Channels, List Slack Channels |

Posts and drafts can go to Bluesky, Dev.to, Discord, Dribbble, Facebook, Instagram, LinkedIn (personal and Page), Mastodon, Pinterest, Slack, Threads, TikTok, Twitter/X, WordPress, and YouTube. The post types and options that you can use depend on the destination account.

Fields that point to one post, draft, file, folder, or social account have a **From List** mode and a **By ID** mode. **From List** shows the records of your workspace. In the file list, type a name to search every folder.

**Get Many** and the media list operations have a **Limit**. A limit above 100 is read page by page, because the API returns at most 100 records per page. Turn on **Return All** to read every page.

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
| `draft.converted` | A draft is converted to a post. |
| `post.created` | A post is created. |
| `post.failed` | A post fails to publish. |
| `post.published` | A post is published on the platform. |
| `post.scheduled` | A post is scheduled. |
| `quota.limit_reached` | The plan reaches a usage limit. |

When you activate the workflow, the trigger registers a webhook subscription in Social Media Studio, or reuses the subscription that it registered before. When you deactivate the workflow, it removes the subscription. The trigger checks the HMAC-SHA256 signature of each delivery and answers HTTP 401 to a missing or wrong signature. Keep **Verify Signature** on, except for debugging.

## Credentials

The nodes use an API key.

1. [Sign up](https://app.so-me.studio/signup) for Social Media Studio.
2. Connect at least one social account in Social Media Studio.
3. Go to **Settings → API Keys** and create a key.
4. In n8n, create a **Social Media Studio API** credential and paste the key. n8n tests the key when you save the credential.

Keep the default **Base URL** (`https://api.so-me.studio`). Change it only to test against another API host. Your plan must include API access, and some operations use plan credits. Webhook subscriptions need a plan that includes webhooks. See [Authentication](https://docs.so-me.studio/authentication).

If the key is missing, revoked, or wrong, every operation stops with **The API key is not valid**. Create a new key and update the credential.

## Compatibility

- Requires n8n with community nodes enabled (`n8nNodesApiVersion` 1).
- Built against `n8n-workflow` 2.16.
- The package has no runtime dependencies.

## Usage

### Publish a post with an image

1. Add a **Social Media Studio** node with **Media → Upload to Library**. Set **Input Data Field Name** to the input field that holds the image, usually `data`. The node uploads and checks the file and returns its file ID.
2. Add a second **Social Media Studio** node with **Post → Create**. Write the **Text**, set **Platform** and **Post Type**, then select the destination in **Account**.
3. Put the file ID from step 1 in **Media Library File IDs**, and set **Schedule For**. Leave **Schedule For** empty to publish now.

Run **Media → Validate** before you schedule a post. It checks each file against the rules of each destination. **Media → Get Rules** returns the limits of each platform.

The media of a post is set when you create it. **Post → Update** cannot change it, so it has no media fields. Drafts can change their media until you convert them.

### Threads and first comments

**Post → Create**, **Update**, and **Schedule**, and **Draft → Create** and **Update**, have **Thread Parts** and **First Comment** fields. The **Text** field is the first part of the thread, and the thread parts follow in order. Each part can have text, media library file IDs, or both. Threads work on Twitter/X, Threads, Bluesky, and Mastodon.

First comments work on Facebook, Instagram, Twitter/X, LinkedIn (personal and Page), Threads, YouTube, TikTok, Bluesky, and Mastodon. On another platform the post publishes without the comment, and the response has a warning.

To remove a value from an existing post or draft, use **Clear Thread** or **Clear First Comment**. Drafts also have **Clear Media**. An empty field keeps the current value.

### Uploads from other tools

To upload bytes from outside n8n, use **Media → Get Library Upload URL**, send the bytes with an HTTP PUT to the returned URL, then run **Media → Get File** with **Verify Upload** on. Attach the file IDs after the verification.

### TikTok

Run **Social Account → Get TikTok Creator Info** first. Then choose one of the returned privacy levels in **TikTok Options → Privacy Level**. TikTok refuses a post without an allowed privacy level. **TikTok Options** also controls comments, duet, stitch, and branded content.

On **Create**, the node sends **TikTok Options** only when **Platform** is TikTok. On **Update** and **Schedule**, Social Media Studio rejects TikTok options for a post on another platform.

### Error messages

An error message tells what happened and shows the item number, for example `The item does not exist: Post not found [Item 0]`. The description below the message tells what to do next. Turn on **Retry On Fail** in the node settings to retry when Social Media Studio is not available or receives too many requests.

### Trigger

Social Media Studio must be able to reach the n8n webhook URL. A self-hosted n8n on `localhost` needs a public URL, for example a tunnel, before the trigger can receive events.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Social Media Studio n8n guide](https://docs.so-me.studio/integrations/n8n)
- [Social Media Studio API documentation](https://docs.so-me.studio)
- [Webhook payloads](https://docs.so-me.studio/webhooks/payloads)

## Development

```sh
pnpm install --frozen-lockfile
pnpm check-types
pnpm lint
pnpm test
pnpm build
```

The tests cover the operation list, request mapping, thread and media options, paging, the **Output** modes, the **From List** searches, labels and field order, error messages, MCP JSON and SSE responses, webhook signatures, and the subscription lifecycle.

## Version history

- **0.2.1**
  - Passes the n8n community package scan: title-case credential name, supported node categories, and correct codex node IDs.
  - Removes WhatsApp and Telegram from the posting platforms, because Social Media Studio cannot publish to them. Removes unused code for deferred features.
  - Adds the **Output** option (Simplified, Raw, Selected Fields) to the read operations and **From List** pickers for posts, drafts, files, folders, and accounts, as the n8n UX guidelines ask. Error messages now tell what to do next and show the item number.
  - **Post → Create** sends only the **Files** values that you set. Before, the request failed unless you filled in every file field, because an empty file ID and a zero duration were sent.
  - **Post → Update** no longer offers **Media Library File IDs** and **Clear Media**, because the API cannot change the media of a post.
  - **Media → Create Folder** and **Move Folder** now put the folder in the parent folder that you select. Before, the folder went to the root folder.
  - A **Limit** above 100 now works. The node reads it page by page.
  - **TikTok Options** are sent on **Create** only when **Platform** is TikTok. The help text now says that other platforms reject them.
  - **First Comment** lists TikTok, Bluesky, and Mastodon as supported platforms.
  - The operations that use the Social Media Studio MCP server, such as **Post → Schedule** and **Draft → Create**, show **The API key is not valid** for a missing or wrong key, the same as the other operations.
  - The trigger finds its webhook subscription in workspaces with more than 100 subscriptions, and no longer adds a second subscription for the same workflow.
  - Labels use plain words: **Input Data Field Name**, **Get Upload URL**, **Get Library Upload URL**, **File URL**, and **Storage Key**. Every operation has a description. Required fields come first, and dropdowns are sorted by name.
  - Removes the unused `main` field from `package.json`.
  - Parameter names and operation values do not change, so 0.2.0 workflows and IDs keep working.
- **0.2.0** — Posting-only release: posts, drafts, media, social accounts, thread parts, first comments, TikTok options, media validation, and six publishing events.
- **0.1.x** — First releases.

## License

MIT — see [LICENSE.md](./LICENSE.md).
