import { Grid2X2, ListCollapse } from 'lucide-react';
import { editorStyleDirections, getEditorStyleDirection } from '../../../config/appConfig';

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

export function StyleDirectionRoom({ settings, value, onApply, onSettingChange, showServiceLayout = true }) {
  const activeDirection = getEditorStyleDirection(value);
  const savedServiceStyle = String(settings?.serviceDisplayStyle || '').trim().toLowerCase();
  const activeServiceLayout = ['rail', 'tiles'].includes(savedServiceStyle) || (!savedServiceStyle && settings?.serviceDropdownEnabled === false)
    ? 'rail'
    : 'dropdown';

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
