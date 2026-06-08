# Build A Booking Production Readiness

This file tracks the production fixtures now scaffolded in the codebase and the provider details still needed before launch.

## Public Booking Requests

- Client booking pages call `createPublicBookingRequest` when Firebase Functions is deployed.
- The function writes the owner booking, public submission record, and notification job in one server-side transaction.
- Slot requests create a `slotLocks` document so two clients cannot reserve the same date/time at the same moment.
- The app keeps a direct Firestore fallback for local development and preview builds until Functions are deployed.

## Notifications

- New booking requests create a queued notification job under `artifacts/{appId}/notificationJobs`.
- `processNotificationJob` marks jobs as waiting for provider setup until real provider secrets are configured.
- Email provider to connect: Resend is the recommended production option for branded transactional emails.
- Client-side updates and conversations now run through the built-in client portal and inbox.

Expected Firebase Functions secrets:

```bash
firebase functions:secrets:set RESEND_API_KEY
firebase functions:secrets:set STRIPE_SECRET_KEY
```

## Billing

- Profile now includes a Plan & Billing section.
- `createCheckoutSession` and `createBillingPortalSession` are in place as safe stubs.
- Next step is adding Stripe price IDs, customer creation, webhooks, and entitlement documents.

Recommended Firestore billing documents:

- `artifacts/{appId}/billing/{ownerId}/subscription/current`
- `artifacts/{appId}/billing/{ownerId}/usage/current`
- `artifacts/{appId}/billing/{ownerId}/events/{eventId}`

## Trust And Legal

- Landing page has Privacy, Terms, and Support surfaces so the app no longer feels anonymous.
- Replace the placeholder copy with final policy text before public paid launch.
- Booking pages now explain what happens after a request is submitted.

## Performance And Smoke Checks

- Vite manual chunks separate the theme engine, font engine, schedule workspace, booking page, onboarding tour, Firebase, icons, and vendor code.
- `npm run smoke` now runs the production build health check plus critical source-level workflow checks.
- Keep the largest JS chunk below the existing 900 KB budget and total JS below 1250 KB.
