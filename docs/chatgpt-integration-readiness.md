# Book & Buy: ChatGPT integration readiness

Reviewed 8 October 2026. Local preparation only. Deployment remains paused.

## Compatibility and approval boundary

React and Firebase are compatible in principle: existing owner authentication stays in Firebase, and an owner-scoped backend gateway handles account linking and inference for Website Editor and Butler. Compatibility with the **hosted commercial** integration remains subject to OpenAI's issued contract. Request commercial identity linking and eligible-plan inference separately; approval for one does not establish approval for the other.

Both `AI_CHATGPT_OAUTH_ENABLED` and `AI_CHATGPT_INFERENCE_APPROVED` remain `false` in the checked-in example. Disabled authorization, model discovery and inference make no OpenAI request. Mocks do not establish production access. No dynamic registration, private ChatGPT endpoint or local Codex credential is used by the hosted adapter.

Official references: [overview](https://developers.openai.com/siwc/quickstart), [commercial application](https://developers.openai.com/siwc/request-client-id), [website identity](https://developers.openai.com/siwc/website), [plan-use and hosted-app boundary](https://developers.openai.com/siwc/token-sharing-open-source).

## Implemented preparation

| Area | Local behavior |
| --- | --- |
| Owner authentication | Google/email login retained; ChatGPT cannot create, merge or switch a Book & Buy owner account |
| Linking | Verified issuer/client/subject; email is display-only; fresh PKCE/state/nonce, secure browser binding, atomic callback consumption and ten-minute expiry |
| Account changes | Explicit connect/reconnect/replace/enable-plan intent; a different verified identity stays pending until revision-checked owner confirmation; ten-minute confirmation expiry |
| Identity-only grants | Remain connected without inference access; owner can explicitly reauthorize for plan permission after approval |
| Credentials | Encrypted server-only records; serialized refresh lease; rotating tokens updated together; generation checks prevent disconnect/replacement races |
| First use | Server-persisted versioned plan notice; gateway rejects inference without acknowledgement; separate from business-write approval |
| Requests | Dedicated ChatGPT allowlist, explicit history, stateless streaming and server instructions; existing included/API-key formats retained |
| Tools | `bookbuy` namespace; normalized namespace and call IDs retained; unknown namespaces rejected before execution; existing guarded handlers and inline reviews preserved |
| Models | Account `/v1/models` order/display names intersected with server allowlist; connection change resets conversation scope |
| Usage | ChatGPT billing shown near both composers; quota recovery links to ChatGPT usage; no invented allowance or reset time; no automatic billing switch |
| Recovery | Durable run IDs/events and cancellation retained; safe error status/code/parameter/request ID/body classification; raw diagnostics excluded |
| Deletion | Owner command marks chat first, cancels active runs and invalidates unexecuted proposals; bounded cleanup removes turns/runs/events after settlement; content-free tombstone blocks late recreation |

Website drafts, published versions, business records and executed-action audit history are preserved when chats are deleted. History remains until the owner deletes it. A deletion in progress is hidden immediately; remaining cleanup resumes every five minutes. Large histories are removed in bounded pages. This describes application storage; backup retention must also be specified in the production privacy policy.

Only user-started requests are supported. Existing deterministic Butler routines retain their permissions, but no scheduler invokes ChatGPT-funded inference. Claude, plugins and hosted AI tools outside the prepared function namespace are not part of this launch.

Request details follow the [published limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations) as a preparation baseline: array context, `store: false`, `stream: true`, no unsupported output-token or persistent-conversation fields. Account discovery follows [models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference). Structured responses are validated on our server. Model capabilities and this request shape must be reconciled with the approved commercial contract.

## Configuration and operations after approval

1. Obtain explicit hosted-commercial identity **and** plan-use authorization. Request a confidential backend client; configure the authentication method actually issued. Current code supports `client_secret_basic` and approved public-client `none`; another issued method requires an adapter change.
2. Store `OPENAI_CLIENT_SECRET` when applicable and `AI_SETTINGS_ENCRYPTION_KEY` in Firebase/Google Secret Manager. Set issued client ID, exact first-party HTTPS callback, return URL and model/capability allowlist through backend configuration. Never commit real values or place them in browser environment variables.
3. Preserve the configured encryption key while ciphertext exists. Key rotation needs a staged decrypt/re-encrypt migration before retiring the old key. Restrict service-account access, redact authorization headers and raw provider bodies, and monitor safe error identifiers and cleanup failures.
4. Deploy indexes and functions together in staging when deployment is authorized. Check the callback Hosting rewrite, `__session` cookie forwarding, Firebase callable streaming, OAuth discovery, key rotation and provider revocation against registered staging URLs.
5. Review identity, scope, audience, expiry and refresh behavior against the issued contract. Temporary failures retain credentials; terminal refresh errors require reconnection. Disconnect disables local use immediately; UI reports when remote revocation could not be confirmed.
6. Add the agreed small owner activation allowlist before turning either feature on. Current preparation retains global off switches; an approved production rollout still needs that allowlist and authorized-account verification.
7. Run desktop/mobile owner journeys with approved test accounts, including consent, account replacement, model changes, quota/policy failures, interrupted streams, cancellation, deletion and publishing. Verify actual usage attribution and branding with OpenAI before expanding access.

Operational references: [sessions](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions), [error recovery](https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery), [experience requirements](https://developers.openai.com/siwc/ui-ux-guidelines).

## Evidence and remaining verification

Automated suites cover callback replay/forgery/owner/expiry/signature claims, identity-only grants, replacement confirmation and stale revisions, first-use consent, gated network access, dedicated request shape, namespaced tools, safe errors, interrupted streams, concurrent refresh and disconnect races, and deletion without content resurrection. Firebase emulator checks cover real transactions, in-flight deletion, existing commerce/publishing behavior and Butler permissions. Test logs are local in `.local-dev-logs/chatgpt-preparation-*.txt`.

The final guarded backend run after the verified-purchase reviews changes passed **74 checks with zero skips** (`.local-dev-logs/platform-review-backend-final.txt`). It used only the two explicit demo projects and blocked network access outside the local Firestore emulator. An owned local emulator was warmed with a bounded heap after two startup timeouts; the unchanged backend runner loaded current rules and performed the checks, and the helper stopped its Java process afterward.

Real partner accounts, production quotas, issued client authentication, serving regions, OAuth staging journeys, final branding and production monitoring are **not verified** by mocks. Payment sandbox validation and staged deployment remain separate release gates. Local development Codex access is not evidence of commercial partner readiness.
