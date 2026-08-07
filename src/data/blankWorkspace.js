import { createDefaultSettings } from '../config/workspaceDefaults';
import { DEMO_PAYMENT_GATEWAYS } from './demoWorkspace';
import {
  createStaffAvailabilityForRoster,
  normalizeAvailabilityRules
} from '../utils/staffAvailability';

export function createBlankWorkspace(overrides = {}) {
  const defaults = createDefaultSettings();
  const staff = overrides.staff || [
    {
      id: 'owner',
      name: overrides.brandName || 'Owner',
      role: 'Owner',
      accessRole: 'Owner',
      email: overrides.email || '',
      color: '#111827'
    }
  ];
  const availabilityRules = normalizeAvailabilityRules(
    overrides.availabilityRules || {
      businessOpenTime: '09:00',
      businessCloseTime: '17:00',
      scheduleMode: 'time_slots',
      openWeekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
      closedDates: []
    }
  );
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
    staff,
    availabilityRules,
    staffAvailability:
      overrides.staffAvailability ||
      createStaffAvailabilityForRoster(
        staff,
        availabilityRules.businessOpenTime,
        availabilityRules.businessCloseTime,
        8
      ),
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
