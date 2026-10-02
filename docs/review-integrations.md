# Review integrations — local implementation

Settings supports branded Google and Trustpilot provider cards, explicit connection checks, one enabled provider at a time, demo-only sample previews, and public source/author links. Connection checks never save provider review text in workspace state. Existing manually written testimonials remain separate.

Google uses Places API (New), server-only `GOOGLE_PLACES_API_KEY`, at most five provider-selected reviews, and response-only rendering rather than the previous persistent review copying. Existing cached `gplace-` entries are not displayed as manual testimonials; removal of legacy provider text from already-published Firestore records requires an explicitly reviewed migration. Google Maps/author/third-party attribution and publicly accessible Google-compatible terms/privacy must be reviewed before release.

Trustpilot uses the official service-review endpoint, first page of six latest reviews, no star filtering, original ratings/text and canonical source links. Only enable function environment `TRUSTPILOT_INTEGRATION_ENABLED=true` after appropriate platform API/display access has been approved. Set `TRUSTPILOT_API_KEY` through Secret Manager; never place it in Vite environment, workspace fields or public documents. Seller Business Unit ID is public metadata, not a secret. No credentials or agreement have been supplied in this task, so live Trustpilot imports cannot yet be verified.

Public callables `getPublicGoogleReviews` and `getPublicTrustpilotReviews` require App Check and resolve the provider ID from a published workspace—not an arbitrary public request. Owner checks use authenticated callables. No timers, scheduled imports or API scraping. Public loads call the provider once per mounted reviews view; production quotas, budget alerts and integration access controls must be configured before release. Strict Mode may make a cancelled duplicate request in development; no database review cache is introduced.

Release requirements: deploy callables, verify App Check on custom domains, use real Google Place and Trustpilot Business Unit IDs, test credential failure/empty data/auth/rate limits in emulators and staging, verify platform licensing and current brand assets, ensure attribution links are present, and audit any existing cached provider data. Do not describe this as live-verified until real credentials are tested.

Official references:
- https://developers.google.com/maps/documentation/places/web-service/policies
- https://developers.trustpilot.com/business-units-api
- https://developers.trustpilot.com/authentication
- https://corporate.trustpilot.com/legal/for-businesses/legal-brand-guidelines/sept-2026

Internal Settings logo sources: https://commons.wikimedia.org/wiki/File:Google_2015_logo.svg and https://commons.wikimedia.org/wiki/File:Trustpilot_Logo_(2022).svg. Logos are unmodified identifiers, not endorsements or ratings badges.
