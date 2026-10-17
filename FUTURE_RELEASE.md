# Future release scope

The initial n8n release is intentionally focused on the highest-value publishing workflow:

- Posts
- Drafts
- Media
- Social accounts
- Essential publishing webhook events

The resources below are not part of this package. Their earlier implementations are in the git history of this repository (commit `b2eab5e` and before). They can be promoted into a later release after the core publishing flow has production usage and dedicated integration tests.

## Deferred resources

- Analytics
- Comments
- Inbox conversations and replies
- Saved replies

## Deferred webhook events

- Extended post lifecycle: updated, deleted, bulk deleted, retried, unscheduled, resubmitted
- Draft lifecycle: created, updated, deleted
- Inbox, comment, and saved-reply events
- Media and folder events
- AI generation events
- Analytics report events
- Social-account lifecycle events

## Promotion criteria

A deferred group should be exposed only when its backend contract is stable, its common n8n workflow has been documented, and its success, empty-result, authentication, and error paths have automated coverage.
