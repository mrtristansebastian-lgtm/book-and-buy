export const artifactRoot = (appId: string) => ["artifacts", appId] as const;

export const ownerConfigPath = (appId: string, ownerId: string, docId = "settings") =>
  [...artifactRoot(appId), "users", ownerId, "config", docId] as const;

export const ownerBookingsPath = (appId: string, ownerId: string) =>
  [...artifactRoot(appId), "users", ownerId, "bookings"] as const;

export const ownerPaymentSettingsPath = (appId: string, ownerId: string, gatewayId: string) =>
  [...artifactRoot(appId), "users", ownerId, "payment_settings", gatewayId] as const;

export const publicWorkspacePath = (appId: string, slug: string) =>
  [...artifactRoot(appId), "public", "data", "workspaces", slug] as const;

export const publicWorkspaceServicesPath = (appId: string, slug: string) =>
  [...publicWorkspacePath(appId, slug), "services"] as const;

export const publicWorkspaceStaffPath = (appId: string, slug: string) =>
  [...publicWorkspacePath(appId, slug), "staff"] as const;

export const userProfilePath = (appId: string, uid: string) =>
  [...artifactRoot(appId), "userProfiles", uid] as const;

export const clientThreadsPath = (appId: string) =>
  [...artifactRoot(appId), "clientThreads"] as const;

export const clientThreadPath = (appId: string, threadId: string) =>
  [...clientThreadsPath(appId), threadId] as const;

export const clientThreadMessagesPath = (appId: string, threadId: string) =>
  [...clientThreadPath(appId, threadId), "messages"] as const;

export const analyticsSessionsPath = (appId: string) =>
  [...artifactRoot(appId), "analyticsSessions"] as const;

export const analyticsSessionPath = (appId: string, sessionId: string) =>
  [...analyticsSessionsPath(appId), sessionId] as const;

export const analyticsEventsPath = (appId: string) =>
  [...artifactRoot(appId), "analyticsEvents"] as const;

export const analyticsEventPath = (appId: string, eventId: string) =>
  [...analyticsEventsPath(appId), eventId] as const;

export const analyticsCartsPath = (appId: string) =>
  [...artifactRoot(appId), "analyticsCarts"] as const;

export const analyticsCartPath = (appId: string, cartId: string) =>
  [...analyticsCartsPath(appId), cartId] as const;

export const analyticsDailyPath = (appId: string) =>
  [...artifactRoot(appId), "analyticsDaily"] as const;

export const analyticsDailyDocPath = (appId: string, docId: string) =>
  [...analyticsDailyPath(appId), docId] as const;

export const callableNames = {
  createOwnerBookingRequest: "createOwnerBookingRequest",
  createPublicBookingRequest: "createPublicBookingRequest",
  createPublicProductOrder: "createPublicProductOrder",
  getPublicPaymentOptions: "getPublicPaymentOptions",
  getPublicServiceAvailability: "getPublicServiceAvailability",
  getGooglePlaceReviews: "getGooglePlaceReviews",
  initiatePayment: "initiatePayment",
  confirmPaymentReturn: "confirmPaymentReturn",
  disconnectPaymentGateway: "disconnectPaymentGateway",
  markManualBookingPaid: "markManualBookingPaid",
  savePaymentGatewaySettings: "savePaymentGatewaySettings"
} as const;
