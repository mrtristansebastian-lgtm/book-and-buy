import { Briefcase, Check, X } from 'lucide-react';
import { normalizeService } from '../../utils/services';

export const blankService = (initialValues = {}) => normalizeService({
  name: 'New Service',
  category: '',
  description: '',
  price: '',
  currency: 'R',
  priceType: 'fixed',
  duration: '',
  staffIds: [],
  imageUrls: [],
  active: true,
  ...initialValues
});

export const priceTypes = [
  { id: 'fixed', label: 'Fixed' },
  { id: 'from', label: 'From' },
  { id: 'hourly', label: 'Hourly' },
  { id: 'quote', label: 'Quote' }
];

export const serviceStatusFilters = [
  { id: 'all', label: 'All', icon: Briefcase },
  { id: 'live', label: 'Live', icon: Check },
  { id: 'hidden', label: 'Hidden', icon: X }
];

export const serviceWorkflowPlacements = [
  'Booking page service step',
  'Bookings desk service summary',
  'Schedule booking record',
  'Client profile history'
];

export const serviceDurationOptions = [
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 45, label: '45 min' },
  { minutes: 60, label: '1 hour' },
  { minutes: 75, label: '1h 15m' },
  { minutes: 90, label: '1h 30m' },
  { minutes: 120, label: '2 hours' },
  { minutes: 150, label: '2h 30m' },
  { minutes: 180, label: '3 hours' },
  { minutes: 240, label: '4 hours' }
];

export const normalizeServiceDurationValue = (value) => {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(h|hr|hour)/);
  if (hourMatch) {
    const minutes = Math.round(Number(hourMatch[1]) * 60);
    return Number.isFinite(minutes) && minutes > 0 ? String(minutes) : '';
  }
  const numberMatch = text.match(/\d+(?:\.\d+)?/);
  const minutes = numberMatch ? Math.round(Number(numberMatch[0])) : Number(text);
  return Number.isFinite(minutes) && minutes > 0 ? String(minutes) : '';
};

export const getStaffInitial = (staff = {}) => (
  staff.name || staff.email || 'S'
).charAt(0).toUpperCase();

export const getCategoryOptions = (services = []) => {
  const categories = services
    .map(service => String(service.category || '').trim())
    .filter(Boolean);
  return Array.from(new Set(categories)).sort((a, b) => a.localeCompare(b));
};

export const filterServices = ({
  services = [],
  query = '',
  statusFilter = 'all',
  categoryFilter = 'all',
  staffFilter = 'all'
}) => {
  const normalizedQuery = query.trim().toLowerCase();
  return services.filter(service => {
    const serviceStaffIds = Array.isArray(service.staffIds) ? service.staffIds : [];
    const matchesSearch = !normalizedQuery || [
      service.name,
      service.category,
      service.description,
      service.price,
      service.duration,
      service.priceType
    ].filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery);
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'live' && service.active !== false)
      || (statusFilter === 'hidden' && service.active === false);
    const matchesCategory = categoryFilter === 'all' || String(service.category || '').trim() === categoryFilter;
    const matchesStaff = staffFilter === 'all'
      || (staffFilter === 'unassigned' ? serviceStaffIds.length === 0 : serviceStaffIds.includes(staffFilter));
    return matchesSearch && matchesStatus && matchesCategory && matchesStaff;
  });
};
