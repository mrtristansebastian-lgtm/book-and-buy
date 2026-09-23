# Social production runbook

## Default cost posture

The social system runs with Firebase and the existing image/video path by default. Cloudflare Stream, Algolia, managed safety scanning, web push, and strict App Check enforcement are all feature-gated. Leaving their flags or credentials blank creates no subscription or reserved-capacity cost.

Enable each paid-by-usage provider only after real traffic justifies it:

1. Keep `SOCIAL_CLOUDFLARE_ENABLED=false` until video delivery needs adaptive streaming.
2. Keep Algolia credentials absent until Firestore prefix search stops meeting discovery needs.
3. Keep `SOCIAL_MANAGED_SAFETY_ENABLED=false` while the built-in spam and high-confidence text guard is sufficient for the controlled rollout.
4. Keep `VITE_FIREBASE_VAPID_KEY` blank until browser push is wanted. In-app notifications continue to work.
5. Turn `SOCIAL_ENFORCE_APP_CHECK=true` only after production App Check metrics show legitimate clients are receiving tokens.

Provider credentials belong in Secret Manager. Never put them in Vite variables, checked-in environment files, client profiles, or workspace documents.

## Canonical data and reliability

- Canonical posts live under `artifacts/{appId}/socialPosts` with immutable creation time, separate publish/update/delete timestamps, moderation state, media state, cached totals, and schema version.
- Every client mutation carries a generated mutation ID, is persisted in IndexedDB before transport, and is safe to replay. The server stores mutation receipts for 30 days.
- Post counters use 128 deterministic shards. The scheduled reconciler repairs cached totals and refreshes Explore scores every 15 minutes.
- Side effects use a transactional outbox with deterministic Cloud Task IDs. Failed dispatch claims return to pending; stale deliveries are retried and moved to dead letters after eight attempts.
- Notification, comment, and feed pagination use timestamp plus document-ID cursors.
- Normal accounts use feed fan-out. Accounts above 10,000 followers are marked for fan-out-on-read.
- Direct client writes to canonical posts, counters, notifications, moderation records, devices, and audit logs are denied by Firestore rules.

## Moderation and privacy

- Built-in text checks block narrowly defined high-confidence abuse and place suspicious link/repetition patterns into human review.
- Users can report posts/comments and mute or block accounts. Duplicate reports are suppressed.
- Owners can hide comments. Platform admins can remove/restore content, warn/suspend accounts, resolve appeals, and review immutable audit records at `#/admin/social-moderation`.
- Saves are private. Self-actions do not generate self-notifications. Per-account notification preferences are checked before in-app or push delivery.
- Managed image/video/text classifiers are intentionally gated until their APIs and budget alerts are configured.

## Migration

Run from the `functions` directory with Application Default Credentials:

1. `node scripts/migrate-social.js` — dry run and print parity totals.
2. Review workspace/profile totals and canonical IDs.
3. `node scripts/migrate-social.js --apply` — idempotently write canonical posts, reactions, saves, follows, comments, shard totals, and parity documents.
4. Re-run the dry run and inspect `socialMigrationParity` before moving an account to canonical-only reads.

Legacy workspace/profile fields remain available during rollback. Do not delete them until all accounts have 100% parity and the rollback window has closed.

## Release gates

Deploy in this order: rules and indexes, functions, then Hosting. Use flags for demo, internal accounts, 5%, 25%, and full rollout. Do not cut over unless:

- type-check, production build, health check, social unit tests, rule-emulator tests, and browser accessibility checks pass;
- migration parity is 100%;
- no critical moderation or authorization finding remains;
- the dead-letter queue is empty;
- a staging load test proves the target traffic profile and viral-post hotspot; and
- monitoring and budget alerts are live.

The local `load:social` check validates one million deterministic hot-post actor IDs and counter-shard distribution. It is not a substitute for the required 10,000-concurrent-user staging test.

## Operations

Alert on callable latency/error rate, oldest pending outbox event, dead-letter count, notification delay, counter drift, feed cursor gaps, search lag, stream processing failures, invalid push tokens, moderation backlog, and App Check rejection rate.

Enable Firestore point-in-time recovery and scheduled exports before the production canary. Retain notifications for 90 days, operational events for 30 days, soft-deleted content for 30 days, and moderation/audit records for one year. Deletion and export jobs must be tested against a non-production project before scheduling them.
