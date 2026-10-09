# Book & Buy: catalogue types and platform scope

Research and repository review: 9 October 2026. Working jurisdiction: South Africa.

Implementation update, 9 October 2026: the local app now includes physical-product, electronics, vehicle and equipment types. All three specification templates start with essentials and offer a searchable, grouped Add specification menu. Electronics covers 16 device types with device-specific fields, normal variants, stock and checkout. Vehicle/equipment specifications, asking prices, filters and detail views are implemented; enquiries and viewing requests enter the existing Inbox with private follow-up notes. Food categories use presence-only business cards with commerce blocked on the server. Office has a Teams roster with contact details, service responsibility, workload and availability. These changes still need production backend/rules/index deployment. The audit findings below describe the baseline before this implementation; the remaining template proposals are future scope.

This is a product specification and preliminary regulatory screening, not confirmation that Book & Buy is exempt from registration. The question is what Book & Buy itself does, not which occupational licences its customers need. The proposed templates below are not implemented by this document.

## Recommended platform role

Provide business profile websites, catalogue publishing, ordinary scheduling, merchant-directed checkout and contextual enquiries. The business remains the named supplier, sets its terms, fulfils the order and receives its payments through its own supported provider account. Book & Buy charges for its software. Do not assume this description determines the legal position: actual contracts, money flow, activities and marketing must match it.

Avoid platform-held customer funds, wallets, escrow, seller payouts, negotiating vehicle sales, financing applications, insurance recommendations and property advertising until the relevant platform obligations are resolved. Subscription fees for software do not automatically make every underlying activity unregulated.

## What the current framework actually supports

- Physical products: prices, photos, options/variants, stock and ordinary ordering.
- Services: individual appointment slots and group/class spots. Industry labels do not add new scheduling capabilities.
- Merchant payment credentials and hosted provider checkout exist in the code. This is evidence of the intended payment architecture, not evidence of regulatory approval or provider approval in every country.
- Product quote-only currently prevents cart purchase but displays a disabled detail-page button. It does not yet provide a complete enquiry lifecycle.
- No complete resource rental, overnight accommodation, recurring subscription billing, secure digital delivery or vehicle listing system was established by this review.

Relevant implementation points: `src/utils/products.js`, product editor components, `PublicCatalogDetail.jsx`, `useCart.js`, `scheduleTypes.js`, `functions/marketOrders.js`, public catalogue projections and `functions/payments/`.

## Separate three decisions

1. **Business industry**: who the business is, such as a dealership or clothing shop. Used for discovery and suitable defaults.
2. **Listing type**: what this particular listing needs, such as a vehicle, ordinary physical product or custom order. Controls fields, cards and detail presentation.
3. **Transaction mode**: checkout, enquiry, appointment or group booking. Controls what customers can actually do.

A dealership can list an enquiry-only car and sell an ordinary accessory. A displayed price is compatible with enquiry-only. Do not overload the existing free-text `productType` label or infer eligibility from a category name.

## Proposed type catalogue

| Type | Distinct setup and presentation | Customer action | Readiness |
| --- | --- | --- | --- |
| Physical product | Existing photos, price, options, stock, delivery | Add to cart | Existing foundation |
| Custom / made-to-order product | Personalisation fields, production lead time, reference uploads, price rules | Enquire initially; checkout only when requirements and total are fixed | Requires structured requests and validation |
| Vehicle | Automotive fields, vehicle card, gallery, specification groups, dealer information | Enquire / request a viewing | First new template; force enquiry-only |
| Equipment / machinery for sale | Manufacturer, model, year, condition, hours used, capacity, dimensions, location | Enquire; selected ordinary items may use checkout later | Reuse enquiry infrastructure, separate specifications |
| Appointment service | Duration, staff, availability, location, price | Book a slot | Existing foundation |
| Class / workshop / session | Timetable, capacity, location, age/access requirements | Book a spot | Existing foundation; no claim of reserved-seat ticketing |
| Project / quote service | Scope questions, location, budget, references, estimate versus fixed quote | Request a quote | Enquiry workflow needed; do not reserve arbitrary time slots |
| Digital download | Files, licence terms, secure delivery entitlement, download access | Purchase and download | Defer until secure fulfilment exists |
| Rental asset | Resource calendar, quantities, date ranges, collection/return, deposits, damage terms | Request availability initially | Defer instant rental checkout; appointment availability is insufficient |
| Membership / recurring plan | Billing intervals, entitlement, renewal, cancellation, failed payments | Subscribe | Defer until recurring billing and entitlement management exist |

