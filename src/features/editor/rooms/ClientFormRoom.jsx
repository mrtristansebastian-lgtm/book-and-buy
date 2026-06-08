export function ClientFormRoom({
  collectsClientEmail,
  collectsClientNotes,
  collectsClientPhone,
  emailUpdatesEnabled,
  settings,
  onFeatureChange
}) {
  const formItems = [
    { key: 'collectClientName', label: 'Name & surname', active: settings.features?.collectClientName !== false },
    { key: 'collectClientPhone', label: 'Mobile number', active: collectsClientPhone },
    { key: 'collectClientEmail', label: 'Email address', active: collectsClientEmail },
    { key: 'collectClientNotes', label: 'Client note', active: collectsClientNotes },
    { key: 'emailUpdates', label: 'Email opt-in', active: emailUpdatesEnabled && collectsClientEmail, disabled: !collectsClientEmail }
  ];

  return (
    <div className="cinema-form-room">
      <div className="cinema-toggle-grid">
        {formItems.map(item => {
          const onClick = () => !item.disabled && onFeatureChange(item.key, !item.active);
          return (
            <button key={item.key} type="button" onClick={onClick} className={`${item.active ? 'is-on' : ''} ${item.disabled ? 'is-disabled' : ''}`}>
              <span>{item.label}</span>
              <i />
            </button>
          );
        })}
      </div>
    </div>
  );
}
