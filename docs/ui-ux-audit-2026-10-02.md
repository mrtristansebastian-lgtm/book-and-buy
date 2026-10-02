# Book & Buy UI / UX audit

Date: 2 October 2026. Read-only browser review of the local app and demo data.

## Local implementation follow-up — 2 October

The tables below preserve the original audit observations. This follow-up records the first implementation batch; it is not a claim that every finding is fixed. Nothing was pushed or deployed.

### Implemented

- Customer Inbox now has only Unread, Bookings and Orders, with visible names and appropriate icons. No selected filter means all conversations; pressing the active filter clears it. Customer unread state no longer falls back to the business unread flag. Local read/send actions keep the two perspectives separate. Bookings/orders require linked records, not guesses from subject text.
- Market readiness exposes visible product/service totals, empty selected catalogs and missing/overlapping shipping profiles. Public catalog empty states explain country selection and market exclusion. Existing market choices are unchanged.
- The inspected South Africa demo market had selected-item mode with **zero selected items**. This explains its empty storefront; it was not evidence that products were lost. Local demo storefront routes now use the local demo consistently, without overriding custom-domain seller resolution. Unavailable detail links no longer crash on a null item.
- Checkout controls have bounded widths; mobile Cart/Checkout/Success studio switching is visible. Local-only publication no longer flashes “Published”, and enabling a draft page does not claim it is already live.
- Users distinguishes roster profiles from sign-in access; unavailable email delivery is visibly disabled. Demo Account is not labelled signed in. Billing distinguishes subscription invoices from customer payments; unfinished plan features are separated from available features.
- Settings section headings now use the intended small hierarchy despite the global title override. Plan actions align across cards. Domains exposes the complete address with copy/open controls and an Other provider guide, without changing DNS or production connections.
- Existing product/service editors permit direct section navigation; portalled desktop editors retain their styling, keyboard focus loop and Escape close. Mobile editing has a section picker and a bounded internal scroll area with visible close/save controls. Service variants use compact expandable summaries, with prices in the workspace currency.
- Manual booking inputs have persistent labels; submission requires a selected available slot and is guarded while saving. Request/order decisions have visible Accept/Decline labels. Stock editing explains variant defaults, currency and actual saved effects.
- Menu fit measures all categories and the actual footer, preventing category-page changes from skipping E-Business. The 375×667 demo menu keeps all bottom actions above navigation.
- Finance currency labels and schedule timeline ticks adapt to narrow widths. Price text wraps instead of truncating. Zero customer account badges are hidden, customer empty lists have Find actions, and profile-photo settings use upload/remove instead of a raw URL field.

### Verification

- Unit suite: **49 tests; 46 passed, 3 emulator-dependent tests skipped, no failures.** New checks cover client filter semantics, catalog readiness, menu sizing and timeline labels.
- Health, typecheck, production build and smoke checks passed. Existing build warnings remain for the large single bundle and a Firebase import that cannot be split; this batch does not resolve bundle architecture.
- Browser checks included customer filters at 390×844 and 375×667, menu fit and category navigation at 375×667, checkout studio switching/width at 375×667, desktop Billing/Plan, Domains at desktop/390×844, Finance at 375×667, mobile product/service editors and desktop direct editing/focus/Escape.
- No settings were saved, live messages sent or bookings moved during those browser checks. Console capture retains the original detail-link crash and a development hot-refresh context error; the detail crash was fixed and rechecked, and a reload recovered the hot-refresh state. Do not interpret retained historical errors as a clean app-wide console pass.
- The final customer Orders empty state and demo session page were checked at 390×844. The browser viewport override was reset successfully, and the customer Inbox was left open for local review.

### Still outstanding

The remaining coverage list below remains relevant: full long-page/state coverage, physical-device gestures/keyboard, all country maps, populated remote customer orders, actual integration saves and emulator-backed transaction/security checks. Further structural work such as schedule density, searchable public-country selection, shipping fee previews and policy previews is not included in this batch. Exceptionally tiny viewports and real enlarged-text menu behavior still need browser review.

## Second local implementation follow-up — mobile scheduling and operational clarity

### Implemented

