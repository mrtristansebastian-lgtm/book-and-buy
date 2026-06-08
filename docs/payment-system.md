# Build A Booking Payment System

## Firestore layout

Payment data is scoped to the same tenant path the app already uses:

```txt
artifacts/{appId}/users/{businessId}/payment_settings/{gatewayType}
artifacts/{appId}/users/{businessId}/private/payment_gateway_secrets/gateways/{gatewayType}
artifacts/{appId}/users/{businessId}/payment_attempts/{paymentId}
artifacts/{appId}/users/{businessId}/processed_transactions/{gateway_eventId}
artifacts/{appId}/users/{businessId}/finance/summary
```

`payment_settings` is the owner-visible public configuration: enabled state, mode, provider name, and masked credential summary.

`private/payment_gateway_secrets/gateways` stores encrypted gateway credentials. Firestore rules deny every client read and write to this path. Only Cloud Functions use the Admin SDK to access it.

`finance/summary` stores aggregate integer totals:

```json
{
  "totalRevenueInCents": 0,
  "paidTransactionCount": 0,
  "currency": "ZAR",
  "lastPaymentAt": "server timestamp",
  "updatedAt": "server timestamp"
}
```

## Required Firebase secret

The functions use AES-256-GCM to encrypt each tenant's gateway credentials. Create one 32-byte key and save it as:

```bash
firebase functions:secrets:set PAYMENT_SETTINGS_ENCRYPTION_KEY
```

Use a base64 32-byte value:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Secret Manager must be enabled on the Firebase project before deploying functions that reference this secret.

## Callable functions

`savePaymentGatewaySettings`

Saves and encrypts gateway credentials. Only the workspace owner, an admin staff grant, or a custom claim admin for that business may call it.

`initiatePayment`

Accepts:

```json
{
  "appId": "build-a-booking-v2",
  "businessId": "owner uid",
  "bookingId": "booking id",
  "amountInCents": 15000,
  "currency": "ZAR",
  "gatewayType": "stripe",
  "customerEmail": "client@example.com",
  "customerName": "Client Name",
  "description": "Haircut booking"
}
```

Returns a checkout URL and creates a `payment_attempts/{paymentId}` record.

## Webhooks

Each gateway has its own endpoint and must be registered with the gateway using tenant query parameters:

```txt
stripeWebhook?appId={appId}&businessId={businessId}
payfastWebhook?appId={appId}&businessId={businessId}
paystackWebhook?appId={appId}&businessId={businessId}
yocoWebhook?appId={appId}&businessId={businessId}
ozowWebhook?appId={appId}&businessId={businessId}
peachWebhook?appId={appId}&businessId={businessId}
```

Successful verified payments are processed through an idempotent Firestore transaction:

1. Check `processed_transactions/{gateway_eventId}`.
2. Mark the payment attempt paid.
3. Mark the booking paid.
4. Increment `finance/summary.totalRevenueInCents`.
