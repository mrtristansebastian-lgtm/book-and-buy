# Build A Booking Launch Readiness Checklist

This checklist tracks the path from the rescued MVP codebase to launch-ready web and mobile builds.

## Rating Trail

- 7.2/10: Rescued MVP root restored with clean baseline checks.
- 7.4/10: Editor runtime split into focused hooks.
- 7.5/10: Editor room rendering and preview workspace split into focused components.
- 7.6/10: Public Booking lifecycle, calendar, availability, and payment controllers moved into focused hooks.
- 7.7/10: Public Booking hero/media rendering and submit payload assembly moved into focused modules.
- 7.9/10: Booking bundle moved to launch-grade chunks, Firebase isolated, and booking-core budget enforced.
- 8.1/10: Public booking and owner dashboard runtimes fully separated, owner preloads blocked on public booking, and browser QA verified public/cart plus editor preview behavior.
- 8.2/10: Booking service display simplified to Rail/Dropdown category modes, desktop booking layout centered services above calendar/time, mobile stack preserved, and smoke/browser QA passed.
- 8.3/10: Public Booking orchestration shrunk again by extracting the service display model hook and selection-section composer, with typecheck, health, smoke, and live editor-preview QA passing.
- 8.4/10: Desktop booking selection restored to the centered vertical flow, Finance/payment settings moved derived rows/metrics/export logic into focused model utilities, imported finance normalizers shared cleanly, and typecheck/build/health/smoke/scale/functions syntax gates passed.
- 8.5/10: Firebase email secret unblocked, Functions runtime config and shared utility helpers extracted from the god file, and backend lint now protects all deployed function export names before refactors can ship.
- 8.6/10: All Firebase Functions deployed successfully after adding a quota-safe launch profile with one max instance, low CPU, and 256MiB callable memory; production backend now matches the committed source.

## Revenue Path Cleanup

- [x] Preserve MVP UI and restore the official root app.
- [x] Add TypeScript checks, shared contracts, and Firebase path constants.
- [x] Split Services Studio into a focused feature module.
- [x] Centralize shared communications/thread helpers.
- [x] Split Editor runtime into focused hooks without changing UI.
- [x] Clean Editor preview workspace and room rendering into smaller modules.
- [x] Split Public Booking lifecycle, calendar, availability, and payment controller logic.
- [x] Split Public Booking hero/media rendering and booking submit payload assembly.
- [x] Split Public Booking and Editor Preview import entries, isolate Firebase, and lazy-load cart, checkout, payment, and success steps.
- [x] Add bundle reporting and a booking-core launch budget to production health checks.
- [x] Split Public Booking runtime from Owner Workspace runtime and remove owner route/public renderer coupling.
- [x] Add health gates that fail if public booking or booking core pulls owner workspace runtime.
- [x] Simplify Public Booking service display into Rail/Dropdown category modes with one shared service card system.
- [x] Update accepted desktop booking layout: centered services first, then calendar and time stacked vertically, mobile vertical stack preserved.
- [x] Finish shrinking Public Booking orchestration by extracting selection-section composition and display-model helpers.
- [x] Clean Finance/payment settings and payment-attempt surfaces.
- [ ] Clean Bookings desk actions, dialogs, and manual booking flow.
- [ ] Clean Schedule/calendar state, views, and Google sync boundaries.

## Security And Backend

- [x] Set the `RESEND_API_KEY` Firebase Secret Manager value needed for email Functions deploy.
- [x] Add a Functions export continuity check for all callable, trigger, webhook, and payment exports.
- [x] Extract shared Functions runtime options and utility helpers out of `functions/index.js`.
- [x] Deploy all Functions with quota-safe launch runtime settings.
- [ ] Split `functions/index.js` into bookings, email, notifications, reminders, operational sync, and billing modules while keeping exported function names unchanged.
- [ ] Add callable input validation helpers for bookings, availability, email, notifications, and payments.
- [ ] Add Firebase Emulator tests for staff/admin/client access, public booking writes, slot locks, payment secrets, client access records, and notification writes.
- [ ] Restrict Firebase, Google Maps, and OAuth keys by web domain, Android package/SHA, iOS bundle, and required APIs only.
- [ ] Verify App Check for hosted web and confirm native-app fallback behavior.

## Web And Mobile QA

- [ ] Add Playwright flows for auth, editor save, public booking, manual payment, hosted payment start, bookings, services, schedule, finance, and client portal.
- [ ] Add mobile viewport QA for editor, public booking, checkout, bookings, schedule, services, finance, and profile.
- [ ] Add Capacitor Android/iOS QA for native auth, uploads, safe areas, navigation, public booking, and payment redirects.
- [ ] Add accessibility checks for focus states, labels, dialogs, keyboard flow, contrast, and reduced motion.
- [ ] Keep largest JS under 900 KB and total JS under 1.3 MB until deeper code splitting lands.
- [x] Keep booking-core JS under 300 KB and report bundle sizes with `npm run bundle:report`.
- [x] Browser-QA public booking load/cart path and dashboard editor preview after runtime split.

## Current Known Risks

- [ ] `ClientPortal.jsx`, `WorkspaceInbox.jsx`, and `functions/index.js` still carry too much responsibility.
- [ ] Public booking layout is accepted, but global CSS, Firebase, and booking-step preloads are still broad; next pass should route-level CSS and smarter public funnel preload control.
- [ ] Large global, booking, and editor CSS bundles need route-level consolidation after runtime modules are stable.
- [ ] Functions production audit reports moderate transitive `uuid` advisories through latest Firebase Admin; do not force npm's downgrade unless Firebase publishes a safe update path.
- [ ] Cloud Run regional CPU quota is tight; keep the low-CPU launch profile until quota is raised and traffic testing proves the higher profile is needed.
