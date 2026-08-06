# Book and Buy - full app handoff map for another AI agent

Last updated: 2026-08-06  
Workspace: `C:\Users\LenovoUser\Desktop\BookifybyRoomo`

This document describes the current product direction, app screens, visible copy, visual design language, backend/functions, data model, and security posture so another AI agent can continue work without guessing.

## 1. Product identity and current direction

**North star:** [book-and-buy-vision.md](./book-and-buy-vision.md) (pillars, surfaces, design rules, do-not-rebuild).

Use the product name `Book and Buy` in user-facing descriptions. Some code, package names, old copy, and Firebase defaults still say `Build A Booking`; treat those as legacy implementation names unless the user asks to rename code globally.

Book and Buy is a hybrid business platform:

- A polished booking/request system for service businesses.
- Separate Services and Products catalogue areas (not one mixed Business Room nav item).
- Public surfaces: unified Website at `/w/:slug` with pages Home / Book / Shop / Social. Legacy `/book/:slug` and `/shop/:slug` deep-link into the same shell.
- Owner **Website** and **Social** studios live under the **Your pages** nav group and publish `settings.website` + `settings.socialPosts`.

See also: public surface shell in `src/features/public-surface/`, Website app in `src/features/website/`, mission control Overview in `DashboardOverviewPage.jsx`.

## 2. Global visual language

The app has a consistent native look:

- Clean white surfaces on a soft app canvas.
- Dark navy/black body text.
- Sharp, modern typography with strong headings and calmer supporting copy.
- Quiet white controls with thin borders.
- The native color-changing fill gradient is used sparingly for active tabs, selected states, primary accents, and high-value actions.
- Avoid random grey info posters, heavy grey pills, unnecessary gradient borders, and oversized empty containers.
- The user prefers flush, integrated layouts with minimal wasted margins.

Common UI patterns:

- Period-switcher style segmented controls are preferred for toggles.
- Icon-only or compact action buttons are preferred when the surrounding label is obvious.
- Cards should size to their content and avoid huge dead whitespace.
- Inputs should match the support chat composer style: one clean outer shell, no nested inner border, text not clipped, buttons vertically centered.

## 3. High-level route map

Primary route configuration lives in:

- `src/config/routeConfig.js`
- `src/features/dashboard/components/DashboardMainRoutes.jsx`
- `src/features/dashboard/hooks/useDashboardNavigationModel.js`

Visible dashboard navigation currently maps like this:

| User-facing page | Internal route id | Aliases / notes | Main file |
|---|---:|---|---|
| Dashboard | `overview` | Mission control | `src/features/dashboard/components/DashboardOverviewPage.jsx` |
| Services | `services` | Catalog \| Booking Requests; aliases `bookings` / `booking-requests` open Requests mode | `src/features/dashboard/pages/ServicesPage.jsx` |
| Schedule | `staff` | Aliases `schedule`, `calendar`, `business`, `team` | `src/features/staff/pages/StaffPage.jsx` |
| Products | `products` | Catalog \| Orders; aliases `orders` / `product-orders` / `shop` open Orders or Products | `src/features/products/pages/ProductsPage.jsx` |
| Website | `website` | Guided site builder; aliases `site` / `pages` | `src/features/website/pages/WebsiteStudioPage.jsx` |
| Social | `social` | Social studio; aliases `social-profile` / `socialProfile` | `src/features/social-profile/pages/SocialStudioPage.jsx` |
| Support Inbox | `communications` | `support`, `inbox`, `support-inbox` | `src/features/dashboard/pages/SupportInboxPage.jsx` |
| Finance | `finance` | Stripe, Paystack (API keys), Manual EFT, Cash | `src/features/dashboard/pages/FinancePage.jsx` |
| Clients | `clients` | Client directory | `src/features/clients/pages/ClientsPage.jsx` |
| Profile | `profile` | Account, public pages, team, notifications | `src/features/profile/pages/ProfilePage.jsx` |

Nav groups (`workspaceTabGroups`): `home` | `book` | `buy` | `presence` (Website + Social) | `run`.

Mobile primary dock: Overview, Services, Products, Schedule.

Removed from nav (do not rebuild unless asked): Cinema Editor, standalone Bookings tab.

Public routes: `/w/:slug` (+ `/book` `/shop` `/social` pages) via `PublicWebsiteApp`. Legacy `/book/:slug` and `/shop/:slug` map into the same shell.

## 4. Entry, auth, and onboarding screens

### 4.1 Landing / auth screen

File: `src/features/auth/components/AppLoginScreen.jsx`

Purpose:

- Main entry screen for owners, guests, and clients.
- Lets users sign in, create account, open client portal, or view demo.

