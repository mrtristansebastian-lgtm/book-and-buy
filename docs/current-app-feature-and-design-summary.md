# Build A Booking Current App Feature And Design Summary

Last reviewed from the codebase on 2026-07-11.

## Product Overview

Build A Booking is an owner workspace, public booking page, and client portal for service businesses. The app helps an owner set up services, publish a branded booking page, manage available time slots, review incoming booking requests, communicate with clients, track payments and finance records, maintain client profiles, and manage staff access.

The product is organized around a native-feeling dashboard shell. Owners work from a persistent workspace navigation with these primary tabs:

- Dashboard
- Bookings
- Schedule
- Support Inbox
- Editor
- Services
- Finance
- Clients
- Team
- Profile

The app also includes non-owner surfaces:

- Public Booking Page for clients to request bookings.
- Client Portal for clients to view bookings, profile details, and chats.
- Authentication and guest preview flows.
- Setup Assistant / launch onboarding for first-run business setup.

## Routing And App Structure

The primary workspace tab IDs are defined in `src/config/routeConfig.js`:

- `overview`: Dashboard overview.
- `bookings`: Booking desk.
- `business`: Schedule and availability workspace.
- `communications`: Support Inbox.
- `editor`: Public page editor.
- `services`: Service catalog studio.
- `finance`: Finance desk.
- `clients`: Client directory.
- `staff`: Team roster.
- `profile`: Owner and business profile.

Aliases allow friendlier or older route names:

- `schedule` and `calendar` route to `business`.
- `team` routes to `staff`.
- `support`, `inbox`, and `support-inbox` route to `communications`.
- `my-services` routes to `services`.
- `payments` routes to `finance`.

The editor has its own room tabs:

- `introduction`
- `colours`
- `typography`
- `style`
- `form`

Editor aliases include `identity`, `themes`, `visuals`, `features`, and `copy`.

## App Shell And Navigation Design

The owner workspace uses a desktop dock and mobile navigation system. The desktop shell is built around a white canvas, a left-side icon dock, and dense operational pages. The navigation is icon-first and uses compact labels or tooltips where needed. The visual style is closer to a native business tool than a marketing site.

Design traits:

- Predominantly white surfaces with light gray borders.
- 8px card and modal radii in most operational UI.
- Dark navy/near-black primary buttons.
- Soft gray inactive states.
- Lucide icons throughout buttons, navigation, cards, and state markers.
- Uppercase micro-labels for metadata and field labels.
- Dense but readable dashboards optimized for repeated owner use.
- Modal workflows for setup, booking records, service files, payment settings, uploads, and schedule changes.
- Mobile-specific shell and bottom navigation CSS for app-like operation on small screens.

Important shell capabilities:

- Guest preview mode for browsing without production data.
- Google sign-in and email verification flows.
- Toast notifications.
- Install prompt support.
- Client error reporting.
- Dirty-state protection for unsaved settings.
- Route aliases and return-route handling for auth flows.

## Dashboard Page

Purpose: Daily command center for owners.

The Dashboard is the high-level operational overview. It is intended to answer what needs attention today, this week, or this month without forcing the owner to open every feature tab.

Current capabilities:

- Period switching for Today, Week, and Month.
- Performance and activity overview.
- Next Actions guidance.
- Links into Bookings, Schedule, and Editor.
- Setup Assistant entry point for owners/admins.
- Guest/example states that teach the workflow without counting as real data.

Design:

- Dashboard-specific CSS has multiple layers for overview tiles, command deck, period tabs, pager controls, mobile command deck, and refined workspace surfaces.
- The page uses large but operational summary cards, not a marketing hero.
- Visual emphasis is on scanning and action: metrics, activity, and next-step buttons.

Primary user workflow:

1. Open Dashboard.
2. Review pending work and booking health.
3. Use quick actions to jump into Bookings, Schedule, or Editor.
4. Use period filters to understand short-term trends.

## Bookings Page

Purpose: Convert booking requests into confirmed, waitlisted, declined, rescheduled, or followed-up records.

The Bookings page is the operational booking desk. It receives public booking requests, supports manual bookings, and gives owners/staff a queue for booking decisions.

Current capabilities:

