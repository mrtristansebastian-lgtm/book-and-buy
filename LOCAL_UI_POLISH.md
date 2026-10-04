# Local UI polish record

This pass was kept local for review until the owner requested push and deployment
on 4 October 2026. Release checks and verification are recorded below.

## Implemented changes

- Shared controls: explicit action variants and semantic icons, body typography,
  40px desktop / 32px mobile action heights and 36px desktop / 30px mobile filters;
  fields retain 40px desktop / 44px mobile targets. Visible focus, disabled/busy states,
  native-gradient interaction outlines, centred exact chip counts, and central
  non-interactive status badges. Period capsules and specialised calendar/media
  controls remain separate from ordinary actions.
- Page chrome: headings, search and filter bands scroll with their pages rather
  than pinning on scroll. Customer headings live inside the content scroller;
  navigation docks, specialist timetable axes and dialog controls stay independent.
- Orders and Requests: wider desktop action tracks and wrapping action groups;
  readable labels; long name/status combinations can wrap. In the stacked
  tablet/mobile layout, item/service, price and payment summaries wrap instead
  of being hidden by an ellipsis.
- Inbox: long client names wrap, Quick Actions has bounded scrolling on short
  screens, and its grouped controls have clearer separation. Voice/file
  attachments shrink inside narrow message bubbles; unbroken message text wraps.
  Recording, playback and message behaviour are unchanged by these layout fixes.
- Client files: long contact values and links wrap safely; order history no
  longer reserves an empty action column. Edit/delete icon controls use 40/44px
  hit areas. Names and history details have safer narrow-screen wrapping.
- Schedule: the booking-detail list uses clear body-text hierarchy and line
  heights, supports long names/service text, and preserves the time icon's shape.
  Calendar layout, availability colours and booking behaviour are retained.
- Reports and Finance: section headings and chart-axis typography are scoped and
  responsive. Revenue geometry uses the measured chart canvas, listens for
  resize, and keeps endpoint labels inside its width. The expanded chart is a
  named modal with focus trapping, Escape dismissal and trigger-focus restoration.
  Finance search, payment-status and sorting controls have explicit accessible
  names; receipt-source tabs retain selected-tab semantics.

## Regression coverage

`tests/reporting-polish.test.mjs` exercises measured revenue geometry and resize
cleanup, narrow-width fallback, endpoint alignment, hover-coordinate mapping,
expanded-dialog focus/Escape/scroll restoration, empty periods, named finance
filters and unchanged callbacks, scoped reporting CSS, and wrapped operation
summaries. It uses deterministic hook/DOM fixtures, not a real browser renderer.

`tests/control-integration.test.mjs` covers operation chips/counts, explicit
positive/destructive actions, busy-state forwarding, semantic icons and the
single Confirmed checkmark. Focused existing tests cover inbox filters, voice
metadata/duration, schedule grouping, day windows and active shifts.

`tests/mobile-control-flow.test.mjs` protects compact action/filter geometry,
unchanged field and exact-count sizing, period capsules, narrowly scoped scrolling
page headings, customer dock-hidden grid rows and desktop header gutters. Reporting
tests also exercise measured Analytics widths and safe money/endpoint alignment.

## Scope and limitations

- This record describes concrete code changes; it does not certify pixel-perfect
  rendering or universal accessibility across every browser/device.
- Browser checks are handled separately by the main task. The test author did
  not perform or claim desktop/mobile browser verification for this record.
- Visual review should include 320px, 375px, tablet and desktop widths, enlarged
  text, long labels/contact values, Quick Actions on short screens, narrow voice
  notes, and the expanded Finance chart with keyboard navigation.
- Stored status values, payment/deletion semantics and live customer records are
  unchanged. The subsequent Reports work adds optional anonymous visitor/source
  metadata to analytics and verified attribution on new bookings/orders. Its
  rules, indexes and backend changes remain local and require deployment before
  live attribution can be verified. Existing historical records are not backfilled.
- Full-suite, health and production-build results belong to the main task's
  final handoff; this document deliberately does not infer those results.

## E-Business profile and dashboard continuation — 4 October 2026

- Home, Reports and Finance now use `DashboardStat`: flat white, centred value
  above its label, with purpose-specific hierarchy. Home uses one continuous
  summary band, Finance a larger primary total, Reports quieter insight totals. Finance's
  native-style metric picker remains separate from the tile and graph; business
  currency is authoritative. Missing recorded payment amounts/costs are disclosed,
  not fabricated from today's catalog prices.
- E-Business is a cover-photo/profile-photo identity with Home, Book and Buy tabs,
  compact offer highlights, readable story sections, a photo grid/viewer, Reviews,
  FAQ and Visit. Existing content, image fields and merchant text-colour tokens are
  retained. The desktop Phone preview adapts by container width.
