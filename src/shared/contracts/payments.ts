export type PaymentGatewayId = "stripe" | "payfast" | "yoco" | "paystack" | "manual_eft" | "cash";

export interface PaymentGatewaySettings {
  gatewayType: PaymentGatewayId;
  enabled: boolean;
  mode: "test" | "live";
  providerName?: string;
  configured?: boolean;
  credentialSummary?: {
    instructions?: string;
    publicKeyLast4?: string;
    merchantIdLast4?: string;
    webhookConfigured?: boolean;
  };
  updatedBy?: string;
  updatedAt?: unknown;
}

export interface InitiatePaymentPayload {
  appId: string;
  businessId: string;
  gatewayType: Exclude<PaymentGatewayId, "manual_eft" | "cash">;
  bookingId: string;
  amountInCents: number;
  currency: string;
  description: string;
  customerEmail?: string;
  customerName?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface PublicPaymentOption {
  id: PaymentGatewayId;
  gatewayType: PaymentGatewayId;
  name: string;
  enabled: true;
  configured: boolean;
  mode: "test" | "live";
  credentialSummary?: {
    accountHolder?: string;
    bankName?: string;
    accountNumber?: string;
    branchCode?: string;
    accountType?: string;
    referencePrefix?: string;
    instructions?: string;
  };
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