- Booking desk rows with status, client, service, date/time, payment context, and staff context.
- Filters for booking period, booking state, payment state, search, sort, and custom ranges.
- Manual booking sheet for creating bookings directly from the owner workspace.
- Date range dialog for custom period filtering.
- Booking record row actions.
- Booking dialogs for lifecycle actions.
- Booking payment model utilities and payment status handling.
- Booking lifecycle actions including approve/confirm, waitlist, decline, reschedule, running-late updates, review requests, and opening support threads.
- Client details from bookings sync into the Clients area.
- Example rows for empty states.

Design:

- Booking desk styling is split into `booking-desk-polish.css`, shell controls, select filters, row modal styling, manual booking sheet styling, and mobile booking desk styling.
- The page is intended as a high-density queue.
- Controls use segmented filters, compact cards/rows, and modal/sheet flows.

Primary user workflow:

1. Filter to requests or pending work.
2. Open a booking row.
3. Review service, client details, requested time, payment context, and notes.
4. Confirm, waitlist, decline, reschedule, assign staff from the business side, or open Support Inbox.
5. Follow up with running-late or review messages when appropriate.

## Schedule Page

Purpose: Manage open days, available time slots, staff calendars, and reusable schedule rules.

The Schedule page is the availability workspace. In code it maps to the `business` tab. It manages the timeline for the selected day and schedule settings for applying defaults and rules.

Current capabilities:

- Google Calendar connection status panel.
- Staff calendar switcher for Business and staff profiles.
- Day timeline with open booking windows.
- Open/closed state for selected day.
- Add slot and edit slot actions.
- Previous/next day navigation.
- Schedule settings wizard.
- Slot editor modal for single times or time periods.
- Default slot setup.
- Apply scope selection for selected day, week, month, always, or custom period.
- Booking rules setup.
- Saved schedule templates.
- Review and save step.

Current schedule settings rules:

- Booking windows: minimum notice, book ahead limit, cancellation window, and held-by status.
- Client controls: rescheduling allowed and waitlist when full.
- Staff assignment settings were removed from Rules because staff assignment is handled by the business operationally.
- Repeat bookings rule was removed because it is not needed in the current workflow.

Design:

- White modal wizard with left-side step list.
- Compact rules layout with booking windows and client controls in separate cards.
- Dense option rows for apply period.
- Timeline rows for each available slot.
- Small circular or square icon buttons for edit/add/navigation actions.
- Reduced motion/paint risk in the schedule settings backdrop by avoiding blur on that modal.

Primary user workflow:

1. Choose the staff/business calendar.
2. Select a day.
3. Open or close the day.
4. Add, edit, or delete bookable times.
5. Open Schedule Settings to update default slots, apply period, rules, templates, and review.

## Support Inbox Page

Purpose: Manage client conversations tied to bookings.

The Support Inbox is the in-house chat and operational support surface. It helps the business respond to client questions, approve linked bookings, offer reschedules, and keep conversation context attached to booking records.

Current capabilities:

- Thread list with filters: all, unread, requests, confirmed, waitlist, reschedules.
- Active thread view.
- Message composer.
- Client profile context for active thread.
- Linked booking context.
- Quick booking sheet from chat.
- Support actions: open client file, add booking, open bookings, offer reschedule, send running-late update, confirm linked booking.
- Accept or decline reschedule proposals.
- Example thread behavior for preview states.

Design:

- Email/chat hybrid interface.
- Filter tabs with counts.
- Compact conversation list and message pane.
- Action buttons with icon-first support tools.
- Mobile thread divider and mobile support surface styling.

Primary user workflow:

1. Open unread or request threads.
2. Check the linked booking/client context.
3. Reply or use a support action.
4. Move deeper into Bookings when the booking itself needs work.

## Editor Page

Purpose: Build and publish the public booking page.

The Editor is the public page engine. It controls identity, page copy, brand media, colors, typography, style direction, client form behavior, preview mode, and publishing.

Current editor rooms:

- Introduction: logo, banner, business name, tagline, welcome copy, booking link, first impression controls.
- Colours: base, action, calendar, time, FAQ, and social/footer color categories.
- Typography: font personality and text styling.
- Style: visual direction and journey treatment, including Native Precision and Command Flow concepts.
- Form: client fields, email opt-in, FAQ, socials, waitlist, first available, and other client-facing options.

Current capabilities:

- PC and mobile preview modes.
- Preview step switching for booking, cart, checkout, success, and related public flow screens.
- Device frame preview.
- Room navigation with draggable/positionable controls.
- Responsive editor runtime.
- Preview scaling.
- Brand signal detection.
- Font loading for designer preview.
- Upload/crop flows for visual assets.
- Saved looks/templates.
- Publish flow.
- Mobile-specific lighter editor handling for stability.

Design:

- Editor has the richest visual system in the app.
- Uses room-based controls and a live public-page preview.
- Extensive CSS for cinema shell, command center, mobile preview shell, fullscreen portrait runtime, live rooms, color boards, and style direction suites.
- The visual language is more creative than the operational pages, but still structured.

Primary user workflow:

1. Set introduction copy and media.
2. Tune colors.
3. Choose typography.
4. Refine style direction.
5. Configure client form and feature toggles.
6. Preview on PC and mobile.
7. Publish.

## Services Page

Purpose: Manage the services clients can book.

The Services page uses the Services Studio and service model utilities. It lets the business create, edit, filter, and save service definitions that power the public booking page and booking flow.

Current capabilities:

- Service list/desk.
- Service file modal.
- Service command controls.
- Industry selection.
- Service normalization before saving.
- Service duration validation.
- Duration mode support, including schedule-derived durations.
- Service removal.
- Settings patch save flow.

Design:

- Desk-like services shell.
- Service file modal for detailed editing.
- Command controls for filtering and creation.
- White operational surfaces matching the rest of the owner workspace.

Primary user workflow:

1. Choose an industry if helpful.
2. Add or select a service.
3. Configure name, category, duration behavior, and booking-related details.
4. Save services.
5. Public booking page uses the normalized list.

## Finance Page

Purpose: Track booking-related revenue, imported finance records, payment attempts, and gateway settings.

The Finance page combines manual booking rows, payment attempts, and imported finance records into a finance desk.

Current capabilities:

- Finance metrics calculation.
- Period-based records.
- Currency inference and display currency.
- Finance stat items.
- Visible finance desk rows.
- CSV export rows/text.
- CSV migration/import panel.
- Gateway settings modal.
- Finance timeline chart.
- Payment gateway configuration.
- Payment attempts tracking.
- Imported finance record normalization.

Design:

- Finance desk shell and finance polish CSS.
- Chart module styling.
- Payment/gateway modal surfaces.
- Toggle and migration-specific styling.
- Mobile finance polish.

Primary user workflow:

1. Review finance metrics and rows.
2. Filter/sort period records.
3. Import finance CSV data if migrating.
4. Configure payment gateways.
5. Export or inspect financial history.

## Clients Page

Purpose: Maintain client profiles created from bookings or manually added by the business.

The Clients page turns booking data into a lightweight CRM.

Current capabilities:

- Client directory.
- Client profile panel.
- Add client panel.
- Client details form.
- Client profile header.
- Notes and labels.
- Booking history.
- Client key utilities.
- Client directory filtering.
- Client persistence actions.
- CSV migration actions.
- Finance import actions tied to client migration/import.

Design:

- Directory plus profile detail layout.
- Client schedule shell styling.
- Client directory polish CSS.
- Focus on scannable records, labels, notes, and history.

Primary user workflow:

1. Let bookings create client records automatically or add a client manually.
2. Open a client profile.
3. Review contact details and booking history.
4. Add labels and private notes.
5. Use client context in Bookings and Support Inbox.

## Team Page

Purpose: Manage staff profiles, access, roles, and assignment context.

The Team page maps to the `staff` tab. It handles staff records and workspace roster management.

Current capabilities:

- Staff roster.
- Staff file panel.
- Staff add panel.
- Staff avatar support.
- Staff profile utilities.
- Staff actions hook.
- Roles/access concepts: owner, admin, staff.
- Active staff profile support.
- Staff records used by Bookings, Schedule, and Support context.

Design:

- Team roster CSS.
- Roster cards/list with profile panel.
- Staff avatars and role/access controls.
- Operational, compact, and consistent with Clients/Profile.

Primary user workflow:

1. Add the owner/admin/staff records.
2. Configure role/access level.
3. Save roster changes.
4. Use staff context for scheduling, assignment, and support operations.

## Profile Page

Purpose: Manage owner identity, business identity, account controls, media, social links, billing placeholders, notifications, and activity.

