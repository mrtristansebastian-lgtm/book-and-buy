import { Button } from '../../../shared/ui/Button';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { navigate } from '../../../app/routing';
import { BusinessHoursSettings } from '../../schedule/components/AvailabilityStudioSettingsSheet';
import { ValidatedProfileField } from '../components/ValidatedProfileField';

const CURRENCIES = [
  { value: 'R', label: 'R — South African Rand' },
  { value: '$', label: '$ — US Dollar' },
  { value: '€', label: '€ — Euro' },
  { value: '£', label: '£ — British Pound' }
];

const TIMEZONES = [
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Australia/Sydney',
  'UTC'
];

export function GeneralSettingsPage() {
  const { workspace, updateProfile, updateAvailabilityRules } = useWorkspace();

  return (
    <div className="bb-settings-content bb-settings-content--general">
      <section className="bb-panel p-5 grid gap-3">
        <div className="bb-settings-section-heading"><h2>Business details</h2><p>Your identity and contact details across Book and Buy.</p></div>
        <ValidatedProfileField label="Business name" value={workspace.brandName || ''} required onChange={(brandName) => updateProfile({ brandName })} />
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Tagline</span>
          <input
            className="native-control-input px-4"
            value={workspace.tagline || ''}
            onChange={(event) => updateProfile({ tagline: event.target.value })}
          />
        </label>
        <ValidatedProfileField label="Email" value={workspace.email || ''} type="email" autoComplete="email" maxLength={254} onChange={(email) => updateProfile({ email })} />
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Phone</span>
          <input
            className="native-control-input px-4"
            value={workspace.phone || ''}
            type="tel"
            autoComplete="tel"
            onChange={(event) => updateProfile({ phone: event.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Currency</span>
          <select
            value={workspace.currency || 'R'}
            onChange={(event) => updateProfile({ currency: event.target.value })}
          >
            {CURRENCIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Timezone</span>
          <select
            value={workspace.timezone || 'Africa/Johannesburg'}
            onChange={(event) => updateProfile({ timezone: event.target.value })}
          >
            {[...new Set([workspace.timezone, ...TIMEZONES, ...(Intl.supportedValuesOf?.('timeZone') || [])].filter(Boolean))].map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="bb-panel p-5 grid gap-3 bb-settings-business-hours">
        <div className="bb-settings-section-heading"><h2>Business hours</h2><p>Your regular weekly opening hours, in {workspace.timezone || 'Africa/Johannesburg'}. Staff shifts and date-specific changes stay in Availability.</p></div>
        <BusinessHoursSettings availabilityRules={workspace.availabilityRules || {}} onUpdateRules={updateAvailabilityRules} />
      </section>
      <div className="bb-settings-related-links">
        <p className="bb-muted">Manage public pages and branding in E-Business. Your public address lives in Domains.</p>
        <Button action="open" variant="secondary" type="button" className="bb-ghost-btn" onClick={() => navigate('/dashboard/website')}>
          Open E-Business
        </Button>
      </div>
    </div>
  );
}
