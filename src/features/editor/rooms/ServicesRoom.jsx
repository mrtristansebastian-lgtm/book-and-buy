import { Grid2X2, ListCollapse } from 'lucide-react';

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

export function ServicesRoom({ settings, onSettingChange }) {
  const savedStyle = String(settings.serviceDisplayStyle || '').trim().toLowerCase();
  const activeLayout = ['rail', 'tiles'].includes(savedStyle) || (!savedStyle && settings.serviceDropdownEnabled === false)
    ? 'rail'
    : 'dropdown';

  const applyLayout = (layoutId) => {
    if (layoutId === 'rail') {
      onSettingChange('serviceDropdownEnabled', false);
      onSettingChange('serviceDisplayStyle', 'rail');
      return;
    }
    onSettingChange('serviceDropdownEnabled', true);
    onSettingChange('serviceDisplayStyle', 'dropdown');
  };

  return (
    <div className="style-direction-suite services-layout-room">
      <div className="style-direction-grid services-layout-grid">
        {serviceLayouts.map((layout) => {
          const Icon = layout.icon;
          const isActive = activeLayout === layout.id;
          return (
            <button
              key={layout.id}
              type="button"
              onClick={() => applyLayout(layout.id)}
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
    </div>
  );
}
