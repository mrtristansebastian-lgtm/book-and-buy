# Can businesses actually run on Book & Buy?

Repository and local browser audit, 9 October 2026. Covers the business families in [the target-market directory](target-market-business-directory.md). All business types within a family inherit its base coverage; important differences are called out below. This is a capability and product-fit assessment, not a regulatory clearance or a production certification.

## Main finding

The app has a credible foundation for an owner-operated retail business, appointment business or defined group session. The business card, catalogue, requests/orders desks, schedule, client book, inbox and reporting work together. The framework does not yet replace every operational system a larger or specialist business needs.

The most useful next investment is a small set of shared workflows: enquiries and quotes, custom questions, staff access, notifications, scheduled fulfilment, payment lifecycle, and specialist listing schemas. Creating hundreds of industry labels without these workflows would overstate coverage.

## Evidence and verification boundaries

- Reviewed current product/service editors, inventory model, booking/availability policy, order handling, payment authority, client records, messaging, settings, public profile/detail layouts, reporting and workspace persistence.
- Opened 14 desktop routes at 1440px and seven mobile routes at 390px in the local demo. Sampled products, services, stock, requests, orders, schedule, clients, inbox, receipts, team/notification settings and public profile/catalogue/detail screens.
- No document horizontal overflow, broken images or page errors in those samples. Product feed and service-detail regions had content exceeding their fixed scroll viewport. Screenshot inspection confirmed the image-first mobile detail layout and desktop catalogue grid.
- 51 existing focused tests passed across booking-domain, market orders, inventory authority, payment authority, service costs, financial reports and settings validation. This is not an end-to-end certification of all business scenarios or external providers.
- Browser checks used demo data; they did not test a real merchant account, customer payment, reminder delivery, Google review connection, custom domain or production database.
- Latest recorded release status: frontend deployed; newer backend deployment was blocked by the closed linked billing account. Deployment was not retried in this audit. Implemented locally, externally configured and live-verified must remain separate labels.

## Existing shared capabilities and practical limits

| Capability | What exists and why it helps | Important limit |
| --- | --- | --- |
| Business presence | Responsive business-card profile, banner/logo, category/location, bio, menu, gallery, about, reviews, FAQ, contact and policies | Good customer entry point; does not itself add specialist business workflows |
| Retail catalogue | Photos, description, prices, compare-at prices, categories, tags/collections, options/variants, variant photos and availability | Free-text product labels are not type-specific field schemas; no complete customisation form |
| Inventory | SKU, quantity, thresholds, unit cost, weight/dimensions, adjustments and CSV view export; reservation/expiry/commit policy | No full purchasing/supplier system, barcode POS, per-branch stock, batches/expiry or serial-number workflow established |
| Orders | Pending/accepted/shipped/fulfilled/cancelled states, payment state and linked client context | Fulfilment state is not a courier booking, tracking integration, returns desk or production job board |
| Shipping/markets | Country availability, selected catalogue assignments, reusable flat shipping profiles and free-shipping thresholds | Not distance/postcode zoning, carrier rates, delivery slots or click-and-collect. Matching profiles are priced by rules; this is not a shopper choice of equivalent delivery methods |
| Appointment booking | Service length/minimum, price/cost, options, staff assignment, availability, business hours, shifts, breaks, leave/blocks, booking windows and conflict checks | A minimum-duration estimate is not a job-completion workflow; no verified multi-resource or travel-time scheduler |
| Group bookings | Fixed class/programme window, capacity, party-size policy and slot/session validation | Current editor presents a start/end window, not a complete recurring timetable, attendance register or session entitlement system |
| Booking operations | Owner requests desk, manual bookings, accept/decline, completion/no-show states, schedule and proposed rescheduling | Requests require owner acceptance. Payment does not automatically confirm; automatic confirmation is unavailable |
| Waitlist | Owner can move a booking into a waitlist state; desks recognise it | Customer joining a full class and automatic vacancy offers/promotion are not enabled |
| Service options | Packages/options can have different names, prices and minimum durations | A package called 'six visits' does not create six redeemable credits, expiry or recurring reservations |
| Clients | Contact details, birthday, private notes, search, first-time/regular filters and linked booking/order history | Basic client book, not a lead pipeline, household/pet profiles, custom client fields or advanced CRM. History matching can fall back to name; stable identity links need improvement before richer automation |
| Messaging | Client/business threads, booking/order links and inbox actions | Client message initiation uses sign-in; not a low-friction guest vehicle enquiry form, nor an email/WhatsApp CRM integration |
| Payments | Merchant-specific hosted-provider flows, verified totals/payment evidence, online/manual payment states | No platform refund/payout action, deposits, instalment ledger, recurring billing or universal provider onboarding established |
| Receipts/reporting | Transaction receipt/invoice-style views, ledger CSV, traffic/conversion reports and saved-cost gross profit | Not complete accounting, expense management, bank reconciliation, or verified tax-compliant downloadable invoicing. Refund reporting does not mean refund execution exists |
| Team | Named staff roster and service/schedule association | Team profiles do not create staff accounts; Admin/Staff roster labels do not grant authenticated access |
| Branches | Branch addresses/contact/map visibility, primary location | Directory of locations, not branch-specific stock, service availability, staff permissions or consolidated branch operations |
| Notifications | In-app requests/orders/messages and configurable presence | Owner emails and customer email/SMS reminders explicitly unavailable; preferences do not send messages |
| Reviews | Google Place ID connection and display flow | Credentials/live verification needed; up to five provider-selected reviews, not a complete review-management system |
| Website builder | Guided profile editing plus custom website draft/source/version/publish architecture | Domain/hosting/AI prerequisites apply. A generated page cannot safely invent an unsupported operational feature |
| Butler | Bounded business reads and reviewed changes for supported workspace operations | Needs funded/configured/deployed services. Cannot fill missing refunds, reminders, staff access or fulfilment workflows merely through chat |