Current sections/components:

- Personal profile.
- Business profile.
- Business identity.
- Business media.
- Business social links.
- Business FAQ.
- Notifications.
- Migration.
- Billing.
- Activity.
- Account controls.
- Account deletion dialog.
- Mobile profile hub.
- Profile action strip.

Current capabilities:

- Save profile/business changes.
- Upload or remove brand media.
- Configure public-facing business information.
- Manage FAQ/social content.
- Keep me logged in.
- Sign out.
- Billing/upgrade placeholders.
- Referral/affiliate link copy.
- Activity view.
- Open style room from profile.

Design:

- Profile hub CSS with command layout, action/status areas, command cards, and activity center.
- Page is section-based with a mobile hub variant.
- Business identity and public booking media connect to Editor.

Primary user workflow:

1. Set account identity.
2. Set business identity.
3. Upload logo/banner/venue media.
4. Add socials and FAQs.
5. Save profile.
6. Manage account/session/billing controls as needed.

## Public Booking Page

Purpose: Client-facing booking request flow.

The public booking page is powered by the public booking app and booking flow components. It uses editor settings, services, availability, branding, FAQ/socials, client form settings, and checkout/payment configuration.

Current capabilities:

- Public booking page launcher.
- Public booking workspace hook.
- Booking flow runtime.
- Hero/header media.
- Venue gallery.
- Service selection.
- Staff/service section support.
- Date selection.
- Time selection.
- Client details form.
- Cart/checkout steps.
- Payment step.
- Checkout summary.
- Success state.
- FAQ section.
- Social links.
- Client portal prompt.
- Waitlist/first-available behavior where enabled.
- Booking submission utilities.
- Checkout/payment utilities.

Design:

- Booking runtime CSS and many public booking variants.
- Service layouts include tiles, signature, luxury, gallery, compact, category rail, cards menu, and dropdown.
- Mobile preview styles mirror the editor preview.
- Client-facing UI is more branded and expressive than owner operations, but still structured around the booking funnel.

Primary client workflow:

1. View branded business page.
2. Choose service.
3. Choose date.
4. Choose time.
5. Enter client details.
6. Review checkout/cart when needed.
7. Submit booking request or continue to payment.
8. See success state and portal prompt.

## Client Portal

Purpose: Client-side account area for booking updates and chats.

Current capabilities:

- Client portal gate.
- Client guest preview.
- Client portal component.
- Client bookings list.
- Client chats/threads.
- Client notifications.
- Client profile area.
- Reschedule proposal accept/decline from client side.
- Sign out controls.
- Empty/example states.

Design:

- Portal is simpler than the owner workspace.
- Organized around Chats, Bookings, and Profile.
- Designed to help clients track requests and continue conversations without entering the owner dashboard.

Primary client workflow:

1. Client signs in with the booking email.
2. Portal matches booking/thread context.
3. Client reviews booking status.
4. Client sends/receives messages.
5. Client accepts/declines reschedule proposals when relevant.

## Authentication And Account Entry

Purpose: Handle owner/client sign-in, guest previews, and auth callbacks.

Current capabilities:

- App login screen.
- Auth dialog with owner/client persona.
- Google auth utilities.
- Auth error handling.
- Auth session boot/actions.
- Email verification gate.
- Auth action page for redirects.
- Guest owner dashboard preview.
- Client guest portal preview.

Design:

- Native auth panel and app login screen styles.
- Persona switching between owner and client.
- Preview-first pathways for browsing.

## Notifications

Purpose: Surface booking, chat, and workspace updates.

Current capabilities:

- Workspace notification hook.
- Owner notifications.
- Workspace client threads.
- Fresh notification detection.
- Notification center component.
- Mobile notification helpers.

Design:

- Compact notification center.
- Mobile touch helper styles.
- Intended to alert without overwhelming the main workspace.

## Media And Image Crop

Purpose: Upload, crop, and manage business/brand/client images.

Current capabilities:

- Media crop upload hook.
- Image crop modal.
- Profile photo update/remove flows.
- Business media upload support.
- Editor/profile media reuse.

Design:

- Dedicated image crop CSS.
- Modal-based crop UI.
- Media positions and previews are coordinated with profile/editor surfaces.

## Google Calendar Integration

Purpose: Connect booking schedule activity with Google Calendar.