Property is excluded from the proposed launch template catalogue pending specific platform regulatory review. Aircraft, boats and other specialist vehicles are not automatically covered by the initial passenger-car template.

## Vehicle creation flow

Type -> Vehicle details -> Photos -> Description and features -> Price and availability -> Review.

Selecting Vehicle fixes the transaction mode to enquiry. No shipping, cart, stock variants, payment selection or financing application. Each physical vehicle gets a separate listing and stock reference; sold/reserved/available are listing states, not checkout inventory promises. Existing products retain their current behaviour.

### Core fields

- Make, model, derivative/trim, year, new/used/demo condition.
- Asking price or price on enquiry; currency; clear tax/fee description where applicable.
- Odometer in km, transmission, fuel/energy type, body style, exterior colour.
- Dealer location, listing reference, availability and photos.
- Optional service history, previous owners, warranty information and dealer-written condition disclosures.
- Private internal identifiers must not leak through the public catalogue. Do not collect buyer identity documents, bank details or finance information in ordinary enquiries.

### Extended specifications

Engine capacity, cylinders, power kW, torque Nm, driven wheels; consumption L/100 km, fuel tank L, CO2 g/km; seats/doors, dimensions mm, boot capacity L; safety systems, airbags, comfort and convenience features. For electric vehicles: battery capacity kWh, stated range with test standard, AC/DC charging specifications. Hybrid fields must allow both engine and battery details.

Use separate groups and conditional fields. Unknown values are omitted, not converted to zero or 'No'. Distinguish actual dealer-declared equipment from generic factory specifications. Do not promise automatic specifications without a suitable licensed data source and a method of matching the exact derivative.

Cars.co.za is an information-hierarchy reference, not a source to copy designs, photos, listings or specifications wholesale. Its example detail page distinguishes new-model specifications from the vehicle being advertised.

### Vehicle card and detail layout

Card: image, year/make/model, derivative, price, compact mileage/transmission/fuel facts, location and availability. Primary action opens details or enquiry; never add to cart.

Detail: preserve the existing fixed business-card shell and scrolling content. Desktop gallery on the left with vertical thumbnails; title, price, key facts and enquiry actions on the right. Mobile gallery then horizontal thumbnails, summary and enquiry actions. Below: description, grouped specifications, features and dealer contact. Long optional specifications can expand within the content area.

### Enquiry lifecycle

Capture listing ID, listing revision, business, customer contact, preferred contact method, message and optional viewing preference. Persist a private enquiry before showing success. Link it to the merchant inbox with listing context. Track new/contacted/closed and provide a receipt or confirmation. A viewing preference is a request, not a confirmed appointment.

Apply access controls, validation, spam/rate controls, retention and deletion policies. Explain which dealer receives the enquiry. Do not bundle marketing consent into the enquiry or resell contact details by default. Do not claim email/SMS delivery unless those services actually send it.

## Industries and realistic launch boundaries

The following are engineering groupings and preliminary product recommendations, not industry-by-industry legal clearance.

| Business group | Framework fit | Recommended boundary |
| --- | --- | --- |
| Apparel, ordinary accessories, homeware, stationery, crafts, ordinary retail | Physical catalogue | Standard products; restrict regulated goods separately |
| Hair, nails, barbers, non-medical beauty, auto detailing, ordinary cleaning | Appointment | Scheduling software; no clinical claims or treatments template |
| Photography, music lessons, tutoring, creative studios | Appointment or group spots | Do not imply accredited qualifications; avoid unnecessary child data |
| Cooking, craft, dance, fitness and other ordinary workshops | Group spots | Capacity-based sessions; no promise that all safety/compliance needs are handled |
| Wedding vendors, catering, repairs, design and bespoke work | Appointment plus project enquiry | Fixed services can be booked; variable scope should be quoted |
| Car dealerships | New vehicle template | Advertise and route enquiries; no platform negotiation, sale, deposit or finance workflow |
| Machinery sellers | Equipment template | Enquiry-led specifications; separate review for restricted goods |
| Room, studio and equipment hire | Resource reservation missing | Enquiries initially; avoid duplicate bookings disguised as normal appointments |
| Pet boarding, accommodation and multi-day activities | Overnight/date-range features missing | Defer instant booking until resource and duration rules exist |
| Medical, legal, finance, insurance, property, gambling, controlled substances, weapons | Outside launch recommendation | Separate platform review before enabling specialist flows |

Existing business-category presets are discovery labels, not an approved-industry policy. Several currently mix different operating models, for example grooming and boarding, or studios and equipment rentals. Split these before claiming complete support.