## Coverage for each business family

**Strong foundation** means a narrow, straightforward version fits existing capabilities. It does not mean production launch is cleared. **Partial** means a key daily workflow is missing. **New workflow** means ordinary product/service forms are insufficient.

### 1. Hair, beauty and non-medical grooming — strong appointment foundation

**Have:** services with duration and price options, staff roster/assignment, availability, requests, schedule, client notes/history and product sales. This covers choosing a stylist, reserving a treatment and buying ordinary aftercare products.

**Need to run smoothly:** reminders, staff sign-in, setup/cleanup buffers, configurable pre-service questions, deposit and cancellation-fee handling. Non-sensitive preference/history fields should be structured rather than buried in free text.

**Useful later:** rebook action, loyalty and prepaid visits, stylist commissions and consent records where needed. Hair colour may need processing gaps or multiple staff/resources; a single continuous appointment is not the same. Non-invasive makeup/nails are simpler than complex salon workflows. Medical procedures remain excluded.

### 2. Fitness, movement and recreational sport — partial

**Have:** individual appointment slots, group capacity, service options, staff schedules and customer history. Useful for PT sessions, one-off workshops and an instructor selling merchandise.

**Need:** recurring class timetable, attendance/check-in, reminders, prepaid session credits and a genuine customer waitlist. Any room/equipment capacity must be reserved as well as the instructor.

**Useful later:** recurring memberships, freezes, household bookings and member app views. A gym relying on access control and monthly subscriptions cannot run fully on a class-price option. A one-person coach selling single sessions is a much better initial fit.

### 3. Lessons, tuition and practical learning — partial

**Have:** appointments, defined group windows, capacity, variant pricing, schedule, notes and messages. Covers a single lesson or a one-off cooking/craft workshop.

**Need:** recurring lessons, enrolment across selected dates, attendance, package-credit redemption, parent/guardian booking relationships and configurable questions such as level or equipment required.

**Useful later:** secure lesson resources, progress notes, online-meeting links/calendar integration and course cohorts. A multi-week programme needs each occurrence represented; a start/end range alone cannot express all teaching dates or track attendance. No accredited qualification promise.

### 4. Photography, media and creative production — partial

**Have:** galleries, service packages, appointments, descriptions, client notes and conversations. Good for fixed portrait sessions with a known price.

