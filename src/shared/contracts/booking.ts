export type BookingStatus =
  | "pending"
  | "confirmed"
  | "declined"
  | "completed"
  | "cancelled"
  | "waitlist"
  | "no_show";

export type PaymentStatus =
  | "unpaid"
  | "manual_pending"
  | "checkout_ready"
  | "paid"
  | "refunded"
  | "failed";

export interface BookingServiceSnapshot {
  serviceId: string;
  serviceName: string;
  serviceDescription?: string;
  servicePrice?: string;
  servicePriceType?: string;
  serviceDuration?: string;
  serviceCategory?: string;
  scheduleType?: ScheduleType | string;
  serviceScheduleType?: ScheduleType | string;
  scheduleSessionId?: string;
  scheduleSessionName?: string;
  partySize?: string | number;
}

export type ScheduleType =
  | "appointment"
  | "class_session";

export interface BookingClientSnapshot {
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  clientCountry?: string;
  clientBirthday?: string;
  clientNote?: string;
  clientEmailOptIn?: boolean;
}

export interface BookingPaymentSnapshot {
  paymentMethod?: string;
  paymentGateway?: string;
  paymentProviderName?: string;
  paymentStatus?: PaymentStatus | string;
  paymentReference?: string;
  amountInCents?: number;
  amountPaidInCents?: number;
  currency?: string;
}

export interface BookingRecord
  extends BookingServiceSnapshot,
    BookingClientSnapshot,
    BookingPaymentSnapshot {
  id?: string;
  ownerId?: string;
  workspaceSlug?: string;
  workspaceName?: string;
  date: string;
  dateKey?: string | null;
  time: string;
  status: BookingStatus | string;
  staffId?: string;
  staffName?: string;
  staffPhotoURL?: string;
  source?: string;
  timestamp?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  notificationChannels?: {
    email?: boolean;
    portal?: boolean;
  };
}

export interface PublicBookingSubmitPayload {
  appId: string;
  workspaceSlug: string;
  idempotencyKey: string;
  booking: Omit<BookingRecord, "id" | "timestamp" | "createdAt" | "updatedAt">;
}