- Schedule at mobile/tablet widths uses a fitted full-day timeline and readable chronological booking rows, not a horizontally scrolling desktop resource board. Compact previous/next date navigation, a collapsible month picker and a labelled team selector put the day's work first. Closed-day conflicts and bookings with missing/retired staff are retained. Desktop keeps its resource board.
- Products and Services have search, status filters, result counts, resettable empty states and compact management rows. Product search includes variant SKUs. Mobile names/prices wrap and visible actions have 44px targets; product rows no longer nest action buttons inside a button-like article.
- Bookings Settings explains manual confirmation rather than offering unused confirmation modes. Cancellation guidance uses a duration/unit field, while preserving legacy custom text. Both cancellation guidance and Policies are explicitly informational, not automatic enforcement.
- Checkout phone/note switches now govern the displayed fields and submitted optional data. Identity requirements are explicit. Pending requests no longer offer a confirmed-booking calendar action. Cart scheduling avoids repeating the whole booking summary.
- Shipping adds unique names for newly created profiles, an explicit free-rate choice, connected-market readiness and a sample-basket fee preview using the same quote policy as checkout. Existing profiles and assignments are preserved.
- Locations groups the address/pin/clear controls and hides advanced map fields behind a disclosure. A typed address without a verified pin does not claim nearby discovery is enabled. Policies have plain-text previews.
- The public shopping-country selector now reuses the searchable flagged picker. Typing/cancelling a search does not clear the selected shopping country. Checkout shows the already selected country instead of asking for it again.
- Cloud saving only reports success for an explicit successful result. Failed/unavailable cloud saves keep the local changes and show an error.
- World/regional navigation shares tested anchor-preserving pan/pinch math. Keyboard province callouts now use the region's anchor. The world reset remains the complete 1× map, respecting the later request to avoid clipping its top.

### Verification

- **58 tests passed, zero failures and zero skips**, including the Firestore emulator tests. Coverage includes reschedule acceptance/copies/revisions, counter/withdraw/decline, both proposal directions, disabled client policy, concurrent booking versus acceptance, protected booking/order writes, market/order persistence, shipping policy, DST gaps, map transforms, missing-staff preservation, catalog search and duration parsing.
- Health, typecheck and production build passed. The existing large-bundle and mixed Firebase-import warnings remain.
- Responsive browser review: mobile Schedule date picker/selection/focus and complete 09:00–17:00 range; tablet Schedule closed-day conflict; mobile Availability time endpoints; mobile catalog filters/empty state; tablet/desktop management rows; mobile booking preferences, shipping quote blocker, location fields, policy preview and public country search/selection retention; tablet world zoom/reset, country detail and keyboard regional callout.
- No real purchases, messages, booking changes or remote settings saves were submitted through the browser. Transaction tests use isolated disposable `demo-book-buy` data, not production.
- Physical-device pinch, keyboard/safe-area behavior, all-country visual verification and authenticated production saves are still outstanding. Browser viewport testing and gesture-math tests are not a substitute for those checks. No launch-readiness certification is implied.

### Repeat the isolated backend tests

Use Java 21 and the existing Firebase CLI. `firebase.emulators.json` binds Firestore to local port 8185, separate from production and the occupied port 8080.

```powershell
firebase emulators:start --only firestore --project demo-book-buy --config firebase.emulators.json
# In a separate terminal:
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8185'
$env:GCLOUD_PROJECT='demo-book-buy'
node --test tests/*.test.mjs
```

If Windows cannot create Java's local Unix-domain sockets under a long temporary path, use a short dedicated directory via `JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=<short-directory>`. Do not change production Firebase configuration to run these tests.

## Coverage and limitations

Primary viewport sizes: desktop 1543 × 884 and mobile 390 × 844. Additional observations at the browser's default 1280 × 720 and a short mobile 375 × 667 viewport. Mobile observations are responsive browser checks, not physical-device tests.

Reviewed the main owner views: Home, Services, Requests, Schedule, Availability, Products, Orders, Stock, the four E-Business studios, Reports, Live Stats, Finance, Clients and Inbox. Reviewed all 15 Settings pages at desktop and mobile widths. Reviewed public Home, Book, Buy, Cart, Checkout and Success; client authentication, discovery, messages, account and account subsections; the portal entry and onboarding's first step.