**Need:** project enquiries, structured briefs, reference uploads, quote versions/acceptance, deposits, milestone invoices and deliverable tracking. A custom website or wedding film should not be forced into a short fixed appointment.

**Useful later:** private proof galleries, approval comments, secure asset handover, revision limits and contracts. Photographer availability and project-production status are different things and should have separate views.

### 5. Events, celebrations and wedding suppliers — partial

**Have:** portfolios/gallery, service packages, appointment availability, product sales, inbox and client records. Handles initial consultations, fixed DJ packages and standard party goods.

**Need:** event date/location/guest count, scope questionnaire, quote acceptance, deposit/balance due dates, longer/multi-day availability and supplier/client task tracking. Decorations, flowers and catering often combine products and labour in a single quote.

**Useful later:** contracts, timeline/checklist, crew and equipment assignment. Rental items require stock across date ranges. Venue/property advertising stays outside the agreed scope; ordinary appointment logic does not solve public-event ticketing.

### 6. Food, baking and non-alcoholic drink — partial

**Have:** product catalogue, variants, quantity stock, orders, prices, photos, descriptions and flat delivery rates. Good for packaged pantry products and a small range of ready-to-sell goods.

**Need:** explicit collection versus delivery, chosen fulfilment date/time, preparation lead time, daily cut-offs and order-capacity limits. Structured allergens/ingredients, storage guidance and dietary labels belong in the product template. Custom cakes need serving size, occasion, design brief, reference image and quote/deposit handling.

**Useful later:** batch/expiry stock, production sheets, recipe/ingredient costing and kitchen queues. Catering needs per-person quotes and event information. Restaurant table management, live dispatch and complex meal subscriptions are not provided by the ordinary shop.

### 7. Fashion, clothing and accessories — strong standard-retail foundation

**Have:** size/colour variants, variant photos, SKU/stock, catalogue search, pricing and orders. These directly cover a boutique's core online product sale.

**Need:** structured size guide/material/care fields, returns/exchanges, delivery tracking and a smoother stock/bulk catalogue workflow as volume grows. Tailors need measurements, fitting appointments, custom-order quotes and job progress.

**Useful later:** purchase orders, barcode POS, discounts/coupons, gift cards, stock receiving and customer wishlists. Compare-at price is a sale display, not a promotion engine. High-value/second-hand submarkets remain separately screened.

### 8. Home, decor and everyday living — standard goods strong; bespoke/bulky partial

**Have:** catalogue, variant options, dimensions/weight in inventory, unit costs, shipping profiles, orders and gallery. Suitable for candles, ordinary decor and ready-made homeware.

**Need:** public structured dimensions/material/finish information, made-to-order lead times, custom measurements, delivery/installation quotes and handling of bulky goods. Saving weight/dimensions internally does not make them an attractive specification table or create dimensional carrier pricing.

**Useful later:** installation scheduling, supplier purchase orders, production progress and staged payments. A candle shop and a custom cabinetry business should share the shell but have different forms and operational desks.

### 9. Art, craft, gifts and personalisation — standard items strong; commissions partial

**Have:** gallery, images, descriptions, options, stock, pricing and ordering. Suitable for prints, ready-made pottery and ordinary handmade gifts.

**Need:** text/colour/date personalisation, customer uploads, preview/proof acceptance, production lead time and made-to-order capacity. Commissions need a brief and quote rather than a blank-price disabled button.

**Useful later:** proof versions, digital deliverables, custom-order job board and licensing terms for creative work. One-off physical items should be stock-limited; made-to-order capacity must not pretend to be identical shelf inventory.

### 10. Books, stationery and learning supplies — strong physical-retail foundation

**Have:** products, photos, variants, stock, search and orders. Good for physical books, notebooks, journals and standard teaching packs.

**Need:** appropriate structured details such as author/ISBN/format/page count, stationery dimensions and paper specifications. Bulk school/corporate orders need quantity pricing or quote requests; personalised stationery needs proof approval.

**Useful later:** barcode lookup, bundles, supplier restocking and secure e-book delivery. Uploading a publicly reachable file is not purchase-protected digital fulfilment.

### 11. Electronics, technology and repair — partial

