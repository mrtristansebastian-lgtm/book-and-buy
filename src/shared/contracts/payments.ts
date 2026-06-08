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