Additional states inspected: manual booking; client details and Add client; multi-variant stock editing on desktop/mobile; all five product editor steps on desktop and Media/Category/Variants on mobile; all seven service editor steps on mobile; client chat and reschedule dialog; staff availability, its timeline and booking-window settings; desktop and short-mobile app menu; map keyboard callout and an unsupported-country regional-statistics fallback.

This is a broad page-level audit, **not exhaustive sign-off of every state**. Most page reviews start at the first viewport. Long-page bottoms, every editor branch, every country map and every error state are not all verified. Browser timeouts interrupted the final detail checks; the local preview also stopped and was restarted. An attempted final viewport reset timed out, so restoration was not confirmed.

No settings were saved, messages sent, bookings moved, purchases submitted, or app code changed during the audit. Demo entry and viewing filters were used. Findings about production integrations describe visible UI claims, not independently verified backend behavior. No measured performance or accessibility certification is implied.

## Highest-priority findings

| ID | Finding and reproduction | User impact / recommended direction |
| --- | --- | --- |
| UX-01 | Public demo Book and Buy show “No … published yet” while the owner catalog and individual discovery have items. Selecting South Africa still shows an empty catalog. | Resolve the visibility mismatch. Distinguish unpublished items, market exclusions and genuinely empty catalogs. Do not blame the owner with misleading empty-state copy. Root cause remains unverified. |
| UX-02 | Mobile public Checkout displayed a horizontal scrollbar. | Check overflowing form controls, especially date/country fields. The checkout page should fit the screen without sideways movement. |
| UX-03 | Users Settings explicitly describes invitations as a “stub” and roster-only while exposing an Add member interface. | Clearly separate staff records from actual account access. Do not imply that an invitation or permission grant was completed when it was not. |
| UX-04 | Notifications allows email alerts to appear enabled, but explains that the settings do not send email. | Make unavailable delivery channels visibly unavailable; separate saved preferences from an operational notification service. |
| UX-05 | Manual booking shows an enabled Create booking action when there are no available slots on the selected date. | Disable progression until a valid slot is selected and offer a clear next-available-date path. This is a UI-state finding, not proof that the server accepts invalid bookings. |
| UX-06 | A market can appear Active with zero selected catalog items; shipping readiness is not prominent. | Show a readiness summary: visible services/products, connected shipping profiles and any setup blockers. Warn when a market exposes no catalog. |
| UX-07 | At 375 × 667 the menu paginates categories, but its demo controls are still cut off by bottom navigation. | Include the footer and safe area in the fit calculation. Every control must remain reachable on short screens. |
| UX-08 | Mobile Finance chart labels are clipped; Availability timeline labels run together. | Give charts/timelines responsive axes and fewer mobile ticks. Never clip currency, dates or times. |
| UX-09 | Product editor steps allow the dialog header/close control to scroll out of view; editing an existing product requires stepping through five stages. | Keep modal controls inside a bounded viewport. Let existing-item editing jump directly to any section. |
| UX-10 | Mobile Studio Apron Set pricing truncates the “from” price. | Prioritize the current price; stack the compare-at price rather than hiding purchase-critical information. |

## App-wide consistency

- Preserve the fonts, heading splash, ice-white surfaces and changing gradient. The main need is consistency, not another visual direction.
- Use Payments, Markets, Shipping and Domains as the structural baseline: restrained section headings, clearly grouped content, practical explanatory text.
- Several older Settings pages use section headings nearly as large as their page title. Standardize page, section and field hierarchy.
- Mobile gutters vary: Reports, Live Stats, Finance and some Settings introductions sit flush to the edge while their panels are inset.
- Operational pages often spend the first screen on filters or introductory space before showing the user's work. Reduce mobile header height and prioritize actionable content.
- Service/product card actions are compact for touch. Target comfortable hit areas without enlarging all visual elements.
- Destructive controls sit beside routine edit/save actions in several places. Give removal a clearly separated, deliberate position.
- Replace implementation language such as “Firebase”, “stub”, “V1” and “when … ships” with user-facing availability and setup states.
- Disabled gradient actions can still look inviting. Use a consistent disabled treatment and explain what unlocks the action.
- Some forms depend on placeholders rather than persistent labels. Keep labels visible, indicate required/optional fields and explain why unusual data is requested.
- Autosave, saved, draft, published, unavailable and demo states need distinct wording. A visually active toggle is not the same as a working integration.