Current visible copy:

- Product mark still says `Build A Booking` in code.
- Main heading: `Welcome to Build A Booking.`
- Body: `Sign in, create your workspace, or take the demo for a spin.`
- Buttons:
  - `Sign In` or `Open Workspace`
  - `Create Account`
  - `View Demo As Guest`
  - `Client Portal`
- Legal buttons:
  - `Privacy`
  - `Terms`
  - `Support`

Visual description:

- Brand-led login/landing screen.
- Simple button stack for owner and client entry.
- Legal links sit in the footer.

Important note:

- If continuing the Book and Buy rename, this is one of the first visible legacy-copy areas to update.

### 4.2 Auth action page

File: `src/features/auth/components/AuthActionPage.jsx`

Purpose:

- Handles email verification, password reset, and Firebase auth action links.

Visual description:

- Utility screen, not a product-marketing screen.
- Should stay minimal, trustworthy, and clear.

### 4.3 Email verification gate

File: `src/features/auth/components/EmailVerificationGate.jsx`

Purpose:

- Blocks password-account users until email is verified.
- This matches Firestore security rules, which also require verified password accounts for workspace access.

### 4.4 Business onboarding

File: `src/features/onboarding/components/BusinessOnboardingPage.jsx`

Purpose:

- First-run workspace setup.
- Captures business identity and setup basics.

Visual description:

- Wizard/onboarding flow.
- The user has previously wanted the supported business categories to be broad but legally safe.

## 5. Dashboard pages and screen descriptions

### 5.1 Dashboard / overview

File: `src/features/dashboard/components/DashboardOverviewPage.jsx`

Purpose:

- Placeholder mission-control dashboard.
- Not yet a full analytics dashboard.

Visible copy:

- Eyebrow: `Mission control`
- Greeting: `Good morning/afternoon/evening, {name}`
- Body: `The live dashboard is being shaped into a calmer, smarter workspace for your business.`
- Coming soon card:
  - `Live dashboard`
  - `Dashboard coming soon.`
  - `We're planning the best, most functional dashboard for your booking workflow.`
  - `Your core tools stay available...`

Visual description:

- White dashboard card layout.
- Calm empty-state feel.
- Should eventually become a real snapshot dashboard for requests, messages, revenue, clients, catalogue, and profile health.

### 5.2 Bookings

Files:

- `src/features/bookings/pages/BookingsPage.jsx`
- `src/features/bookings/components/BookingDesk.jsx`

Purpose:

- Main booking/request command center.
- Business can view, filter, search, approve, mark paid, waitlist, chat, and manage booking records.

Key visible copy:

- Header title:
  - `Latest Upcoming` when the upcoming filter is active.
  - `{Filter} Bookings` for other views.
- Supporting count: `{shown} shown / {period label}.`
- Primary action: `Booking`
- Search placeholder: `Search client, phone, email, note`
- Filter chips:
  - `Upcoming`
  - `Review`
  - `Confirmed`
  - `Waitlist`
  - `History`
  - `All`
- Empty-state copy:
  - `No matching bookings`
  - `Ready for your first booking`
  - `Try a different client name, phone, email, or note. Your filters stay ready while you search.`
  - `Client requests, confirmations, waitlist entries, payments, and booking history will all land here once the page is live.`
- Empty-state steps:
  - `Share booking page`
  - `Review client request`
  - `Confirm or move slot`
- Empty-state button:
  - `Add booking instead` or `Create test booking`

Visual description:

- White workspace with a booking desk/table-card structure.
- Uses period controls, search, payment filters, sort controls, and status chips.
- Rows/cards include client avatar/photo, booking summary, status labels, and compact action buttons.

Behavior:

- Supports manual booking sheet.
- Supports custom range dialog.
- Chat action opens the support inbox conversation for that booking.
- Updating bookings should preserve old data and avoid backend/public API breaking changes.

### 5.3 Schedule / Hours

Files:

- `src/features/dashboard/pages/SchedulePage.jsx`
- `src/features/schedule/components/ScheduleCalendarWorkspace.jsx`
- `src/features/schedule/components/ScheduleOperationsBoard.jsx`
- `src/features/schedule/components/ScheduleSettingsModal.jsx`
- `src/features/schedule/hooks/useScheduleWorkspace.js`
- `src/features/schedule/utils/scheduleOperationsModel.js`

Purpose:

- Current operational schedule board.
- User has recently been simplifying it toward business hours and request availability rather than full enterprise calendar management.

Current visual/functional direction:

- Day/week/month/list switching.
- Staff/business switcher rail.
- Status legend with totals.
- Appointment cards in a clean grid/timeline.
- Month cards use compact status-line summaries rather than detailed booking cards.
- Schedule settings modal handles availability mode.

Schedule settings wizard copy:

- Step: `Slots`
  - `Set up available time slots`
  - `Choose the booking method and times clients can book from this schedule.`
- Step: `Time period`
  - `Choose the day or date range this schedule should apply to.`
- Step: `Rules`
  - `Control notice, cancellations, waitlists, and availability holds.`
- Step: `Templates`
  - `Save reusable schedule setups...`
- Step: `Review`
  - `Confirm the setup before saving schedule settings.`

Availability modes:

- `Arrival times`
  - Live arrival times are generated from open gaps and confirmed bookings.
- `Slots`
  - Slot-based booking rules where clients choose exact times the business sets.

Rules and settings include:

- Business open time.
- Business close time.
- Arrival spacing.
- Auto-calculate spots open.
- Pending/confirmed hold behavior.
- Minimum booking notice.
- Max advance booking.
- Cancellation and rescheduling rules.

Important product note:

- The user is reconsidering heavy schedule management. If another agent continues this area, treat Schedule as an operational backend/support tool and keep client-facing booking simple: choose preferred date/time, business approves/reschedules/waitlists.

### 5.4 Support Inbox

Files:

- `src/features/dashboard/pages/SupportInboxPage.jsx`
- `src/features/support-inbox/`
- styles under `src/styles/features/support/`

Purpose:

- Unified messaging surface between business and clients.
- Also supports booking-related cards such as reschedule requests.

Visible fallback copy:

- Loading: `Loading client inbox`
- Error boundary label: `Support Inbox`

Visual description:

- Workspace messaging UI.
- Thread list on one side and conversation on the other.
- Chat composer should be compact and elegant:
  - One outer rounded field.
  - No nested border.
  - Voice/send buttons centered to the text row.
  - Text expands one line at a time.

Behavior:

- Chat can include booking context.
- Clients can be messaged from bookings.
- Businesses can communicate delays/reschedules via chat.

### 5.5 Services / Business Room

Files:

- `src/features/dashboard/pages/ServicesPage.jsx`
- `src/components/ServicesStudio.jsx`
- `src/features/services-studio/components/ServiceDeskList.jsx`
- `src/features/services-studio/components/ServiceFileModal.jsx`

Purpose:

- Currently called Services in navigation, but the user’s preferred product concept is `Business Room`.
- It should become the place to fully set up products and services.
- It has recently been simplified to focus on:
  - Appointments.
  - Book a spot / class/session services.
  - Products in future.
- Event and trade-service support were intentionally removed from the product direction because they were too broad.

Current service file wizard steps:

1. `Type`
   - `Booking type`
   - `Choose how clients reserve this service.`
2. `Details`
   - `Service details`
   - `Name, description, category, and visibility.`
3. `Pricing`
   - `Pricing`
   - `Choose how this service is charged.`
4. `Team`
   - `Assign staff members`
   - `Choose which team members can run or manage this service.`
5. `Photos`
   - `Service photos`
   - `Add the images clients see on the booking page service card.`
6. `Location`
   - `Location`
   - `Choose where the service happens and add travel or online details.`
7. `Rules`
   - `Booking rules`
   - `Control notice, payment, approval, cancellation, and repeat bookings.`
8. `Preview`
   - `Booking page card`
   - `See the exact service card style clients will see on the booking page.`

Type-specific detail copy:

- Appointment:
  - `Appointment details`
  - `Name the service clearly, set the duration, and describe what the one-to-one booking includes.`
- Book a spot / class/session:
  - `Spot booking details`
  - `Name the class, workshop, or session, then set duration and capacity.`

Pricing behavior:

- Appointment and spots currently support only:
  - Fixed price.
  - Free.
  - Quote.
- Tax fields should not be visible.
- Currency should not be an editable field; it should come from business settings.

Categories:

- Appointment categories include beauty, barbering, nails, wellness, fitness coaching, health consults, therapy, coaching, consulting, legal/finance, creative studios, tutoring, restaurant bookings, venue viewing, cleaning, automotive, pets, and other appointment types.
- Spot categories include workshop, class, course, training session, group session, masterclass, seminar, bootcamp, cohort programme, fitness/yoga/pilates/dance classes, kids class, tutoring group, cooking/baking/art/music/language classes, wellness sessions, support groups, tasting, studio session, drop-in session, and spot booking.
- Category dropdowns should be custom in-house menus, not browser/system selects.
- Saved custom categories should appear in the menu afterward.

Visual direction:

- Keep forms clean and compact.
- Avoid repeated grey explanatory cards.
- Details should carry duration and capacity for spot services.
- Photos section should be polished but not oversized.

### 5.6 Finance

Files:

- `src/features/dashboard/pages/FinancePage.jsx`
- `src/features/finance/`
- `functions/payments/`

Purpose:

- Payment settings and manual payment tracking.
- Supports paid booking state and gateway settings.

Visual description:

- White dashboard settings page.
- Finance/payment modules are lazy loaded.

Important payment note:

- The product direction says no in-app payment processing for the social/catalogue pivot.
- Backend still contains payment-related settings and Stripe dependencies.
- Root `createCheckoutSession` and `createBillingPortalSession` currently throw unavailable if Stripe is not configured.
- Manual/off-platform payment language is safest unless payment scope is re-approved.

### 5.7 Clients

Files:

- `src/features/clients/pages/ClientsPage.jsx`
- `src/features/clients/`

Purpose:

- Client directory and client file management.

Visible behavior/copy:

- Saving shows `Client book saved`.
- Mobile view switches between directory, add panel, and profile panel.

Visual description:

- Directory list plus active client profile/details panel.
- White workspace layout.

### 5.8 Team

Files:

- `src/features/staff/pages/StaffPage.jsx`
- `src/features/staff/`

Purpose:

- Staff roster, staff access, assigned staff, and team details.

Visible behavior/copy:

- Saving shows `Team setup saved`.
- Staff title save shows `Staff title saved`.
- Staff access labels:
  - `Google account detected`
  - `Access disabled`
  - `Access ready`
- Role labels:
  - `Owner`
  - `Admin`
  - `Staff`

Visual description:

- Roster list, add panel, staff file panel.
- Designed as a dashboard management surface.

### 5.9 Profile settings

Files:

- `src/features/profile/pages/ProfilePage.jsx`
- `src/features/profile/`

Purpose:

- Workspace and account settings.

Visible copy:

- Eyebrow: `Workspace settings`
- Heading: `Profile settings`
- Fallback body: `Manage account, business, notifications, billing, and launch setup in one clean place.`

Sections:

- Personal.
- Account controls.
- Activity.
- Notifications.
- Billing.
- Business.

Business settings cover:

- Business name and details.
- Logo.
- Banner.
- Venue photos.
- Address/location.
- Social links.
- Referral/style room settings.

### 5.10 Editor

Files:

- `src/features/editor/pages/EditorPage.jsx`
- `src/features/editor/components/`
- `src/features/editor/editorRooms.js`

Purpose:

- Original page editor / booking page editor.
- It should remain available now that the social profile is being separated.

Editor rooms:

- Introduction.
- Colours.
- Typography.
- Style.
- Form.

Visual description:

- Full workspace editor.
- Left settings/control panel.
- Live preview workspace.
- Can collapse controls.
- Canvas uses soft grey app background.

Product note:

- Earlier pivot tried to turn Editor into social profile editing. Current direction is to restore/preserve original editor and keep social profile as its own dashboard page.

### 5.11 Social Profile

Files:

- `src/features/social-profile/pages/SocialProfilePage.jsx`
- `src/styles/features/social-profile/`

Purpose:

- New standalone social business profile page inside dashboard.
- Inspired by Instagram profile layout, with tabs for posts, videos, text threads, and business.

Current visual design:

- Flush social profile canvas.
- Large banner/cover image.
- Profile/logo placed in profile section, not floating awkwardly over the banner.
- Business name, category, bio, location, open hours, counts.
- Action buttons:
  - `Request booking`
  - `Email`
  - `Message`
- Tabs:
  - `Posts`
  - `Videos`
  - `Text`
  - `Business`
- Active tab uses the app’s native color-changing fill gradient.

Current example business:

- `Flame & Flour`
- Category: `Classes`
- Bio: `Choose a hands-on cooking or baking class and join us around the kitchen table.`
- Location: `Woodstock, Cape Town, South Africa`
- Hours: `Open hours 09:00 - 17:00`
- Logo fallback: `/example/flour-and-flame/flame-and-flour-logo-clean.webp`
- Cover fallback: `/example/flour-and-flame/hero.webp`

Posts tab:

- Grid of image posts using venue/gallery photos.
- Fallback post labels include:
  - `Behind the scenes`
  - `Client favourite`
  - `Fresh update`
  - `Work in progress`
  - `Today in studio`
  - `New drop`

Videos tab:

- Grid-style video section.
- No actual video upload needs to be implemented yet.

Text tab:

- Should feel like Book and Buy’s own Twitter/X-style threads.
- Composer should match support chat input:
  - Clean single border shell.
  - No nested white cut-off.
  - Voice and post/send buttons.
  - No file attachment.
