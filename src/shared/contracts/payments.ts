export type PaymentGatewayId =
  | "stripe"
  | "paypal"
  | "paystack"
  | "manual_eft"
  | "cash";

export const ONLINE_PAYMENT_GATEWAYS: PaymentGatewayId[] = [
  "stripe",
  "paypal",
  "paystack"
];

export const MANUAL_PAYMENT_GATEWAYS: PaymentGatewayId[] = ["manual_eft", "cash"];

export interface PaymentCredentialSummary {
  instructions?: string;
  publicKeyLast4?: string;
  merchantIdLast4?: string;
  accountEmail?: string;
  accountHolder?: string;
  bankName?: string;
  accountNumber?: string;
  branchCode?: string;
  accountType?: string;
  referencePrefix?: string;
  webhookConfigured?: boolean;
  secretKeyConfigured?: boolean;
  /** Demo / local only — never set from Cloud Functions responses. */
  demoConfigured?: boolean;
}

export interface PaymentGatewaySettings {
  gatewayType: PaymentGatewayId;
  enabled: boolean;
  mode: "test" | "live";
  providerName?: string;
  configured?: boolean;
  credentialSummary?: PaymentCredentialSummary;
  updatedBy?: string;
  updatedAt?: unknown;
}

/** Encrypted merchant secrets — Cloud Functions / Admin SDK only. */
export interface EncryptedPaymentSettingsDoc {
  gatewayType: PaymentGatewayId;
  mode: "test" | "live";
  enabled: boolean;
  publicKey?: string;
  clientId?: string;
  secretCiphertext: string;
  secretIv: string;
  webhookSecretCiphertext?: string;
  webhookSecretIv?: string;
  updatedAt: number;
  updatedBy?: string;
}

export interface InitiatePaymentPayload {
  appId: string;
  slug?: string;
  businessId?: string;
  gatewayType: Exclude<PaymentGatewayId, "manual_eft" | "cash">;
  /** Prefer sourceType + sourceId; bookingId kept for back-compat. */
  sourceType?: "booking" | "order";
  sourceId?: string;
  bookingId?: string;
  orderId?: string;
  amountInCents?: number;
  currency?: string;
  description?: string;
  customerEmail?: string;
  customerName?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface InitiatePaymentResult {
  ok: boolean;
  redirectUrl?: string;
  attemptId?: string;
  localOnly?: boolean;
  reason?: string;
}

export interface ConfirmPaymentReturnPayload {
  appId: string;
  slug?: string;
  attemptId?: string;
  gatewayType?: Exclude<PaymentGatewayId, "manual_eft" | "cash">;
  providerRef?: string;
}

export interface PublicPaymentOption {
  id: PaymentGatewayId;
  gatewayType: PaymentGatewayId;
  name: string;
  enabled: true;
  configured: boolean;
  mode: "test" | "live";
  credentialSummary?: PaymentCredentialSummary;
  instructions?: string;
}

export interface GetPublicPaymentOptionsPayload {
  appId: string;
  publicSlug: string;
}

export interface GetPublicPaymentOptionsResult {
  ok: boolean;
  publicSlug: string;
  options: PublicPaymentOption[];
  manualPaymentOptions: PublicPaymentOption[];
}

export interface SavePaymentGatewayPayload {
  appId: string;
  gatewayType: PaymentGatewayId;
  enabled?: boolean;
  mode?: "test" | "live";
  publicKey?: string;
  clientId?: string;
  secretKey?: string;
  webhookSecret?: string;
  credentialSummary?: PaymentCredentialSummary;
}