## Owner pages

| Page | Notes / improvement direction |
| --- | --- |
| Home | Five KPI tiles consume much of the first mobile screen. The world map then dominates the page. Make operational priorities easier to reach. Clarify which figures respond to the selected time period; requests/orders/unread counts do not read as period-specific. “Live site” in demo deserves clearer context. |
| Services | Large desktop cards leave unused space; mobile cards hide descriptive context and have small Edit/Remove controls. Offer a management-focused density and clearer action hierarchy. |
| Requests | Visually icon-only tick/cross decisions require interpretation, although accessible labels exist. Use visible Accept/Decline text. Separate payment recording from booking approval. Mobile request cards are very tall and hard to compare. |
| Manual booking | Service/staff choices and contact fields need persistent labels. No-slot state needs guidance and a guarded Create action. Clarify pending versus confirmed creation. |
| Schedule | Mobile calendar, staff filters and legends push actual appointments far down. Prioritize the selected day's appointments. A booking on a business-closed day is flagged but needs a clear resolution action beside the warning. |
| Availability | Mobile staff/status controls take substantial space above the calendar. Condense them. Staff timelines have overlapping time labels. Business-closed states disable editing correctly, but the explanation should sit next to the disabled controls. |
| Availability settings | A whole settings dialog/section rail is used for a single booking-window choice. A focused popover or compact sheet would be simpler. |
| Products | Management view has no obvious search/filter in the inspected header. Mobile compare-at/current pricing crowds and truncates. Reduce image dominance for large catalogs. |
| Product editor | Existing-item edits are unnecessarily sequential. Category and discovery tagging are different concepts but share one lengthy step. Explain the difference more compactly. Variant table “On” is vague; use “Available”. Price/compare-at cells need currency context and per-variant accessible names. Review says “4 options” where there are four variant combinations. |
| Service editor | Seven steps are slow for routine edits. Variants are all expanded, producing a very long mobile form. Use summary rows/accordions. The type step has a large blank gap before choices. Review price lacks currency formatting. Photo action includes an unnamed button in the inspected accessibility snapshot. |
| Orders | Visible Accept/Cancel labels would be clearer than tick/cross icons. Show an order reference to distinguish repeat customers. Payment dropdown plus Mark paid can feel redundant. Historical “manual eft” labels should be human-readable legacy-method descriptions, not raw identifiers. |
| Stock | Desktop rows are a good direction. Mobile rows remain tall with a separate action line. Stock search lacks an accessible name in the snapshot. Reduce the filter-to-list gap. |
| Stock editor | Variant navigation is substantially clearer now. Product defaults still expose SKU/quantity alongside variant inventory, which needs an inheritance explanation. Cost needs currency. “Changes apply to Buy stock notes” undersells the actual inventory/shipping changes. Native-blue checkboxes do not match other controls. |
| E-Business Home studio | Nested preview scrolling can be confusing. Make the difference between dashboard Home and public Home explicit. Publishing should clearly describe saved/draft/live state. |
| Book studio | Preview cards and multiple Add/View paths can be clearer about selecting versus inspecting a service. Keep editing controls visually distinct from customer actions. |
| Buy studio | Mobile category navigation needs an obvious horizontal-scroll affordance. Preview and owner management have different information density; preserve that distinction. |
| Cart & checkout studio | Cart summary repeats the service/schedule information below it. In the inspected mobile view, Cart/Checkout/Success preview switches were not apparent; verify access to all stages. Preview-disabled customer actions should be identified as preview behavior. |
| Reports | AOV is unexplained. “Connect Firebase for live tracking” is technical and misleading on historical reports. Mobile KPI stack pushes analysis down. Improve chart labels and consistent location formatting. Funnel is no longer present. |
| Live Stats | The unwanted heading backing is gone. The large map pushes active visitors/commerce details down. Mobile geography is small; consider a dedicated full-screen map view. Clearly distinguish a demo feed from live activity. |
| World/country details | Keyboard callouts and regional-statistics fallback worked. Unsupported-country header still says “States & provinces” without explaining why there is no map. Avoid promising map detail in its callout. A complete country-by-country map and touch-gesture audit is still outstanding. |
| Finance | Page title “All time” does not identify Finance. Desktop chart is oversized relative to receipts. Mobile axes clip currency/date labels. Explain currency selection and distinguish the page's revenue definition from Reports. |
| Clients | Detail has “1 records” grammar. Add client uses a free-text country instead of the newer picker. Remove is too prominent beside routine actions. Linked bookings offer Message but no obvious booking-detail action. |
| Business Inbox | Named filters are clearer. “Pending” could specify “Pending reply” to distinguish conversation status from booking approval. Mobile header/filter area is tall. Customer-side filters have not received the same improvements. |
| Client reschedule dialog | Stronger structure: current time, timezone, note and unchanged-booking explanation are present. No-slot state correctly disables proposal submission. Improve next-available-session guidance; raw timezone IDs could have a readable display label. Proposal submission and later acceptance/counter states were not exercised. |
| App menu | Fine separators and continuous surface are improved. Category pagination needs to account for footer height and bottom navigation on short screens. Icons/labels should remain consistent with individual page titles. |

