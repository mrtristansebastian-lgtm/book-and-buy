import { Mail, Phone, Plus, Scissors, Trash2 } from 'lucide-react';

export const ProfileBusinessIdentitySection = ({
  onImageCrop,
  onImageRemove,
  onImageUpload,
  onSettingChange,
  settings
}) => {
  return (
    <section className="business-settings-panel business-identity-panel">
      <div className="business-identity-grid">
        <div className="business-identity-fields">
          <label className="business-text-field business-name-field native-control-pill">
            <span>Business name</span>
            <input
              type="text"
              value={settings.brandName || ''}
              onChange={event => onSettingChange('brandName', event.target.value)}
              className="native-control-input"
              placeholder="Your Business"
            />
          </label>
          <div className="business-contact-grid">
            <label className="business-text-field native-control-pill">
              <span><Mail size={12} /> Business email</span>
              <input
                type="email"
                value={settings.email || ''}
                onChange={event => onSettingChange('email', event.target.value)}
                className="native-control-input"
                placeholder="hello@yourbusiness.com"
                autoComplete="email"
              />
            </label>
            <label className="business-text-field native-control-pill">
              <span><Phone size={12} /> Business phone</span>
              <input
                type="tel"
                inputMode="tel"
                value={settings.phone || ''}
                onChange={event => onSettingChange('phone', event.target.value)}
                className="native-control-input"
                placeholder="+27 ..."
                autoComplete="tel"
              />
            </label>
          </div>
        </div>

        <div className="business-logo-card">
          <div className="business-logo-preview">
            {settings.logo ? (
              <img src={settings.logo} alt="" className="h-full w-full object-contain" />
            ) : (
              settings.brandName?.charAt(0) || 'B'
            )}
          </div>
          <div className="business-logo-actions">
            <label className="business-primary-button">
              <Plus size={14} strokeWidth={3} />
              Logo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files[0];
                  onImageUpload('logo', file, 'brand');
                  event.target.value = '';
                }}
              />
            </label>
            {settings.logo && (
              <>
                <button
                  type="button"
                  onClick={() => onImageCrop('logo', 'brand')}
                  className="business-icon-button"
                  aria-label="Crop logo"
                >
                  <Scissors size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onImageRemove('logo')}
                  className="business-icon-button is-danger"
                  aria-label="Remove logo"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