- Example threads:
  - `Pinned thread · Now`
  - `Business update · Today`
  - `Quick note · This week`
- Thread actions visually show reply/repost/like/share-style interactions.

Business tab:

- Inner switcher between Services and Products.
- Services list is powered by normalized services.
- Products are future/empty unless product data is added.

Known issue history:

- The user strongly disliked bad spacing, overlapping logo/banner placement, black tab underlines, weird grey pills, gradient border misuse, and clipped text input corners. Preserve these fixes when editing.

## 6. Public booking / public profile flow

Files:

- `src/features/public-booking/pages/PublicBookingPage.jsx`
- `src/features/public-booking/components/PublicBookingFlow.jsx`
- `src/features/booking-flow/`
- `src/components/BookingFlow.jsx`
- `src/config/workspaceDefaults.js`
- `src/config/workspaceExample.js`

Purpose:

- Public client-facing booking page still exists.
- It should eventually coexist with social profile, not be replaced unless the user explicitly says so.

Loading/unavailable copy:

- Loader label: `Loading booking page`
- Loading body: `Preparing the public booking experience.`
- Error eyebrow: `Booking Page`
- Error title: `Page unavailable`
- Fallback error: `This booking page is not available yet.`
- Buttons:
  - `Try Again`
  - `Build A Booking` legacy home label

Default public booking copy:

- Business fallback: `Your Business`
- Welcome: `Reserve your session.`
- Tagline: `Online bookings`
- Service section:
  - `Choose your service`
  - `Select the option that works best for you.`
- Venue section:
  - `Inside the space`
  - `See the place before you book.`
- Social section:
  - `Stay connected`
  - `Find us online and keep in touch.`
- Date section:
  - `Pick your booking date`
  - `Choose an available day for your booking.`
- Time section:
  - `What time works?`
  - `Choose the time that suits you best.`
- FAQ:
  - `Questions before booking`
  - `Helpful answers before you confirm.`
- CTAs:
  - `Add booking to cart`
  - `Edit selection`
  - `Complete your details`
  - `Request booking`
  - `Join waitlist`
  - `Sending request`
  - `Book Now`
  - `Confirm Booking`
- Cart:
  - `Review booking.`
  - `Check your service, date, and time before checkout...`
- Checkout:
  - `Fill in your details.`
  - `Request the booking first. If payment is needed...`
- Success:
  - `Request sent.`
  - `We have your request and will review the booking details shortly.`
  - `Reference`
  - `Keep this for updates with the business.`
  - `Business review`
  - `We will confirm the slot, follow up if needed, or help adjust the booking.`

Default available times:

- `09:00`
- `10:30`
- `12:00`
- `14:30`
- `16:00`
- `17:30`

Example workspace public profile/booking data:

- File: `src/config/workspaceExample.js`
- Business: `Flame & Flour`
- Category/industry: classes
- Email: `hello@flourandflame.example`
- Phone: `+27 21 555 0100`
- Tagline: `Cook boldly. Bake beautifully.`
- Welcome: `Choose a hands-on cooking or baking class and join us around the kitchen table.`
- Address: `Woodstock, Cape Town, South Africa`
- Example times: `09:00`, `10:00`, `11:00`, `13:00`, `14:00`, `15:00`, `17:00`
- Example services:
  - `Pasta From Scratch`
  - `Artisan Bread Workshop`
  - `French Pastry Foundations`
  - `Cape Malay Cooking`
  - `Private Baking Lesson`
- FAQ questions:
  - `What should I bring?`
  - `Can you accommodate dietary requirements?`
  - `Can I take my food home?`

## 7. Client portal

File: `src/features/client-portal/components/ClientPortalGate.jsx`

Purpose:

- Client-side entry for viewing/managing client-related booking/message surfaces.
- App route host passes auth dialog, owner login, guest preview, and install app actions into this gate.

Product note:

- In the Book and Buy direction, client portal should remain lightweight: requests, messages, order/request status, and profile access.

## 8. Backend architecture

### 8.1 Firebase services

Frontend service file:

- `src/services/firebase.js`

Firebase modules:

- Auth.
- Firestore.
- Storage.
- Functions.
- Optional App Check.

Runtime config:

- Reads Firebase config from `globalThis.__firebase_config` or `VITE_FIREBASE_CONFIG`.
- App id comes from runtime config or `VITE_APP_ID`, with fallback `build-a-booking-v2`.
- Initial auth token can be supplied by runtime.

Auth behavior:

- Browser/native aware.
- Capacitor native environment uses `initializeAuth` with IndexedDB persistence.
- Web uses Firebase Auth normally.

