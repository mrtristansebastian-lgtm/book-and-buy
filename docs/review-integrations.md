# Google Reviews integration

Settings supports a branded Google Reviews connection card, demo-only previews and public source/author links. Manual testimonials remain separate. Review text is never copied into workspace storage.

Google uses Places API (New) and server-only `GOOGLE_PLACES_API_KEY`. At most five provider-selected reviews are rendered response-only. Legacy imported provider entries are not displayed as manual testimonials; no historical database migration was performed.

`getPublicGoogleReviews` requires App Check and resolves the Place ID from the published workspace. Owner checks use authenticated `getGooglePlaceReviews`. No scheduled imports or scraping is used. Provider loads happen when the reviews view mounts. Configure API restrictions, quotas and budget alerts, and verify Google Maps/author/third-party attribution and compatible privacy/terms before release. Google API usage is subject to Google's billing terms, not unlimited free access.

Live credential-dependent provider calls have not been asserted as verified. Tests use injected mock responses, never real credentials.

Trustpilot was removed at the user's request, including its Settings card, logo, provider requests, callable exports and secret registration. Legacy stored configuration is ignored rather than destructively migrated.

References:
- https://developers.google.com/maps/documentation/places/web-service/policies
- https://developers.google.com/maps/documentation/places/web-service/place-id
- https://commons.wikimedia.org/wiki/File:Google_2015_logo.svg
