# Book & Buy: draft partner application brief

Prepared 8 October 2026. Draft only; no application has been submitted.

## Product and requested access

Book & Buy helps business owners create commerce websites and manage their businesses through Book & Buy Butler. The AI Website Editor turns user requests into editable website drafts. Butler helps owners inspect their business, prepare changes and review actions within the existing app.

We request commercial Sign in with ChatGPT account linking **and permission to use eligible customers' ChatGPT plans** for both features through our hosted Firebase gateway. We retain Google/email authentication for Book & Buy. Owners choose their AI connection inside AI Settings; ChatGPT does not become the owner-login provider or merge app accounts.

The proposed initial release supports user-started tasks only. It excludes scheduled ChatGPT inference, Claude account linking and ChatGPT plugins. Owners benefit by bringing an eligible existing plan into practical website and business workflows, with a clear choice of billing source and no silent fallback to another bill.

## Controls and data handling

The gateway isolates owner workspaces, encrypts tokens on the server, verifies identity and inference permissions separately, uses account-authorized models, and supports explicit disconnect and account-replacement confirmation. First-use consent explains plan usage. Both composers identify ChatGPT-plan use and link to usage management.

Butler calls a bounded set of Book & Buy server tools. Business writes pass existing authorization, validation and inline review checks. Commerce decisions remain authoritative on the backend; generated designs cannot set trusted totals, stock, availability or payment outcomes. Credentials and financial movement stay in dedicated owner flows.

Inference includes only the request, relevant Book & Buy chat context and workspace information needed for the task. Connecting does not import ChatGPT conversations. Book & Buy history stays until the owner deletes it; deletion cancels active requests and removes chat/run content while preserving business records and executed-action audit history. We exclude credentials and payment secrets from AI context.

## Evidence to provide

- Working product walkthrough: AI Settings, Website Editor and Butler, including a reviewed business action.
- Architecture summary and the local readiness document beside this brief.
- Mock/emulator results for consent, account replacement, token renewal, revocation failures, interrupted runs, deletion and workspace isolation.
- A clear distinction between local preparation and integration verified with OpenAI-authorized accounts.

## Owner facts still required

| Input | Status |
| --- | --- |
| Legal company name, registration jurisdiction and address | Owner to supply |
| Application contact name, role and business email | Owner to supply |
| Public product URL and accessible product demo | Confirm actual URLs |
| Privacy policy, terms and support URLs | Confirm published URLs and production data-retention wording |
| Launch markets and Firebase serving regions | Owner to confirm; do not infer from local timezone |
| Current users, anticipated eligible connections and request volume | Owner to supply measured figures/estimates |
| Proposed registered production and staging HTTPS callbacks | Confirm domains and callback environments |
| Intended models and business workflows | Confirm after account catalog and commercial contract review |

## Questions for OpenAI

Please confirm the permitted hosted-commercial server-side inference contract; eligible plans and workspaces; allowed serving regions; provisioned confidential-client authentication; approved identity/inference scopes and token audiences; model discovery and capability restrictions; namespace/structured-output support; registered staging and production callbacks; revocation and usage recovery; and required button/asset formats.

Our implementation follows published documentation as a preparation baseline. We will reconcile the issued commercial contract, verify staging with authorized accounts, and launch to a small approved owner allowlist before expanding access. Both ChatGPT feature flags remain disabled pending approval.

Application entry: [Request a client ID](https://developers.openai.com/siwc/request-client-id). Commercial context: [Sign in with ChatGPT overview](https://developers.openai.com/siwc/quickstart). Hosted boundary: [ChatGPT plan usage](https://developers.openai.com/siwc/token-sharing-open-source).
