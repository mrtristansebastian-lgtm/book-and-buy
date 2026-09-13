import { useWorkspace } from '../../workspace/WorkspaceContext';

const FIELD_TOGGLES = [
  ['collectClientName', 'Collect client name'],
  ['collectClientPhone', 'Collect phone'],
  ['collectClientEmail', 'Collect email'],
  ['collectClientNotes', 'Collect notes'],
  ['waitlist', 'Offer waitlist when full']
];

export function CheckoutSettingsPage() {
  const { workspace, updateFeatures } = useWorkspace();
  const features = workspace.features || {};

  return (
    <section className="bb-panel p-5 grid gap-3 max-w-xl">
      <h2 className="bb-page-title text-xl m-0">Client checkout fields</h2>
      <p className="bb-muted m-0 text-sm">
        Choose what clients provide when they book or buy.
      </p>
      {FIELD_TOGGLES.map(([key, label]) => (
        <label key={key} className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={Boolean(features[key])}
            onChange={(event) => updateFeatures({ [key]: event.target.checked })}
          />
          {label}
        </label>
      ))}
    </section>
  );
}
