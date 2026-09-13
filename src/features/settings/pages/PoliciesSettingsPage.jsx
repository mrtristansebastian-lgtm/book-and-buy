import { useWorkspace } from '../../workspace/WorkspaceContext';

const POLICY_FIELDS = [
  ['cancellation', 'Cancellation policy', 'What clients should know before they cancel or miss a booking.'],
  ['terms', 'Terms of service', 'House rules and terms for booking and buying.'],
  ['privacy', 'Privacy policy', 'How you use client contact and booking data.']
];

export function PoliciesSettingsPage() {
  const { workspace, updatePolicies } = useWorkspace();
  const policies = workspace.policies || {};

  return (
    <div className="grid gap-4 max-w-2xl">
      {POLICY_FIELDS.map(([key, label, hint]) => (
        <section key={key} className="bb-panel p-5 grid gap-2">
          <h2 className="bb-page-title text-xl m-0">{label}</h2>
          <p className="bb-muted m-0 text-sm">{hint}</p>
          <textarea
            className="native-control-input px-4 py-3 min-h-[8rem]"
            value={policies[key] || ''}
            onChange={(event) => updatePolicies({ [key]: event.target.value })}
          />
        </section>
      ))}
    </div>
  );
}