App Check:

- Enabled on web if `VITE_FIREBASE_APPCHECK_SITE_KEY` is present.
- ReCaptcha V3 provider.
- Debug token supported by `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN`.
- Cloud functions only enforce App Check when backend env `BUILD_A_BOOKING_ENFORCE_APP_CHECK === 'true'`.

Google Calendar:

- Scope: `https://www.googleapis.com/auth/calendar.events`
- `src/services/googleCalendar.js` builds and inserts calendar events.
- Only confirmed bookings with date/time and no existing event id are syncable.
- Event summary: `{business}: {client}`
- Event description includes business, client, contact, staff, note, and booking id.

### 8.2 Firebase hosting

File: `firebase.json`

Hosting:

- Public folder: `dist`
- SPA rewrite: all paths route to `/index.html`

Security headers:

- CSP with self, Google/Firebase, Maps/Auth/ReCaptcha, and required connect/script/style/img/frame sources.
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=(self)`

Note:

- CSP currently allows some inline script/style behavior for app/runtime needs. If hardening later, test carefully.

### 8.3 Firestore path convention

Path helper file:

- `src/shared/firebase/paths.ts`

Main path shapes:

- Root: `artifacts/{appId}`
- Owner settings: `artifacts/{appId}/users/{ownerId}/config/{docId}`
- Owner bookings: `artifacts/{appId}/users/{ownerId}/bookings`
- Owner payment settings: `artifacts/{appId}/users/{ownerId}/payment_settings/{gatewayId}`
- Public workspace: `artifacts/{appId}/public/data/workspaces/{slug}`
- Public workspace services: `artifacts/{appId}/public/data/workspaces/{slug}/services`
- Public workspace staff: `artifacts/{appId}/public/data/workspaces/{slug}/staff`

Callable name constants:

- `createOwnerBookingRequest`
- `createPublicBookingRequest`
- `getPublicPaymentOptions`
- `getPublicServiceAvailability`
- `initiatePayment`
- `markManualBookingPaid`
- `savePaymentGatewaySettings`

### 8.4 Cloud Functions

Main file:

- `functions/index.js`

Payment module:

- `functions/payments/index.js`

Shared config:

- `functions/functionConfig.js`

Runtime:

- Node.js 22.
- Region defaults to `us-central1`.
- Secrets include `RESEND_API_KEY`.
- Payment crypto uses `PAYMENT_SETTINGS_ENCRYPTION_KEY`.

Exported functions:

| Function | Type | Purpose |
|---|---|---|
| `getEmailProviderStatus` | callable | Checks email provider availability for authenticated users. |
| `sendAuthVerificationEmail` | callable | Sends verification email. |
| `sendPasswordResetEmail` | callable | Sends password reset email. |
| `sendBookingClientEmail` | callable | Sends booking-related client email. |
| `createOwnerBookingRequest` | callable | Creates a booking/request from inside owner workspace. |
| `getPublicServiceAvailability` | callable | Public availability lookup for selected service/date/workspace. |
| `createPublicBookingRequest` | callable | Public client booking/request submit. |
| `processNotificationJob` | Firestore trigger | Processes queued notification documents. |
| `syncBookingOperationalState` | Firestore trigger | Mirrors/syncs operational booking state. |
| `sendBookingReminderNotifications` | scheduled | Sends booking reminders in configured windows. |
| `cleanupOperationalDocuments` | scheduled | Cleans old operational documents. |
| `backfillWorkspaceScaleCollections` | callable | Backfills/normalizes scale collections. |
| `createCheckoutSession` | callable | Stripe checkout placeholder; unavailable unless configured. |
| `createBillingPortalSession` | callable | Stripe billing portal placeholder; unavailable unless configured. |
| `getPublicPaymentOptions` | callable | Returns public-safe payment options. |
| `savePaymentGatewaySettings` | callable | Saves encrypted gateway settings. |
| `initiatePayment` | callable | Starts payment flow if enabled. |
| `markManualBookingPaid` | callable | Marks a booking manually paid. |

### 8.5 Function security utilities

File:

- `functions/security.js`

Important protections:

- Public booking payload allowlist.
- Unknown field rejection.
- Payload size limit of 12KB for public booking payloads.
- Basic email validation.
- Safe document id validation.
- Time label validation.
- String cleaning:
  - Removes control characters.
  - Collapses whitespace.
  - Truncates values.
- Rate limit identity hashing with SHA-256.
- Rate limit salt from `RATE_LIMIT_SALT` or app id.

Rate limits:

- `booking_create`: 6 requests per 10 minutes.
- `availability_lookup`: 120 requests per 10 minutes.
- `public_payment_options`: 120 requests per 10 minutes.
- `auth_email`: 5 requests per 15 minutes.

Security note:

- Confirmation/save logic should re-check conflicts transactionally before confirmed bookings lock staff/time/resources.

## 9. Firestore security rules

File:

- `firestore.rules`

Core concepts:

- `signedIn()`
- `isPasswordAccount()`
- `verifiedSignedIn()`
- `isOwner(userId)`
- `hasStaffAccess(appId, userId)`
- `staffRole(appId, userId)`
- `canStaff(appId, userId)`
- `canAdmin(appId, userId)`
- `canPaymentAdmin(appId, userId)`

Important behavior:

- Password-account users must have verified email for workspace access.
- Workspace owners access their own user workspace.
- Staff access is granted through `staffAccess/{email}/workspaces/{userId}` docs.
- Admin-level roles are required for services/staff writes.
- Staff can generally read operational workspace data.
- Payment settings are limited to owners/payment admins.
- Private documents are denied by default.
- Public workspace data is intentionally readable for public booking/profile pages.

Important collections covered:

- `accounts`
- `accountLookup`
- `users/{userId}/config`
- `users/{userId}/clients`
- `users/{userId}/staff`
- `users/{userId}/services`
- `users/{userId}/calendarDefaults`
- `users/{userId}/calendarDays`
- `users/{userId}/availabilityDays`
- `users/{userId}/bookings`
- `users/{userId}/clientErrors`
- `users/{userId}/payment_settings`
- `users/{userId}/payment_attempts`
- `users/{userId}/processed_transactions`
- `users/{userId}/finance`
- `users/{userId}/financeImports`
- `clientThreads`

Chat attachment validation:

- Max 4 attachments per message.
- Allowed attachment types include image, document, and voice.
- Validates mime, filename, size, URL/path, and optional duration.
- Max file size: 25MB.

## 10. Storage security rules

File:

- `storage.rules`

Public/read behavior:

- Workspace brand assets, venue photos, services photos, and account avatars can be publicly readable where intended.
- Public read is necessary for booking pages and social profile visuals.

Write behavior:

- Owners or staff with workspace access can manage workspace assets.
- Image uploads require image content type and size under 6MB.
- Chat attachments can be up to 25MB with approved document/image/audio mime types.
- Thread attachment paths require the requester to have thread access.

Important storage folders:

- `brand`
- `venue`
- `services`
- `account-avatars`
- `clientThreads/{threadId}/attachments/{messageId}/{fileName}`

## 11. Main data objects and concepts

### 11.1 Workspace settings

Lives under owner config paths, commonly:

- `artifacts/{appId}/users/{ownerId}/config/settings`

Includes:

- Business identity.
- Logo/banner/venue images.
- Address/location.
- Public slug/profile link settings.
- Booking flow copy.
- Availability rules.
- Google calendar connection state.
- Social links.
- Theme/accent settings.

### 11.2 Services

Lives in config and/or scale collections under owner workspace and public workspace service mirrors.

Key concepts:

- `scheduleType` is the canonical booking style.
- Old fields like `bookingType` or `serviceType` may be aliases.
- Missing/old values normalize to appointment.

Current supported direction:

- `appointment`: one-to-one booking.
- `class_session`: book a spot/class/session.

Removed/de-emphasized:

- Event packages.
- Trade services/mobile jobs.
- Accommodation/property bookings.
- Resource rental.

### 11.3 Bookings / requests

Main collection:

- `artifacts/{appId}/users/{ownerId}/bookings`

Typical fields:

- Client name/contact.
- Service id/name.
- Staff assignment.
- Date and time/preferred time.
- Status.
- Payment/manual payment status.
- Notes.
- Google calendar event id when synced.
- Request/notification metadata.

Primary statuses seen in UI:

- Pending/review.
- Confirmed.
- Waitlist.
- Completed.
- Rescheduled.
- Cancelled/history.

### 11.4 Clients

Main collection:

- `artifacts/{appId}/users/{ownerId}/clients`

Used by:

- Client directory.
- Booking rows.
- Chat.
- Client profile panel.

### 11.5 Staff

Main collection:

- `artifacts/{appId}/users/{ownerId}/staff`

Related access docs:

- `artifacts/{appId}/staffAccess/{email}/workspaces/{ownerId}`

Used by:

- Staff roster.
- Booking assignment.
- Schedule lanes.
- Service assignment.

### 11.6 Client threads and messages

Main path:

- `artifacts/{appId}/clientThreads/{threadId}`

Used by:

- Support Inbox.
- Booking chat.
- Client/business messaging.

Security:

- Access is based on workspace staff/admin or matching client email.

### 11.7 Payments/finance

Paths include:

- `payment_settings`
- `payment_attempts`
- `processed_transactions`
- `finance`
- `financeImports`

Important product note:

- Payment processing should be treated carefully. Current product direction says no payment processing for the social/catalogue concept unless the user re-approves it.

## 12. Testing and verification map

Package scripts in `package.json`:

- `npm run build`
- `npm run typecheck`
- `npm run health`
- `npm run scale:check`
- `npm run test:bookings`
- `npm run test:example`
- `npm run e2e`
- `npm run e2e:booking`
- `npm run revenue:check`
- `npm run check`
- `npm run a11y:check`
- `npm run performance:check`
- `npm run security:audit`
- `npm run smoke`
- `npm run payment:sandbox`
- Mobile launch checks under `launch:*`

Functions scripts:

- `npm --prefix functions run lint`
- `npm --prefix functions run test:payments`

Useful targeted tests found in the repo:

- `functions/availability.test.mjs`
- `src/features/schedule/utils/scheduleOperationsModel.test.mjs`

Recommended verification before deployment:

- Run typecheck.
- Run production build.
- Run schedule/booking tests if schedule or availability changed.
- Run functions lint/tests if backend changed.
- Inspect the relevant screen in the local app after UI changes.
- Check mobile layout for Social Profile, Editor, Bookings, and public booking flows if touching responsive CSS.

## 13. Known architectural/product caveats

- Book and Buy naming is not fully propagated; legacy `Build A Booking` copy remains in several files.
- Social Profile is a new dashboard page, not necessarily a public published social profile route yet.
- The heavy schedule board exists, but the product direction is moving toward simpler business hours and request approval.

## 20. Products & Services platform + launch loop (2026-08-06)

### Nav and desks

- **Services group**: `services` (Catalog \| Booking Requests via `ServicesPage` + `ServicesStudio` `mode="services"`), `staff` (Schedule today board).
- **Products group**: `products` (Catalog \| Orders via `ProductsPage` + `ServicesStudio` `mode="products"` + `ProductOrdersDesk`).
- Booking Requests live under Services (not a top-level Bookings tab). `#/dashboard/booking-requests` and pending badges open Requests mode (`catalogCategory: 'requests'`).
- Product order aliases / badges open Orders mode (`catalogCategory: 'orders'`).
- Team roster lives in Profile → Team; Schedule consumes staff, does not hire/fire.

