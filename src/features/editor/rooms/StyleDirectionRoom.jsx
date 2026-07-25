import { Grid2X2, ListCollapse } from 'lucide-react';
import { editorStyleDirections, getEditorStyleDirection } from '../../../config/appConfig';

const LOGO_SIZE_MIN = 64;
const LOGO_SIZE_MAX = 220;
const LOGO_SIZE_FALLBACK = 104;

const serviceLayouts = [
  {
    id: 'dropdown',
    icon: ListCollapse,
    title: 'Dropdown',
    copy: 'Category menu with the same polished service cards below.'
  },
  {
    id: 'rail',
    icon: Grid2X2,
    title: 'Rail',
    copy: 'Horizontal category rail with polished service cards below.'
  }
];

const clampLogoSize = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return LOGO_SIZE_FALLBACK;
  return Math.min(LOGO_SIZE_MAX, Math.max(LOGO_SIZE_MIN, parsed));
};

export function StyleDirectionRoom({ settings, value, onApply, onSettingChange, showServiceLayout = true }) {
  const activeDirection = getEditorStyleDirection(value);
  const savedServiceStyle = String(settings?.serviceDisplayStyle || '').trim().toLowerCase();
  const activeServiceLayout = ['rail', 'tiles'].includes(savedServiceStyle) || (!savedServiceStyle && settings?.serviceDropdownEnabled === false)
    ? 'rail'
    : 'dropdown';
  const logoDisplay = settings?.logoDisplay || {};
  const logoSize = clampLogoSize(logoDisplay.size);
  const logoSizeProgress = ((logoSize - LOGO_SIZE_MIN) / (LOGO_SIZE_MAX - LOGO_SIZE_MIN)) * 100;

  const applyServiceLayout = (layoutId) => {
    if (!onSettingChange) return;
    if (layoutId === 'rail') {
      onSettingChange('serviceDropdownEnabled', false);
      onSettingChange('serviceDisplayStyle', 'rail');
      return;
    }
    onSettingChange('serviceDropdownEnabled', true);
    onSettingChange('serviceDisplayStyle', 'dropdown');
  };

  const handleLogoSizeChange = (event) => {
    if (!onSettingChange) return;
    onSettingChange('logoDisplay', {
      ...logoDisplay,
      visible: logoDisplay.visible !== false,
      size: clampLogoSize(event.target.value)
    });
  };

  return (
    <div className="style-direction-suite">
      <div className="cinema-control-title is-compact">
        <span>Style direction</span>
        <small>Choose the visual language for the full booking journey.</small>
      </div>
      <div className="style-direction-grid">
        {editorStyleDirections.map((direction) => {
          const isActive = activeDirection.id === direction.id;
          return (
            <button
              key={direction.id}
              type="button"
              onClick={() => onApply(direction.id)}
              className={isActive ? 'is-active' : ''}
              aria-pressed={isActive}
              aria-label={`${direction.label} style`}
              title={direction.label}
            >
              <i className={`style-direction-preview style-direction-preview-${direction.id}`} aria-hidden="true">
                <b />
                <b />
                <b />
                <b />
                <b />
                <b />
              </i>
              <strong>{direction.label}</strong>
            </button>
          );
        })}
      </div>
      <div className="style-logo-control">
        <div className="cinema-control-title is-compact">
          <span>Logo size</span>
          <small>Resize the logo mark in the booking page header.</small>
        </div>
        <label className="cinema-range-row style-logo-size-row">
          <span>Header logo</span>
          <b>{logoSize}px</b>
          <input
            type="range"
            min={LOGO_SIZE_MIN}
            max={LOGO_SIZE_MAX}
            step="4"
            value={logoSize}
            disabled={!onSettingChange}
            aria-label="Booking page logo size"
            style={{ '--range-progress': `${logoSizeProgress}%` }}
            onChange={handleLogoSizeChange}
          />
        </label>
      </div>
      {showServiceLayout ? (
        <>
          <div className="cinema-control-title is-compact">
            <span>Service browsing</span>
            <small>Choose how clients browse and select appointment services.</small>
          </div>
          <div className="style-direction-grid services-layout-grid">
            {serviceLayouts.map((layout) => {
              const Icon = layout.icon;
              const isActive = activeServiceLayout === layout.id;
              return (
                <button
                  key={layout.id}
                  type="button"
                  onClick={() => applyServiceLayout(layout.id)}
                  className={isActive ? 'is-active' : ''}
                  aria-pressed={isActive}
                >
                  <i className={`services-layout-preview services-layout-preview-${layout.id}`} aria-hidden="true">
                    <Icon size={18} />
                    <b />
                    <b />
                    <b />
                  </i>
                  <strong>{layout.title}</strong>
                  <small>{layout.copy}</small>
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