**Have:** ordinary product sales, variants, stock, service booking, client notes and inbox. Covers accessories and a fixed-price diagnostic appointment.

**Need:** specification/compatibility/warranty fields. Repairs need device model, symptoms, drop-off details, inspection findings, customer quote approval and received/diagnosing/awaiting-parts/ready/collected job states.

**Useful later:** serial tracking, warranties/returns, parts usage, repair history and customer status notifications. Do not use free-text client notes as an insecure vault for device passwords.

### 12. Pets and ordinary animal care — partial

**Have:** products/variants, grooming/training appointments, group capacity, client records and messages. Good for pet supplies and one pet's straightforward grooming appointment.

**Need:** pets linked to an owner, size/breed/coat/behaviour questions, emergency contact where appropriate, different appointment lengths, reminders and travel/service area for mobile providers.

**Useful later:** multi-pet booking, visit history and recurring walks. Boarding needs dated resource occupancy and check-in/out; pet sitting needs a multi-day job model. Veterinary/medicine/live-animal services remain excluded.

### 13. Flowers, plants and gardening — partial

**Have:** catalogue, bouquet variants, photos, ordinary stock, services and inbox. Good for plant retail and garden consultations.

**Need:** recipient versus purchaser details, gift message, selected delivery date/window, service radius and cut-off rules. Garden jobs need customer-site address, size/scope questions, photos, travel time and a quote.

**Useful later:** seasonal substitutions, bouquet ingredient/material stock, recurring garden visits and crew task assignment. A country shipping setting cannot enforce a florist's local delivery radius.

### 14. Cleaning, maintenance and practical home services — partial

**Have:** named services/options, staff schedules, appointments, customer notes and requests. Covers fixed-scope cleaning visits or a known-price call-out.

**Need:** work-site address independent of business location, service zones, travel buffers, room/area questions, photo uploads and site-specific quotes. A job may require multiple staff simultaneously, equipment and completion evidence.

**Useful later:** recurring visits, job checklists, before/after photos, timesheets, parts/materials and approval of additional work. Standard appointment conflict checking is insufficient for crew routing or multi-resource capacity. No trade-certification claim is made by this audit.

### 15. Automotive care, accessories and vehicles — mixed

**Have:** fixed service appointments for washes/detailing, product variants/stock for accessories, gallery, orders and client history.

**Need for workshops:** customer vehicle records, registration/model information, job cards, inspection findings, parts/labour quote approval, progress notifications and compatibility fields for parts.

**Need for dealerships:** a distinct vehicle creation step, automotive specification fields and cards, useful filters, sold/reserved listing states, and persistent listing-linked enquiries with assigned follow-up. Enquiry-only must be enforced by server order/payment paths. Current quote-only product UI is not this workflow.

**Useful later:** viewing requests, lead reminders, listing age and enquiry conversion reporting. No vehicle checkout, deposits, finance or insurance. Motorcycles/commercial vehicles need their own specifications; the first passenger-car template is not universal.

### 16. Sports, outdoor and hobby retail — standard goods strong; specialist compatibility partial

**Have:** physical products, variants, stock, category search, photos and appointment/group services. Good for sports apparel, ordinary gear and basic instrument servicing appointments.

**Need:** structured sizing, skill level, compatibility, materials and technical specifications. Repairs need the same job-card/approval flow as electronics. Equipment bookings need genuine resource tracking if hire is offered.

**Useful later:** bundles, rentals, serial/warranty records and product comparison. Do not create a separate shopping architecture for each hobby when a specification schema will do.

### 17. Business supplies and non-regulated business services — partial

**Have:** ordinary stock, variants, catalogue, service appointments, client book and conversations. Suitable for standard packaging/office supplies and fixed consultations.

**Need:** quote requests, quantity/volume pricing, business billing details, purchase-order references, artwork uploads and print-proof approval. Project services need deliverables and milestones rather than appointment duration alone.

**Useful later:** reorder templates, customer-specific prices and approval chains. No full wholesale credit-account or procurement system established. Financial, legal and other excluded services are not silently included under 'consulting'.

### 18. Larger equipment and specialist stock — new enquiry workflow