- Places and discovery business identities open the same canonical profile that
  E-Business edits. Local Find search/tab preferences survive returning from it.
  Missing/unpublished addresses cannot borrow another business's private content;
  a slug change cannot show a stale remote profile. Only an authenticated owner
  may use their unpublished local preview.
- New businesses start on an active Free profile, without a trial/card/subscription
  requirement. Existing paid plans and overrides are preserved. Profile publishing
  atomically checks address ownership; rules prevent cross-owner overwrite and
  ownership transfer. These rules are included in the requested release.
- Profile Save and Message actions preserve a safe profile return after sign-in.
  Demo messaging stays local; real conversation failures show an error rather than
  opening an unrelated local inbox. No messages were sent in browser QA.
- Crop dialogs now render outside preview stacking contexts, with keyboard focus
  trapping and Escape dismissal. Compact photo-edit controls are icon-only; the
  photo viewer supports next/previous, Escape and focus restoration.

### Actual browser review in this continuation

Reviewed profile and reporting at 320px/375px phone widths, 768px tablet and 1543px
desktop; checked the desktop's internal Phone preview too. Exercised reversible
name editing, image URL/crop opening and cancellation, gallery next/Escape,
keyboard profile-tab selection, shopping-country persistence, native statistics
selection, saved-state toggling, local demo conversation opening, Places search
restoration, sign-in return routing and the unavailable-profile state. No profile
was published, no payment was changed and no real customer message was sent.

The production build still reports the existing large-bundle warning. Live cloud
authentication, uploads, transactions and security-rule execution need their normal
configured integration checks; emulator-dependent tests are skipped when no
emulator is running. This is not a claim that every screen/browser is perfect.

## Catalog cards and Home actions continuation

- Product, Service and Inventory cards share one corner Settings control opening
  a compact View/Edit/Delete modal. Existing deletion confirmation remains in place.
  The shared modal uses the existing focus trap, Escape dismissal and focus return.
- Card names and prices are left aligned with a clearer 17/15px desktop and 16/14px
  mobile hierarchy, separate from the image. Inline action rows were removed.
- Mobile shared actions and filters are now 32/30px minimum-height controls; labels
  may expand. Text fields remain 44px and exact count badges remain 22px.
- Home utility actions have a smaller 32px desktop / 30px mobile presentation.
  Copy link and Open stay grouped without a full-width capsule; Live stats sits
  beside wrapping visitor metadata. Home grid tracks can shrink at 320px.
- Automated checks completed with 218 passing and six emulator/integration skips
  before the final Home action adjustment; focused checks cover that adjustment.
  Health checks, typecheck and production build passed. Browser automation has
  intermittently timed out; only successful rendered checks are claimed.
- The browser connection recovered. Checked Home at 320px, 375px and 1543px,
  including compact utility sizes, the 320px greeting wrap and no horizontal
  overflow. Reviewed Product cards at 320/375px and 1543px, Inventory at 320px,
  and Services at 768px. Exercised View and Edit then closed without saving;
  Delete opened confirmation and Keep item cancelled it. Escape restored focus
  to the card settings trigger. No catalog item was changed or deleted.

## Compact Delete and dashboard hierarchy — 4 October 2026

- Explicit Delete/Remove actions use one compact dustbin-only button, with the
  original accessible name and tooltip retained. Cancel/Decline remain text
  actions. Busy state blocks repeat submissions and retains square geometry.
  Delete buttons are 36px desktop / 32px mobile; confirmation behavior is unchanged.
- Home uses a leading Revenue card and four quieter operational cards. Reports
  uses an evenly sized traffic summary, while Finance has one focused readout
  beside its graph. All use ice-white surfaces, a fine grey edge, left-aligned
  numbers and one label, without gradient fills, extra icons or added copy.
  Existing explanatory notes remain available to assistive technology. Missing
  data and financial coverage warnings remain visible outside the readout.
- Browser review checked Home and Reports at 320px and 1543px, Finance at 375px
  and desktop, and item actions at 375px and 1543px. Finance's metric picker
  updated both the readout and chart. Delete opened confirmation, Keep item
  cancelled it, and Escape restored focus to the card trigger. No item was deleted.
- Full automated suite: 222 passed, six emulator-dependent tests initially skipped.
  Health check, typecheck and production build passed. Existing bundle-size and
  ineffective dynamic-import warnings remain; they are not new build failures.
- The six previously skipped integration tests subsequently passed in an isolated
  local Firestore emulator, together with six related profile tests (12/12).
  This checked profile ownership protections, canonical order persistence,
  booking/reschedule concurrency, retries and rejection of unauthorized writes.
