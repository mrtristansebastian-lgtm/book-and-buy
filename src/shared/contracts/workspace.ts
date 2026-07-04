export interface WorkspaceFeatureFlags {
  birthday?: boolean;
  waitlist?: boolean;
  socialProof?: boolean;
  loadingScreen?: boolean;
  firstAvailable?: boolean;
  collectClientName?: boolean;
  collectClientPhone?: boolean;
  collectClientEmail?: boolean;
  collectClientNotes?: boolean;
  emailUpdates?: boolean;
  faqEnabled?: boolean;
  socialLinks?: boolean;
  location?: string;
  faqs?: Array<{ question: string; answer: string }>;
}

export interface AvailabilityRules {
  enabled?: boolean;
  scheduleMode?: "time_slots" | "first_come";
  staffAssignmentMode?: "auto" | "client" | "later";
  holdMode?: "pending_confirmed" | "pending_only" | "confirmed_only" | "confirmed";
  bookingNotice?: string;
  maxAdvanceBooking?: string;
  cancellationWindow?: string;
  reschedulingAllowed?: boolean;
  repeatBookingsAllowed?: boolean;
}

export interface WorkspaceService {
  id: string;
  name: string;
  description?: string;
  price?: string | number;
  priceType?: "fixed" | "from" | "free" | string;
  duration?: string | number;
  category?: string;
  active?: boolean;
  staffIds?: string[];
  sortOrder?: number;
  photoURL?: string;
}

export interface WorkspaceSettings {
  slug: string;
  brandName: string;
  welcomeMessage?: string;
  tagline?: string;
  currency?: string;
  primaryColor?: string;
  headingColor?: string;
  bodyColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  nativeAccent?: boolean;
  interfaceStyleDirection?: string;
  availableTimes?: string[];
  schedule?: Record<string, { available?: boolean; times?: string[] }>;
  staffCalendars?: Record<string, unknown>;
  availabilityRules?: AvailabilityRules;
  reminders?: Record<string, boolean>;
  googleCalendar?: Record<string, unknown>;
  features?: WorkspaceFeatureFlags;
  services?: WorkspaceService[];
  publicStaff?: Array<{ id: string; name: string; color?: string; photoURL?: string }>;
  paymentOptions?: unknown[];
  manualPaymentOptions?: unknown[];
  [key: string]: unknown;
}

export interface PublicWorkspace extends WorkspaceSettings {
  ownerId: string;
  ownerEmail?: string;
  workspaceName?: string;
  publishedAt?: number;
  updatedAt?: number;
}