**Have:** gallery, description, price display, categories, basic product inventory and business contact information.

**Need:** equipment-specific specifications, condition/hours/year, documents, location, enquiry/quote pipeline, delivery/installation estimates and warranty information. The present general product form is inadequate for comparison or a high-value B2B buying decision.

**Useful later:** viewing/demo bookings, sales assignment, customer purchase-order references and service history. Start as enquiry-only where appropriate; never infer specialist regulatory clearance from that setting.

## Layout recommendations grounded in current screens

1. **Keep the shared business card shell.** Profile, menu, stable frame, fixed footer and internal scrolling provide a consistent customer journey. Change the content and actions by listing type, not the whole business website.
2. **Keep image-led product cards for visual retail.** Add a compact operational/table view for owners with many SKUs: stock, SKU, status and bulk edits matter more than large photos during stock work.
3. **Use compact type-specific facts.** Cars need mileage/transmission/fuel; food needs portions and allergens; equipment needs capacity/condition; apparel needs sizes. Do not cram every detail onto a card.
4. **Add structured detail sections.** Existing gallery/description/options/total layout is a foundation. Specifications, custom questions, fulfilment choices and correct transaction action should be injected by schema.
5. **Improve mobile decision access.** On the checked service detail screen, the large image and introduction appear before options/total, so the primary action needs scrolling. Consider a compact sticky summary/action inside the content area after selection, while preserving the fixed footer and avoiding overlap with the dock/keyboard.
6. **Introduce an enquiry/quote desk.** New/contacted/quoted/accepted/closed, assigned person, next follow-up and linked listing. Do not mix an unqualified enquiry with a confirmed booking or paid order.
7. **Introduce job progress for production/repairs.** Order shipment states are not sufficient for custom cakes, printing, tailoring, repairs and creative projects. Use an optional fulfilment/job record linked to the accepted quote/order.
8. **Adapt onboarding and terminology.** A business selects its operating modes and relevant listing types; ask for only needed settings. The public primary button can say Enquire, Book or Buy. Avoid making an enquiry-only dealership configure shipping or pretending a tutor sells stock.

## Shared build priorities

| Priority | Capability | Why it unlocks multiple businesses |
| --- | --- | --- |
| Launch prerequisite | Restore backend deployment, verify production auth/data/jobs/provider flows | Local demo availability is not production readiness |
| P1 | Listing types + independent transaction mode + server enforcement | Vehicles/equipment become enquiries without breaking ordinary retail |
| P1 | Persistent enquiries and quotes with follow-up states | Dealerships, creators, trades, caterers, bespoke goods and B2B supplies |
| P1 | Custom questions/uploads with field validation and access controls | Briefs, measurements, pets, vehicle symptoms, gift instructions, site photos |
| P1 | Genuine staff accounts, roles and permissions | Multi-person salons, workshops, shops and service crews |
| P1 | Reliable transactional notifications/reminders with delivery history | Prevent missed leads, orders and appointments across all sectors |
| P1/P2 | Pickup/delivery choice, dates/windows, lead times and service zones | Food, florists, custom orders, mobile/home services |
| P2 | Quote acceptance, deposits, balance due, refunds/returns and document export | Bespoke work and events need payment lifecycle, not just a total |
| P2 | Recurring sessions, attendance, package credits and customer waitlists | Fitness, tutoring, classes and repeat appointment businesses |
| P2 | Job cards/checklists/status notifications | Repairs, cleaning, trades, production and creative delivery |
| P2 | Catalogue/stock bulk tools, import, receiving and fulfilment tracking | Retail operators need efficient daily work at larger volumes |
| P3 | Resource rentals, digital entitlements and memberships | Separate operating models with deeper lifecycle requirements |

Priorities reflect breadth of benefit, not a promise to build everything before the first narrow pilot. Pick an end-to-end pilot for each supported operating mode and verify it before widening the supported-industry claim.

## Infrastructure changes needed for growth

