# Settings review — 2 October 2026

Local UI and wiring audit. No deployment, real payment, credentials, DNS changes or account deletion performed.

## Coverage

All 15 pages were visually inspected on desktop and mobile. Final DOM sizing checks covered 1543px desktop, 768px tablet and 320px narrow-phone widths, with no horizontal page overflow. Settings buttons on the narrow-phone pass met the 44px height floor. The mobile category index was also reviewed.

| Page | Review and verification |
| --- | --- |
| Business | Paired desktop fields, stacked mobile fields; invalid name/email drafts are not saved. Browser-tested field feedback, hours picker and draft/discard states. Full supported timezone list now available, retaining existing selection. |
| Plan | Aligned desktop cards, stacked mobile cards. Monthly/annual price switching tested without changing the plan. No duplicate update on selecting a demo plan. |
| Billing | Subscription and invoice states inspected; unavailable subscription management remains explicitly labelled. |
| Users | Required name and optional email validation. Demo add, cancel removal and confirm removal tested using only an audit-created profile, which was removed. Owner removal remains unavailable. |
| Payments | Stripe, PayPal and Paystack connection forms opened; mobile form fit and secret-visibility control checked without entering credentials. Added busy guards. |
| Bookings | Fixed the advance-picker payload mismatch. Two-month selection applied and survived reload; restored original three-month value. Keyboard focus wrapping and Escape tested. |
| Checkout | Optional phone toggle saved and survived reload; restored original enabled state. Required fields remain non-configurable. |
| Notifications | Activity-status toggle exercised and restored. Email alerts/reminders remain disabled and clearly labelled unavailable. |
| Locations | Venue radio keyboard navigation tested and restored. Advanced map-link fields inspected without changing location or URLs. Native selection outline applied. |
| Markets | Country search with flag tested; catalog search, variant expansion and selection count tested; test variant deselected afterward. Existing readiness warnings retained. |
| Shipping | Negative draft rejected without saving. Decimal 12.35 saved on blur and survived reload, then restored original zero rate. Preview correctly warns about products excluded from the chosen market. |
| Reviews | Demo-only Google preview tested; original blank Place ID restored. Changing the ID clears stale verification, checked time and feedback. |
| Domains | Fixed severely compressed address-column layout. Mobile and desktop layouts reviewed. Invalid domain rejected; demo-only setup and Namecheap guide switching tested. No real DNS records changed. |
| Policies | Wording editor and expanded preview tested; original policy restored. Full-width footnote fixed. |
| Account | Demo and unavailable data-action states inspected. Production sign-out path now reports failures and prevents duplicate submissions instead of swallowing errors and navigating away. Real sign-out was not executed. |

## Shared fixes

- Consistent mobile section spacing and horizontal alignment, including save status and payment/review headings.
- Native changing outlines for venue, registrar and free-delivery choices.
- Visible keyboard focus and readable headings; date/time and advance-window dialogs now contain focus, close with Escape and restore focus.
- Explicit unsaved business-hours state and discard action.
- Decimal shipping drafts remain editable until blur/Enter; invalid, negative, non-finite or unsafe amounts never save.

## Verification limits

The browser session is a local demo, not an authenticated production seller. Cloud saves, real sign-out, provider credential verification, live Google review requests and domain provisioning were reviewed in code but not exercised against real accounts. Billing upgrades, subscription invoices, team sign-in invitations, email/SMS reminders and self-service data export/deletion are not implemented features; their pages retain honest unavailable states. This audit does not claim these integrations are enabled or perfectly verified.

Existing automated emulator tests require an emulator run; skipped tests are reported separately in the handoff. Existing large-bundle and mixed static/dynamic import warnings are not resolved by this Settings pass.