Current capabilities:

- Google Calendar auth state in Schedule top area.
- Connected email, connected time, last synced time, last sync count, and syncing state.
- Google Calendar actions hook.
- Calendar settings stored on workspace settings.

Design:

- Compact Google Calendar status panel.
- Connect, Sync, and Save actions shown near the schedule workspace.

## Setup Assistant And Launch Onboarding

Purpose: Help new business owners publish a usable booking page without hunting through the app.

Current capabilities:

- First-run launch path for owners/admins with Business Type, Details, Services, Schedule, and Publish steps.
- Business Type starts with what the business sells, then uses a compact industry picker with colorful emoji icons.
- Details collects business name, owner/contact basics, slogan, description, business photos, and location through the Google Places address interface.
- Services uses the app's service-style fields for name, category, price mode, amount, duration/custom duration, no-fixed-duration, service location, description, and service photos.
- Schedule embeds the normal schedule setup flow while hiding duplicate save/apply actions during onboarding.
- Publish summarizes the setup in clean review cards and recommends payments, notifications, Google Calendar, team, and migration after launch.
- Owner Manual code was removed from the app bundle; future help/manual content belongs on the website, not inside the app.

Design:

- Calm full-screen setup flow with a merged top bar and horizontal launch timeline.
- Standard site gradient is used as an accent/border treatment, not heavy filled panels.
- Setup pages are centered, one focused section at a time, with consistent headers and bottom navigation.
- Service photo uploads use a simple plus tile and gallery.
- First-come-first-served public booking mode uses a custom arrival-time picker instead of the browser's native time dropdown.

## Design System Summary

Current design language:

- Operational owner workspace: white, quiet, compact, high-contrast controls.
- Public booking page: more branded and flexible, driven by editor settings.
- Editor: creative control-room style with live previews and room-based tooling.
- Client portal: simplified client-facing version of bookings/chats/profile.

Core visual conventions:

- 8px radii on most cards, modals, selects, and control panels.
- Dark near-black primary actions.
- Light gray borders and backgrounds for secondary surfaces.
- Uppercase metadata labels.
- Lucide icons in navigation and action controls.
- Dense rows and cards for operational pages.
- Modals/sheets for detailed editing.
- Mobile CSS layers for dock, bottom navigation, compact surfaces, and touch-friendly behavior.

Important UX patterns:

- Example data teaches empty workflows without counting in real stats.
- Owner actions generally preserve context and open deeper tools only when necessary.
- Public-facing booking flow remains linear and client-friendly.
- Editor preview connects owner settings directly to the public client experience.
- Profile and Editor share brand identity/media responsibilities.
- Bookings, Support Inbox, Clients, Finance, and Schedule are connected through booking records.

## Data And Workflow Connections

Important cross-feature relationships:

- Services define what clients can book and what bookings reference.
- Schedule defines when clients can request bookings.
- Editor defines the public booking page experience.
- Public Booking Page creates booking requests.
- Bookings manages the operational lifecycle of those requests.
- Clients stores people and history created from bookings.
- Support Inbox stores conversations connected to clients/bookings.
- Finance aggregates manual booking rows, payment attempts, and imported finance records.
- Team/staff records support operational assignment and accountability.
- Profile provides business identity, media, socials, FAQ, and account controls.

## Current Notable Implementation Details

- The app is a Vite/React application.
- Dashboard route rendering is centralized through `DashboardMainRoutes.jsx`.
- Workspace routing is hash-based and supports aliases.
- Owner workspace runtime composes auth, workspace data, routing, editor runtime, notification runtime, booking runtime, client portal state, and profile actions.
- Public booking runtime is separate from owner workspace runtime.
- Many major pages use feature folders with `pages`, `components`, `hooks`, `utils`, `actions`, and `config` subdivisions.
- Styling is split by feature and by responsive/mobile/runtime layers.

## Current Practical Product Scope

The app currently covers:

- Owner onboarding and guest preview.
- Business profile and identity setup.
- Service catalog setup.
- Public booking page design and publishing.
- Availability and booking rules.
- Booking request management.
- Manual bookings.
- Client messaging.
- Client records.
- Finance/payment tracking and migration.
- Staff roster and role context.
- Client-side portal.
- Owner support/manual content.

This makes Build A Booking a broad booking operations platform rather than only a public booking form.
