import type { ScheduleType } from "./booking";

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
  slotDurationMode?: "service" | "custom" | "bookable_times";
  slotDurationMinutes?: string | number;
  arrivalIntervalMinutes?: string | number;
  businessOpenTime?: string;
  businessCloseTime?: string;
  /** Weekdays the business is open (mon..sun). */
  openWeekdays?: Array<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun" | string>;
  /** Explicit closed dates (holidays), YYYY-MM-DD. */
  closedDates?: string[];
  autoOpenSpots?: boolean;
  staffAssignmentMode?: "auto" | "client" | "later";
  holdMode?: "pending_confirmed" | "pending_only" | "confirmed_only" | "confirmed";
  bookingNotice?: string;
  maxAdvanceBooking?: string;
  cancellationWindow?: string;
  reschedulingAllowed?: boolean;
  repeatBookingsAllowed?: boolean;
}

export interface AvailabilityRange {
  start: string;
  end: string;
}

export interface StaffDayAvailability {
  /** open = bookable shifts; break/off = not bookable */
  status?: "open" | "break" | "off";
  open: boolean;
  ranges: AvailabilityRange[];
  note?: string;
  source?: "template" | "manual" | "status";
}

export interface StaffAvailabilityBlock {
  id?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export interface StaffAvailabilityEntry {
  staffId: string;
  weekTemplate: Record<string, { open: boolean; ranges: AvailabilityRange[] }>;
  days: Record<string, StaffDayAvailability>;
  blocks?: StaffAvailabilityBlock[];
}

export interface WorkspaceService {
  id: string;
  name: string;
  description?: string;
  price?: string | number;
  priceType?: "fixed" | "from" | "free" | string;
  duration?: string | number;
  fixedDuration?: boolean;
  minDuration?: string | number;
  category?: string;
  active?: boolean;
  scheduleType?: ScheduleType | string;
  bookingType?: ScheduleType | string;
  serviceType?: ScheduleType | string;
  capacity?: number | string;
  sessionStartDate?: string;
  sessionStartTime?: string;
  sessionEndDate?: string;
  sessionEndTime?: string;
  sessionLabel?: string;
  staffIds?: string[];
  sortOrder?: number;
  photoURL?: string;
}

export interface WorkspaceProduct {
  id: string;
  name: string;
  description?: string;
  price?: string | number;
  priceType?: "fixed" | "quote" | string;
  quoteBased?: boolean;
  category?: string;
  mainCategory?: string;
  stockAvailable?: string | number;
  stockLabel?: string;
  hideStockOnCard?: boolean;
  imageUrls?: string[];
  active?: boolean;
}

export interface WebsitePageVisibility {
  home?: boolean;
  book?: boolean;
  shop?: boolean;
  social?: boolean;
}

export interface WebsiteHomeReason {
  id: string;
  title?: string;
  body?: string;
}

export interface WebsiteVenueImage {
  id: string;
  url?: string;
  caption?: string;
}

export interface WebsiteReview {
  id: string;
  quote?: string;
  name?: string;
  rating?: number;
}

export interface WebsiteFaqItem {
  id: string;
  q?: string;
  a?: string;
}

export interface WebsiteSettings {
  homeHeadline?: string;
  homeSubtext?: string;
  headline?: string;
  subcopy?: string;
  bookHeadline?: string;
  bookSubtext?: string;
  buyHeadline?: string;
  buySubtext?: string;
  socialHeadline?: string;
  socialSubtext?: string;
  ctaLabel?: string;
  buyCtaLabel?: string;
  heroImageUrl?: string;
  logoUrl?: string;
  published?: boolean;
  aboutTitle?: string;
  aboutEyebrow?: string;
  aboutBody?: string;
  aboutImageUrl?: string;
  reasonsTitle?: string;
  reasonsEyebrow?: string;
  reasons?: WebsiteHomeReason[];
  venueTitle?: string;
  venueEyebrow?: string;
  venueImages?: WebsiteVenueImage[];
  mapTitle?: string;
  mapEyebrow?: string;
  address?: string;
  mapEmbedUrl?: string;
  mapLinkUrl?: string;
  googlePlaceId?: string;
  reviewsTitle?: string;
  reviewsEyebrow?: string;
  reviews?: WebsiteReview[];
  offerTitle?: string;
  offerBookCta?: string;
  offerBuyCta?: string;
  bookStripTitle?: string;
  bookStripBody?: string;
  bookStripCta?: string;
  bookFaqTitle?: string;
  bookFaqEyebrow?: string;
  bookFaq?: WebsiteFaqItem[];
  featuredProductId?: string;
  sections?: Record<string, boolean>;
  sectionOrder?: string[];
  ctaPrimary?: "book" | "shop" | "social" | string;
  pages?: WebsitePageVisibility;
  featuredServiceIds?: string[];
  featuredProductIds?: string[];
  showFaq?: boolean;
  showContact?: boolean;
}

export interface SocialPost {
  id: string;
  type?: "image" | "video" | "text" | string;
  mediaUrl?: string;
  posterUrl?: string;
  caption?: string;
  title?: string;
  duration?: string;
  published?: boolean;
  createdAt?: number;
  order?: number;
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
  /** Per-staff week templates + explicit day overrides. */
  staffAvailability?: Record<string, StaffAvailabilityEntry>;
  availabilityRules?: AvailabilityRules;
  reminders?: Record<string, boolean>;
  googleCalendar?: Record<string, unknown>;
  features?: WorkspaceFeatureFlags;
  services?: WorkspaceService[];
  serviceCategories?: string[];
  products?: WorkspaceProduct[];
  productCategories?: string[];
  publicStaff?: Array<{ id: string; name: string; color?: string; photoURL?: string }>;
  paymentOptions?: unknown[];
  manualPaymentOptions?: unknown[];
  website?: WebsiteSettings;
  socialPosts?: SocialPost[];
  [key: string]: unknown;
}

export interface PublicWorkspace extends WorkspaceSettings {
  ownerId: string;
  ownerEmail?: string;
  workspaceName?: string;
  publishedAt?: number;
  updatedAt?: number;
}