### Publish & share

- `useBookingPageLauncher` builds absolute `#/book/{slug}` and `#/shop/{slug}` URLs.
- Services, Products, Profile → Public pages, and onboarding complete card expose Open / Copy for booking and shop links.
- Do not hard-code empty `bookingPageUrl` in route hosts.

### Public storefront (`/shop/:slug`)

- Routed from `getPublicShopSlug` in `src/utils/publicBookingRoute.js` / `src/App.jsx`.
- Checkout payment method picker: card (Stripe/Paystack when enabled) + Manual EFT + Cash.
- Card path: `createPublicProductOrder` then `initiatePayment` redirect.
- Stock fields are display/notes only (default hidden on cards); inventory is not decremented on order yet.

### Payments (V1)

Keep only: **Stripe**, **Paystack (merchant public + secret API keys)**, **Manual EFT**, **Cash**.

- UI: `src/features/finance/config/gatewayConfig.jsx` — no Payfast/Yoco, no bank Connect wizard.
- Backend allowlist: `functions/payments/shared.js` `GATEWAYS`.
- Hosted checkout: `functions/payments/gatewayFactory.js` (merchant secret key for Paystack).
- Webhooks exported: `stripeWebhook`, `paystackWebhook` only.
- Paystack Connect / subaccount / platform fee code (`PaystackConnectPanel.jsx`, `paystackConnect.js`) is orphaned — do not re-wire for V1.
- Smoke: `functions/payments/launchPath.smoke.test.mjs`.

### Deferred

- Social Profile as public Instagram-style page
- Paystack Connect / Terminal / platform fee splits
- Real Dashboard analytics
- Enforced inventory / shipping rates
- Global rename Build A Booking → Book and Buy across all copy

## 14. Suggested next-agent priorities

1. Manual QA: copy booking + shop links, place a booking and a shop order with card and EFT/Cash.
2. Keep Social Profile and Paystack Connect out of nav/Finance until asked.
3. Optional: enforce stock decrement or remove stock fields entirely.
4. Optional: global Book and Buy rename.
5. When designing, inspect the actual browser screen because the user judges visual alignment from screenshots.

