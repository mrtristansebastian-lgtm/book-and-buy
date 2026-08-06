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

export const callableNames = {
  createOwnerBookingRequest: "createOwnerBookingRequest",
  createPublicBookingRequest: "createPublicBookingRequest",
  createPublicProductOrder: "createPublicProductOrder",
  getPublicPaymentOptions: "getPublicPaymentOptions",
  getPublicServiceAvailability: "getPublicServiceAvailability",
  initiatePayment: "initiatePayment",
  markManualBookingPaid: "markManualBookingPaid",
  savePaymentGatewaySettings: "savePaymentGatewaySettings"
} as const;
