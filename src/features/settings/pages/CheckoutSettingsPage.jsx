import { useWorkspace } from '../../workspace/WorkspaceContext';

const FIELD_TOGGLES = [
  ['collectClientPhone', 'Show optional phone field', 'Clients can leave a number for booking or delivery questions.'],
  ['collectClientNotes', 'Show optional note field', 'Let clients include instructions or questions with their request.']
];

export function CheckoutSettingsPage() {
  const { workspace, updateFeatures, updateProfile } = useWorkspace();
  const features = workspace.features || {};

  return (
    <section className="bb-panel p-5 grid gap-3 bb-settings-content bb-settings-content--checkout">
      <h2 className="bb-page-title text-xl m-0">Client checkout fields</h2>
      <p className="bb-muted m-0 text-sm">
        Name and email are required to link bookings, orders and conversations. You can choose whether to show optional phone and note fields.
      </p>
      <div className="bb-settings-explainer"><strong>Always included</strong><p>Full name, email and the destination country when Markets is configured. Product deliveries also require a shipping address.</p></div>
      {FIELD_TOGGLES.map(([key, label, hint]) => (
        <label key={key} className="bb-settings-toggle-row">
          <input
            type="checkbox"
            checked={features[key] !== false}
            onChange={(event) => updateFeatures({ [key]: event.target.checked })}
          />
          <span><strong>{label}</strong><small>{hint}</small></span>
        </label>
      ))}
      <div className="bb-settings-explainer"><strong>Waitlists are not enabled</strong><p>A full class cannot currently accept a waitlist request. Availability and capacity are checked when the booking is submitted.</p></div>
      <h3 className="m-0 text-lg">Stock reservations</h3>
      <p className="bb-muted m-0 text-sm">Online payments hold stock while the customer pays. Manual requests hold stock once you accept them. Unpaid holds release automatically when their deadline passes.</p>
      {[['inventoryOnlineHoldMinutes', 'Online checkout hold (minutes)', 10, 120], ['inventoryManualHoldHours', 'Accepted manual order payment deadline (hours)', 24, 168]].map(([key, label, fallback, max]) => <label key={key} className="grid gap-1 text-sm"><span>{label}</span><input type="number" className="native-control-input" min="1" max={max} value={workspace.checkout?.[key] ?? fallback} onChange={event => { const value = Number(event.target.value); if (Number.isInteger(value) && value >= 1 && value <= max) updateProfile({ checkout: { ...workspace.checkout, [key]: value } }); }} /></label>)}
    </section>
  );
}
