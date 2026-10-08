# Book & Buy verified-purchase reviews

Implemented locally on 8 October 2026. Deployment remains paused; these new callable endpoints have not been deployed or verified against production accounts.

## Customer and owner experience

Settings → Reviews has separate Google and Book & Buy connection cards. The Book & Buy switch enables reviews for the business. Customers write or edit reviews from their product orders and service bookings in their account. A review contains 1–5 stars and 3–2,000 characters of text. The customer's first name and purchased item name appear publicly.

Product reviews require a paid, uncancelled order containing the selected product. Service reviews require a paid, completed booking for the selected service. Refunded, declined and cancelled purchases are rejected. The customer must sign in with a verified Firebase account. The server matches the purchase's customer UID; only legacy purchases without a UID may use the verified account email. Owners cannot review their own business.

Each purchase/item pair has one stable review ID. An existing review remains bound to its original customer UID, including when a legacy purchaser's email is later used by a recreated account. Identical retries return the existing result; edits require the current review revision. Reopening the form loads the latest version, and a conflicting edit offers an explicit reload instead of overwriting it.

Reviews publish immediately after the customer selects **Publish review**. This release does not implement a moderation queue. On the standard business Home, Google and Book & Buy reviews keep their own source labels and cannot be rewritten through the website editor.

## Server contract and storage

| Callable | Access and result |
| --- | --- |
| `getPurchaseReview` | Verified authenticated purchaser; checks eligibility and returns their existing review/revision |
| `submitPurchaseReview` | Verified authenticated purchaser; transaction checks live settings, purchase ownership, payment/item eligibility and review revision |
| `getPublicPlatformReviews` | Public, App Check protected; resolves a published business and returns up to 50 recent public reviews |

All three callables enforce App Check. Records live in `artifacts/book-and-buy-v1/users/{ownerId}/platformReviews/{reviewId}`. Firestore client access is denied by the server-capability rules. Public responses contain only review ID, wording, rating, first name, item information, source, verified-purchase label and creation time. They exclude customer UID, owner ID, purchase ID, email, internal fingerprint and revisions.

The backend uses the authoritative workspace reader for both legacy and migrated commerce storage. Eligibility and writes share a transaction with live workspace settings. Disabling Book & Buy reviews rejects new submissions and makes subsequent public fetches return no platform reviews. Stored reviews are retained so enabling again can restore them. Views already open refresh when remounted; there is no live public push subscription in this release.

Publish the Home reviews section when enabling it for the first time. Customer review content is fetched at runtime and does not require republishing the website. Custom static website bundles need to bind the public reviews callable before they can render this new capability; the default React business Home is wired.

## Verification and release boundary

Pure checks cover authentication, purchase ownership, paid/completed requirements, wrong items, disabled settings and the verified-email fallback. Firebase emulator checks cover duplicate retries, stale edits, public redaction, owner rejection, live disabling, recreated-account duplicate prevention and denied direct browser reads/writes. The final guarded backend run passed all **74 checks with zero skips**, including existing commerce, publishing, AI and Butler checks. Its log is `.local-dev-logs/platform-review-backend-final.txt`. Provider review tests use mocked Google responses; no live Google or AI provider call was made.

Before release, deploy the callable functions and their compatible frontend, verify App Check from the public and customer origins, and complete a real authenticated customer journey using a paid product order and completed paid booking. This document describes local behavior, not a production verification claim.
