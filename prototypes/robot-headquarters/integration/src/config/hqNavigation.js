import { workspaceTabLabels } from './routeConfig.js';

const department = (id, name, role, colour, tabs) => ({
  id, name, role, colour,
  features: tabs.map(id => ({ id, label: workspaceTabLabels[id] }))
});

/** Every current workspace page has one home in the headquarters. */
export const HQ_DEPARTMENTS = [
  department('plan', 'Book', 'Services, requests & your schedule', '#12D97A', ['services', 'requests', 'staff', 'availability']),
  department('ask', 'Buy', 'Products, orders & stock', '#1E6BFF', ['products', 'orders', 'stock']),
  department('research', 'Messages', 'Your customer conversations', '#8B3FFF', ['communications']),
  department('manage', 'Analytics', 'Your activity, traffic & finances', '#FFC400', ['business-overview', 'live-stats', 'analytics', 'finance-reports']),
  department('execute', 'Office', 'Receipts, clients & business settings', '#FF6A1A', ['finance', 'clients', 'settings']),
  department('ebusiness', 'E-Business', 'Your business profile & customer pages', '#15181D', ['website', 'website-book', 'website-buy', 'website-checkout'])
];

export const HQ_FEATURE_IDS = new Set(HQ_DEPARTMENTS.flatMap(group => group.features.map(feature => feature.id)));
export const hqDepartmentForTab = tab => HQ_DEPARTMENTS.find(group => group.features.some(feature => feature.id === tab));

export function hqConfiguration(badgeFor = () => 0) {
  return HQ_DEPARTMENTS.map(group => {
    const features = group.features.map(feature => {
      const value = Number(badgeFor(feature.id));
      return { ...feature, badge: Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0 };
    });
    return { ...group, features, badge: features.reduce((sum, feature) => sum + feature.badge, 0) };
  });
}

/** Only this frame, this origin and a known page can request navigation. */
export function readHqMessage(event, frameWindow, origin) {
  if (!frameWindow || event.source !== frameWindow || event.origin !== origin || !event.data || typeof event.data !== 'object') return null;
  const { type, tab, id, status } = event.data;
  if (type === 'bookbuy:hq-navigate' && HQ_FEATURE_IDS.has(tab)) return { type: 'navigate', tab };
  if (type === 'bookbuy:hq-ready') return { type: 'configure' };
  if (type === 'bookbuy:hq-status' && ['ready', 'error'].includes(status)) return { type: 'status', status };
  if (type === 'bookbuy:hq-opened' && HQ_DEPARTMENTS.some(group => group.id === id)) return { type: 'opened', id };
  if (type === 'bookbuy:hq-closed') return { type: 'closed' };
  return null;
}
