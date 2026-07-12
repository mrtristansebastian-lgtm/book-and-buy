import { BadgeCheck, Briefcase, Clock3, Globe2, Mail, MapPin, Phone, Plus, ShieldCheck, UserRound } from 'lucide-react';

const CONTACT_METHOD_OPTIONS = [
  { value: '', label: 'No preference yet' },
  { value: 'whatsapp', label: 'WhatsApp first' },
  { value: 'phone', label: 'Phone call' },
  { value: 'email', label: 'Email' },
  { value: 'portal', label: 'Client portal / in-app' }
];

const detectedTimeZone = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Johannesburg';
  } catch {
    return 'Africa/Johannesburg';
  }
})();

const AccountSettingField = ({
  autoComplete,
  hint,
  icon: Icon,
  inputMode,
  label,
  onChange,
  options,
  placeholder,
  type = 'text',
  value
}) => (
  <label className="account-settings-field native-control-pill">
    <span className="account-settings-field-icon">
      <Icon size={15} />
    </span>
    <span className="account-settings-field-copy">
      <span>{label}</span>
      {options ? (
        <select
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          className="account-settings-control"
        >
          {options.map(option => (
            <option key={option.value || option.label} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          className="account-settings-control"
          placeholder={placeholder}
        />
      )}
      {hint && <small>{hint}</small>}
    </span>
  </label>
);

const AccountMetaTile = ({ label, value }) => (
  <div className="account-settings-meta-tile">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

export const ProfilePersonalSection = ({
  activeProfileSection,
  isGuestWorkspace,
  onOpenOwnerAuth,
  onPhotoUpload,
  onRemovePhoto,
  personalDisplayName,
  personalProfile,
  updatePersonalProfile,
  user,
  workspaceRole
}) => (
  <div className={`profile-section profile-section-account ${activeProfileSection === 'account' ? 'block' : 'hidden'}`}>
    <div className="account-settings-shell">
      <div className="account-settings-hero">
        <label className="account-settings-avatar" aria-label="Upload account photo">
          {personalProfile.photoURL ? (
            <img src={personalProfile.photoURL} alt="Account avatar" />
          ) : (
            personalDisplayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || (isGuestWorkspace ? 'G' : 'A')
          )}
          <span>
            <Plus size={16} strokeWidth={3} />
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => onPhotoUpload(event.target.files?.[0])}
          />
        </label>
        <div className="account-settings-hero-copy">
          <p>{isGuestWorkspace ? 'Guest workspace' : 'Personal Profile'}</p>
          <h3>{personalDisplayName || (isGuestWorkspace ? 'Guest Workspace' : 'Workspace Owner')}</h3>
          <span>This is the person behind the workspace: contact details, location context, and access identity.</span>
          <div className="account-settings-badges">
            <span><ShieldCheck size={13} /> {workspaceRole} access</span>
            <span><Mail size={13} /> {personalProfile.email || 'No email yet'}</span>
          </div>
        </div>
        <div className="account-settings-photo-actions">
          <label>
            <Plus size={14} strokeWidth={3} />
            Change photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => onPhotoUpload(event.target.files?.[0])}
            />
          </label>
          {personalProfile.photoURL && (
            <button type="button" onClick={onRemovePhoto}>Remove</button>
          )}
        </div>
      </div>

      {isGuestWorkspace && (
        <div className="guest-profile-auth-card account-guest-card">
          <div>
            <span>Guest workspace</span>
            <strong>Save this setup to a real account.</strong>
            <p>Sign in or create an owner account to keep your page, services, and schedule beyond this local preview.</p>
          </div>
          <div>
            <button type="button" onClick={() => onOpenOwnerAuth('signin')}>Sign In</button>
            <button type="button" onClick={() => onOpenOwnerAuth('signup')}>Create Account</button>
          </div>
        </div>
      )}

      <div className="account-settings-grid">
        <section className="account-settings-card">
          <div className="account-settings-card-head">
            <span><UserRound size={16} /></span>
            <div>
              <p>Identity</p>
              <h4>Name and role</h4>
            </div>
          </div>
          <div className="account-settings-group">
            <AccountSettingField
              icon={UserRound}
              label="First name"
              value={personalProfile.firstName}
              onChange={(value) => updatePersonalProfile({ firstName: value })}
              placeholder="First name"
              autoComplete="given-name"
            />
            <AccountSettingField
              icon={UserRound}
              label="Surname"
              value={personalProfile.lastName}
              onChange={(value) => updatePersonalProfile({ lastName: value })}
              placeholder="Surname"
              autoComplete="family-name"
            />
            <AccountSettingField
              icon={Briefcase}
              label="Role or title"
              value={personalProfile.jobTitle}
              onChange={(value) => updatePersonalProfile({ jobTitle: value })}
              placeholder="Owner, stylist, manager..."
              autoComplete="organization-title"
            />
          </div>
        </section>

        <section className="account-settings-card">
          <div className="account-settings-card-head">
            <span><Phone size={16} /></span>
            <div>
              <p>Contact</p>
              <h4>How clients and staff reach you</h4>
            </div>
          </div>
          <div className="account-settings-group">
            <AccountSettingField
              icon={Mail}
              label="Contact email"
              value={personalProfile.email}
              onChange={(value) => updatePersonalProfile({ email: value })}
              placeholder="you@email.com"
              type="email"
              autoComplete="email"
            />
            <AccountSettingField
              icon={Phone}
              label="Mobile number"
              value={personalProfile.mobile}
              onChange={(value) => updatePersonalProfile({ mobile: value })}
              placeholder="+27 ..."
              type="tel"
              inputMode="tel"
              autoComplete="tel"
            />
            <AccountSettingField
              icon={BadgeCheck}
              label="Preferred contact"
              value={personalProfile.preferredContactMethod}
              onChange={(value) => updatePersonalProfile({ preferredContactMethod: value })}
              options={CONTACT_METHOD_OPTIONS}
            />
          </div>
        </section>

        <section className="account-settings-card account-settings-card-wide">
          <div className="account-settings-card-head">
            <span><Globe2 size={16} /></span>
            <div>
              <p>Location</p>
              <h4>Country, city, and timezone</h4>
            </div>
          </div>
          <div className="account-settings-group account-settings-location-grid">
            <AccountSettingField
              icon={Globe2}
              label="Country / region"
              value={personalProfile.country}
              onChange={(value) => updatePersonalProfile({ country: value })}
              placeholder="South Africa"
              autoComplete="country-name"
            />
            <AccountSettingField
              icon={MapPin}
              label="City"
              value={personalProfile.city}
              onChange={(value) => updatePersonalProfile({ city: value })}
              placeholder="Johannesburg"
              autoComplete="address-level2"
            />
            <AccountSettingField
              icon={Clock3}
              label="Timezone"
              value={personalProfile.timezone}
              onChange={(value) => updatePersonalProfile({ timezone: value })}
              placeholder={detectedTimeZone}
            />
          </div>
        </section>

        <aside className="account-settings-card account-settings-meta-card">
          <div className="account-settings-card-head">
            <span><ShieldCheck size={16} /></span>
            <div>
              <p>Workspace</p>
              <h4>Access details</h4>
            </div>
          </div>
          <div className="account-settings-meta-grid">
            <AccountMetaTile label="Account ID" value={user?.uid || (isGuestWorkspace ? 'LOCAL-GUEST' : 'BUILD-BOOKING-001')} />
            <AccountMetaTile label="Workspace Role" value={workspaceRole} />
          </div>
        </aside>
      </div>
    </div>
  </div>
);
