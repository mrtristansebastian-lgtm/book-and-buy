# Settings and commerce release verification

Verified locally on 2 October 2026:

- 41 automated tests passed, none skipped, including Firestore emulator rules and transactional booking/order tests.
- Health check, TypeScript checking, smoke check and production build passed.
- All 15 Settings routes were checked at desktop and 390px mobile width: no document horizontal overflow or broken images.
- Markets country search displays real local SVG flags, supports filtered results and keyboard selection, and prevents adding an existing market twice.
- Catalog selection now has a selection count, product/service indicators, clearer labels, expandable variants and a no-results state. Existing assignments are preserved.
- The browser console reported no errors during the Settings checks.

Remaining operational verification:

- Trustpilot was removed at the user's request. Only Google Reviews remains integrated.
- Custom domains remain gated until Hosting permissions and operational setup are completed.
- Google provider credentials were not read; credential-dependent live provider calls are not asserted as verified.
- Responsive browser checks do not replace testing pinch gestures on a physical mobile device.
- Production deployment success must be confirmed separately; local passing checks do not imply deployment success.
