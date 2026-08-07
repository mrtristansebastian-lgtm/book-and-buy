import { createDefaultSettings } from '../config/workspaceDefaults';
import { DEMO_PAYMENT_GATEWAYS } from './demoWorkspace';

export function createBlankWorkspace(overrides = {}) {
  const defaults = createDefaultSettings();
  return {
    ...defaults,
    ...overrides,
    website: {
      ...defaults.website,
      ...(overrides.website || {})
    },
    notifications: {
      emailBookingRequests: true,
      emailProductOrders: true,
      emailSupportMessages: true,
      ...(overrides.notifications || {})
    },
    paymentGateways: (overrides.paymentGateways || DEMO_PAYMENT_GATEWAYS).map((gateway) => ({
      ...gateway,
      enabled: ['manual_eft', 'cash'].includes(gateway.gatewayType),
      configured: ['manual_eft', 'cash'].includes(gateway.gatewayType),
      mode: gateway.mode || 'test'
    })),
    staff: overrides.staff || [
      {
        id: 'owner',
        name: overrides.brandName || 'Owner',
        role: 'Owner',
        accessRole: 'Owner',
        email: overrides.email || '',
        color: '#111827'
      }
    ],
    clients: [],
    threads: [],
    bookings: [],
    orders: [],
    products: [],
    services: [],
    serviceCategories: [],
    productCategories: [],
    socialPosts: [],
    onboardingComplete: Boolean(overrides.onboardingComplete)
  };
}
