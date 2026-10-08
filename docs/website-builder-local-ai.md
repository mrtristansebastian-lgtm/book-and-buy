# Website builder and local AI

Open **E-Business → Website builder**, or `http://127.0.0.1:5173/#/demo/builder`.

The imported MVP lives in `public/builder`. Its editor IDs, canvas controls,
code workspace, device previews, undo/redo and design permission engine remain
in place. The shell uses Book & Buy's Figtree body font, Plus Jakarta Sans
headings, shared theme tokens, white surfaces and pastel button treatment.

## Running locally

The default provider is now **Codex through your ChatGPT account**. Start the
development server and open the builder. Existing Codex ChatGPT sign-in is reused;
otherwise choose **Sign in with ChatGPT** and finish the official browser flow.
No API key is copied into the browser. Requests consume the signed-in account's
plan allowance. API-key accounts are not used by this integration.

Available models come from Codex's model list. The default is GPT-6.1-Sol when
available. Explicit new website requests generate custom HTML/CSS/JavaScript,
and broad layout/code requests can update a complete document. Targeted edits
still use the existing design action registry. Source edits to existing sites
must preserve protected commerce/core nodes and bindings. Generated code uses
the existing isolated preview, draft storage and undo/redo history.

This bridge is development-only and restricted to same-origin loopback requests.
It is not the commercial Sign in with ChatGPT partner integration. Customer
account sharing in a hosted product requires the official commercial pathway.

## Integration boundaries

- `scripts/builder-ai-plugin.mjs` adds development-only health/chat routes.
  Codex uses the installed app server and official account authentication.
  Requests are limited to same-origin loopback clients; cancellation interrupts
  the active turn. There is no CPU model runtime or fallback in this integration.
- `local-services.js` uses structured Codex responses for website source edits,
  answers, plans and clarification questions. The existing design engine
  validates actions and protects commerce/core bindings. Explicit selected
  element requests remain restricted to those targets.
- Drafts and versions use IndexedDB, scoped to the current workspace. Binary
  imports store actual blobs and recreate their URLs when restored. Script
  previews use data URLs so uploaded images also work with the isolated origin. The latest
  draft and up to 20 versions are local to this browser/device.
- Edit preview grants same-origin DOM editing but disables scripts. View
  preview permits scripts with an opaque origin. Neither mode grants both.
  Protected commerce descendants cannot be overwritten or removed indirectly.
- Generated catalog sections use the workspace's active public products and
  services. Their buttons open the app's existing product/service detail,
  variants, availability and checkout components through a validated bridge.
  Builder checkout is a test: it creates no records and calls no payment
  provider. Real hosting and public links remain unconnected; Publish/Share
  report this clearly rather than returning fabricated URLs.
- The local AI routes are not included in the static production build.
  A deployed builder needs an authenticated backend adapter before it can use
  hosted AI or publish customer websites. The app's production frame security
  policy must also be scoped to permit its own builder frame before deployment.

This phase connects local design testing. Existing project imports remain
static websites, not arbitrary build-tool projects; attachments passed to AI
are metadata, not vision inputs, and Download file exports the selected file.

## Automatic commerce checks and chat

Every request loads a public catalog/payment/checkout context and shows its
connection checks in an expandable progress card. New websites receive linked
catalog sections automatically; subsequent edits validate existing item IDs.
Unknown items lead to clarification questions instead of invented products.
Annotated names/prices come from the workspace. Generated code does not choose
prices, stock, variants, staff schedules or booking times itself.

The context excludes private clients, costs and payment credentials. Allowlisted
commerce actions open shared selectors; their results and required customer
fields follow Book & Buy's existing rules. Catalog changes refresh connected
cards when the builder is idle, and the next AI request reads the latest data.

Build, Plan and Ask modes share a local conversation. New chat clears the
conversation without deleting the website. Chat streams activity, plans,
commentary and readable reasoning summaries, not private chain-of-thought.
Dictation uses browser speech recognition when supported and requires microphone
permission. Optional spoken replies use browser speech synthesis. These are
not ChatGPT's native live voice mode or its complete tool ecosystem.

The local catalog bridge is not yet a hosted generated-site runtime. A production
site still needs an authenticated publishing/runtime integration before using
these connections outside the app's builder preview.

## Verification

Browser checks created a named salon site with three service cards, loaded uploaded images
in script preview, restored the images and source files after reload, and clicked
an imported JavaScript button. Checks covered undo/redo, draft restoration, Edit/View origin isolation, responsive
controls at 1,440 / 390 / 320 pixels, and connection status. Source type checks,
JavaScript syntax checks, and production build are also checked before delivery.

## Codex verification

Verified with the installed Codex app server and an existing ChatGPT Plus account:
model discovery, a real structured response, browser-driven custom website
creation, undo/redo and persistent draft reload. Checked builder widths of
1440, 390 and 320 pixels with no horizontal overflow. Cross-origin POSTs were
rejected; malformed requests returned validation errors. Production bundling
and TypeScript checks passed. Test generation consumed the signed-in account's
allowance; full website requests can take several minutes.

Automatic-commerce verification includes a real AI-generated store linked to
9 active products and 2 services, streamed checks, Ask mode, and a clarification
for a missing product. Native product/service detail handoffs and layouts at
1440, 390 and 320 pixels passed. Nine commerce/preview tests cover public-data
privacy, allowed IDs/actions, simulated checkout and existing preview guards.
Browser checkout also blocked missing customer details, accepted valid details,
showed a labelled test success/reference and left order/booking counts unchanged.
Service selection opened the shared option and available-date/time sheet.

The chat composer contains custom model, mode and thinking-level menus. Model
and effort options come from the signed-in account's model discovery. Each turn
requests available reasoning summaries. Questions support choosing an option
or typing an answer before continuing. Icons use the app's Lucide vector family.
Browser checks covered model search, keyboard navigation, prompt history, new
chat, question choices/custom answers and a real Plan response with its Build
action. Composer menus stayed within desktop, tablet and 390/320px screens.
Two additional transport tests validate thinking effort and ensure private
reasoning is never forwarded; all 11 targeted tests and the final build passed.