- Retain server-calculated prices, stock/capacity checks, ownership/revision checks, retry protection and restricted public field projections. New types, enquiries and Butler tools must use those same rules.
- Add explicit collections and lifecycle models for enquiries, quotes, jobs, resources, credits and staff memberships when those features are implemented; do not bury them in descriptions or unrelated booking fields.
- Collection storage migration exists, but `readWorkspace` still reads all four entity collections when that storage mode is used. Scope queries and transactions to the records needed; add pagination/indexes and test contention with larger catalogues/history before claiming enterprise scale.
- Analytics intentionally bounds sessions/events/carts at 1,000 and reports incomplete coverage. Use aggregate/time-bucket reporting for larger merchants rather than silently treating a bounded sample as complete history.
- Branch records are currently location information. Branch inventory, services, staff and capacity need explicit relationships before marketing full multi-branch operations.
- Ship queues/retries/monitoring for outbound notifications, payment events and scheduled work. Keep a delivery/audit history and surface failures; saving a preference or request is not proof of delivery.
- Stronger identity links and authorised customer history are needed for richer CRM and self-service. The simple local email-lookup portal must not be advertised as a verified, authenticated customer account system. Existing signed-in client/messages flows should be evaluated as the basis.
- Add data export, retention and deletion workflows appropriate to each new record type. The current account settings explicitly do not provide self-service workspace export/deletion.
- Provider capability flags, credential checks and clear readiness should distinguish configured/live-verified/unavailable, including AI, Google reviews, domains and payments. Do not use generated website UI or Butler responses as proof that an integration works.
- Establish load/cost targets per merchant (catalogue size, monthly orders/bookings, users, media and AI usage), then measure them. No load benchmark or cost sustainability estimate was performed in this audit.

## Recommended first supported promises

**Retail:** showcase ordinary physical goods, sell them, manage quantities, handle orders and see recorded performance. Add returns/tracking and better stock workflow as priority upgrades.

**Appointments:** publish fixed services, accept requests, manage availability and clients. Add reminders, staff access, buffers and optional automatic confirmation before positioning it as a full salon/service management replacement.

**Classes:** sell places in defined sessions. Add recurrence, attendance and credits before claiming complete studio or school management.

**Enquiries:** implement a real listing-to-lead-to-quote journey before opening dealerships, machinery and bespoke/project businesses broadly.

Not every business needs every feature. A sole trader selling one-off appointments can start much sooner than a multi-branch gym, repair chain or rental operator. The public promise should name the operating model the app actually completes.

## Code reference map

- `src/features/products/components/ProductEditorSheet.jsx`, `ProductEditorDetailsStep.jsx`, `ProductEditorVariantsStep.jsx`; `src/utils/products.js`; `StockPage.jsx` and `ProductOrdersDesk.jsx`.
- `src/features/services/components/ServiceEditorSheet.jsx`, `ServiceEditorDurationStep.jsx`, `ServiceEditorVariantsStep.jsx`, `ServiceEditorWhenStep.jsx`; `src/utils/scheduleTypes.js` and `services.js`.
- `functions/bookingDomain.js`, `availability.js`, `rescheduling.js`, `marketOrders.js`, `marketPolicy.js`, `inventoryDomain.js`, `inventoryService.js`, `payments/`.
- `src/features/clients/pages/ClientsPage.jsx`, `src/features/client-app/startClientMessage.js`, `src/features/support/hooks/useSupportInbox.js`.
- `src/features/settings/pages/UsersSettingsPage.jsx`, `NotificationsSettingsPage.jsx`, `BookingsSettingsPage.jsx`, `CheckoutSettingsPage.jsx`, `BranchesSettingsPage.jsx`, `ReviewsSettingsPage.jsx`, `AccountSettingsPage.jsx`.
- `src/features/website/components/ProfilePageFrame.jsx`, `src/features/storefront/components/PublicCatalogDetail.jsx`, `profile-detail.css`.
- `src/features/finance/pages/FinancePage.jsx`, `FinancialReportsPage.jsx`, `components/TransactionReceiptCard.jsx`; `src/features/analytics/hooks/useAnalyticsLive.js`.
- `functions/workspaceStore.js`, `workspaceCommands.js`, `butlerDomain.js`; `docs/backend-release-readiness.md`.

This audit changes documentation only. It does not enable new industries, alter app behaviour, deploy services or obtain regulatory approvals.
