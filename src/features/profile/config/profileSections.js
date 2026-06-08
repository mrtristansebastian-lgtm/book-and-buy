import { BellRing, BookOpen, Briefcase, FileText, Images, Settings2, ShieldCheck } from 'lucide-react';

export const buildProfileSections = ({
  importedMigrationCounts,
  isGuestWorkspace,
  onManualOpen,
  profileActivityPrimaryCount,
  settings,
  userEmail,
  workspaceRole
}) => [
  {
    id: 'account',
    title: 'Account & Access',
    note: isGuestWorkspace ? 'Guest workspace controls' : userEmail || 'Owner account',
    icon: ShieldCheck,
    meta: workspaceRole,
    quick: ['Photo & name', 'Login state', 'Team identity']
  },
  {
    id: 'billing',
    title: 'Plan & Billing',
    note: 'Plans, checkout, and billing portal',
    icon: Briefcase,
    meta: 'Ready',
    quick: ['Upgrade plan', 'Billing portal', 'Plan status']
  },
  {
    id: 'business',
    title: 'Business Details',
    note: settings.brandName || 'Brand media, venue gallery, links, logo, and banner',
    icon: Images,
    meta: settings.slug || 'booking',
    quick: ['Brand media', 'Venue gallery', 'Social links']
  },
  {
    id: 'activity',
    title: 'Activity Center',
    note: 'Internal changes, setup, and workspace health',
    icon: Settings2,
    meta: `${profileActivityPrimaryCount} signals`,
    quick: ['Services', 'Team', 'Schedule']
  },
  {
    id: 'notifications',
    title: 'Notifications Studio',
    note: 'Email, in-app, reminders, and delivery setup',
    icon: BellRing,
    meta: 'Resend',
    quick: ['Auth emails', 'Booking emails', 'Reminders']
  },
  {
    id: 'migration',
    title: 'Migration Studio',
    note: 'CSV import for clients, bookings, and finance history',
    icon: FileText,
    meta: `${importedMigrationCounts.clients + importedMigrationCounts.bookings + importedMigrationCounts.financeRecords} uploads`,
    quick: ['Upload CSV', 'Choose fields', 'Delete uploads']
  },
  {
    id: 'manual',
    title: 'Owner Manual',
    note: 'Feature guide and setup help',
    icon: BookOpen,
    meta: 'Guide',
    quick: ['Setup guide', 'Feature map', 'Best practices'],
    action: onManualOpen
  }
];