## Platform legal findings

### Ordinary software and advertising

Recommended initial model: software for profiles, ordinary catalogues, appointment/class scheduling and enquiries. This review has not established a blanket 'no licence required' finding. Classification must account for the activities Book & Buy undertakes, its remuneration and contracts. A seller's separate licensing requirements do not automatically transfer to the platform, but platform obligations can arise independently.

### Payments are a separate review

The code uses merchant-specific credentials and hosted provider checkout. Keeping funds out of Book & Buy's bank account is a sensible proposed boundary, but does not by itself establish exemption: SARB regulates system operators as well as third-party payment providers. Obtain a classification of the actual integration and provider agreement before asserting no platform registration is needed.

SARB's current transition page says authorisation/registration functions moved from PASA to SARB from August 2026, with existing registrations continuing subject to the applicable transition. Use current SARB channels rather than assuming older PASA instructions remain the application route. [SARB regulation](https://www.resbank.co.za/en/home/what-we-do/payments-and-settlements/regulation), [SARB transition](https://www.resbank.co.za/en/home/what-we-do/payments-and-settlements/psmb).

### Vehicles

Advertising and forwarding an enquiry is the proposed boundary; do not represent it as an adjudicated exemption. The Second-Hand Goods Act regulates dealers, while FIC guidance covers high-value goods dealers including motor vehicles. If Book & Buy buys, sells, exchanges, negotiates or otherwise acts as a dealer, the analysis changes. No vehicle checkout is a product restriction, not the complete legal test. [Second-Hand Goods Act](https://www.gov.za/documents/second-hand-goods-act), [FIC PCC 58](https://www.fic.gov.za/wp-content/uploads/2024/03/2024.03-PCC-HVGD-guidance.pdf).

### Property is an exception to the advertising assumption

PPRA explicitly lists property advertising platforms in its registration material. Do not enable property simply because checkout is disabled. A consultation recommending an exemption does not establish an operative exemption for Book & Buy. Confirm any current exemption and its conditions before changing this boundary. [PPRA registration FAQ](https://theppra.org.za/faqs/faq-registration/), [PPRA registration notice](https://theppra.org.za/notice-to-all-property-practitioners-registration-of-all-industries-from-01-july-2024/).

### Finance and insurance

FAIS regulates financial advice and intermediary services. Ordinary vehicle enquiries must not quietly become insurance selection, credit applications, financial recommendations or arranging finance. Any proposed referral mechanism needs its own review rather than assuming all referrals are exempt. [FAIS Act](https://www.gov.za/documents/financial-advisory-and-intermediary-services-act), [FSCA intermediary guidance](https://www2.fsca.co.za/Regulatory%20Frameworks/Guidance%20Notes/GNIntermediateReps.pdf).

### General platform obligations still apply

POPIA Information Officer registration, appropriate privacy/security measures, access/deletion handling, incident response and lawful direct marketing must be addressed. The Information Regulator also identifies compliance-framework, impact-assessment and PAIA-manual duties. Electronic-commerce supplier information, consumer terms, prices, fulfilment and applicable refund/cancellation rights need to be presented accurately. A disabled payment button does not remove personal-information obligations. [Information Regulator](https://inforegulator.org.za/popia/), [ECT Act](https://www.gov.za/documents/electronic-communications-and-transactions-act).

## Implementation order and acceptance criteria

1. Add a versioned listing-type registry and independent transaction mode, preserving legacy product labels and default behaviour. Advertise only types whose flows actually work.
2. Build the vehicle editor, card and detail renderer; normalize units and validate allowed fields on the server.
3. Build persistent contextual enquiries and merchant inbox handling. Reuse this for quote services and machinery.
4. Enforce enquiry-only in every authoritative order/payment path, including manually forged requests and old carts. Frontend hiding is insufficient. Update public projections with explicit safe fields.
5. Separate discovery categories from operational capability and restricted-industry eligibility. Update AI tools and exports so they obey the same policy.
6. Verify desktop/mobile layout, existing product migration, save/reload/publication, no private identifier leakage, enquiry receipt/access isolation, and refusal of vehicle cart/order/payment requests.

Later: structured made-to-order requests, resource rentals, secure digital delivery and recurring plans. These should not be exposed as working types before their fulfilment and lifecycle rules exist.

Before calling the launch scope legally cleared, resolve the actual payment-provider arrangement and platform classification, vehicle-advertising role and remuneration, and the entity's privacy/consumer compliance. No regulator was contacted and no registration or approval was obtained during this research.