## All Settings pages

All 15 main Settings pages were inspected at desktop and mobile sizes. Notes apply to the observed demo states; external setup and saving were not performed.

| Page | Notes / improvement direction |
| --- | --- |
| General | Paired desktop fields work well. Currency/timezone options are limited compared with supported markets; verify coverage. “E-Business Platform” terminology differs from the menu. |
| Plan | Oversized headings and uneven CTA alignment. Feature copy includes future/internal delivery promises such as domains “when … ships”. Separate available features from coming-soon features. Mobile plans need an easier comparison. |
| Billing | Oversized secondary heading. Empty invoices need a useful next step or explanation, not just blank history. |
| Users | Most important clarity gap: roster-only member creation is presented beside invitation/access language. Distinguish staff profiles, invited users and granted roles. Persistent input labels and a clearer role-management flow are needed. |
| Payments | One of the best structured pages. Remove repeated enabled-method summaries. Separate disconnect from routine reconnect/setup. Cash heading size does not match online providers. |
| Bookings | Hold-mode labels overlap semantically. Use fewer choices with explicit outcomes. Cancellation-window free text should be a structured duration. Section headings are too large. |
| Checkout | Required versus optional data collection is unclear. Explain identity/contact requirements and the customer-facing effect of each toggle. Backend behavior was not verified. |
| Notifications | Email settings look enabled despite unavailable delivery. Make delivery readiness obvious and separate channels from event preferences. Coming-soon reminders should not resemble active controls. |
| Locations | Pin and clear icons appear stranded around the address input. Rebuild as one coherent field. Map URL/embed fields need preview and purpose; raw links should be advanced options. |
| Markets | Country flags/search are strong. Show visible-item counts and shipping readiness prominently. An Active market with zero selected items needs a warning. Explain Rest of world coverage and exclusions. Mobile editor is far below its selector/list. |
| Shipping | Duplicate default profile names are hard to distinguish. Profile activation and market connection should be visible together. Make free shipping an explicit rate choice rather than an unexplained zero. Add a clear combined-profile fee preview. |
| Reviews | Provider branding is good. Manual Place ID is a high-friction starting point; guide owners through identifying the correct business. Disabled actions need a clearer appearance. |
| Domains | Strong structure and guide layout. Show the complete public address with copy/open controls. Include an “Other provider” path. A registrar-selection button should not look like an external link. |
| Policies | Oversized headings and plain textareas. Show where each policy appears publicly and offer a preview. Clarify saving state. This is presentation feedback, not legal advice. |
| Account | Demo “Signed in” and Sign out/Exit demo controls overlap. Export/delete support copy has no obvious support action. Real authenticated security/account states were not reviewed. |

## Customer-facing pages

| Page | Notes / improvement direction |
| --- | --- |
| Public Home | Hero and buttons are coherent. Shopping-country selector is a native long list unlike Markets' polished search. Explain its effect. Review attribution/policy/contact completeness in the lower page remains to be checked. |
| Public Book | Empty in the tested demo despite discovery listing services. Empty-state wording does not explain country/catalog availability. |
| Public Buy | Same catalog visibility mismatch. Country selection does not reveal the known demo items. |
| Cart | Repeats booking summary as a second large Schedule heading. A disabled Continue/details action needs a visible reason. Demo sample versus genuine cart data should be unambiguous. |
| Checkout | Confirmed mobile horizontal overflow. Country is requested both in the global shopping selector and form. Supported-country guidance appears before interaction. Birthday has no stated purpose. Clarify transactional updates versus optional marketing. |
| Success | Clearly says request, not confirmation, but Add to Google Calendar may encourage treating it as confirmed. Explain a tentative calendar entry or delay until confirmation. “Client portal” versus “Add app” needs simpler action wording. Direct demo navigation is not evidence of a real completed transaction. |
| Individual sign-in/create account | Clean overall form. Inputs rely on placeholders and the inspected sign-in state has no visible password-recovery action. Account creation/submission was not tested. |
| Find / Places | Clear local/international structure. Desktop distance slider stretches excessively wide. Mobile bottom navigation uses icons alone. Discovery claims distance without prominent location-source context. |
| Find / Book | Service cards are usable; distinguish Book from View more clearly. Discovery has offers that the public catalog does not expose. |
| Find / Buy | Horizontal carousel has an arrow affordance. Narrow product cards crowd names and actions. Ensure all prices and variant labels remain readable. |
| Client Inbox | Still has unnamed visible icon filters and the retry-looking Orders icon, unlike business Inbox. Empty desktop copy references “Explore” while the navigation is now Find. |
| Client conversation | Layout works and Reschedule is present. A large attachment can dominate the mobile timeline. Composer should remain usable when the device keyboard opens; not physically tested. |
| Client Account index | Structured activity/profile groups work. A red badge containing zero on Orders is unnecessary and looks like an alert. Account inside Account is an ambiguous label; use Security/sign-in where appropriate. |
| Saved Places | Simple business row works. Further empty/remove states were not tested. |
| Client Bookings | Status, date and payment are visible. No direct reschedule/detail action on the record; users must infer going to chat. Include business/timezone/context and clear permitted actions. |
| Client Orders | “No orders yet” needs a Shop/Find products next step. Populated order details were unavailable in the individual demo. |
| Client General | Raw profile-photo URL beside upload is unnecessary technical exposure for ordinary users. Clarify upload/save feedback. |
| Client Account/sign-in section | “Signed in” during guest demo and duplicate Sign out/Exit demo are confusing. Real security controls require a separate authenticated review. |
| Portal entry | Email-only lookup needs a persistent label and explanation of what verification happens next. No lookup was submitted. The route redirects to client Account once in the individual demo. |
| Business onboarding step 1 | Clean fields, but “Public slug” is technical. Show a complete address preview and name it “Business web address”. Later steps require entering data and were not inspected. |

## Remaining coverage before calling this exhaustive

1. Finish public product/service detail and actual selection flows once the demo/catalog visibility issue is resolved. The final product-detail attempt stalled at loading.
2. Inspect owner authentication/root entry, onboarding steps 2–3, real account roles and protected settings without creating accounts or changing permissions.
3. Review all lower sections of long Settings, Finance, Reports and Home pages; storefront FAQ/photo/review/map overlays; all studio editing panels and staff management dialogs.
4. Inspect supported regional maps with traffic, unknown-region counts, tooltips at each zoom level, touch pinch/pan and bounds. Only the keyboard callout and unsupported-country fallback were verified here.
5. Review reschedule pending/completed/counter/decline cards using isolated test fixtures; this audit did not submit proposals or move bookings.
6. Check tablet layouts, physical-device keyboard/safe-area behavior, enlarged text, reduced motion, loading/offline/error states, keyboard focus loops and measured contrast.
7. Verify production integration and saving behavior separately. The final inspected audit tab had no captured console errors at that point, but browser interruptions prevent treating that as an app-wide console pass.

## Recommended order for a subsequent fix pass

First resolve catalog visibility and checkout overflow. Next address misleading setup/readiness states and guarded actions. Then fix modal/menu bounds and mobile charts/pricing. Finally unify typography, gutters, management density, input labels and customer/business UI parity. Preserve the established brand direction throughout.
