import { useWorkspace } from '../../workspace/WorkspaceContext';

const EMAIL_TOGGLES = [
  ['emailBookingRequests', 'Email booking requests'],
  ['emailProductOrders', 'Email product orders'],
  ['emailSupportMessages', 'Email support messages']
];

export function NotificationsSettingsPage() {
  const { workspace, updateNotifications } = useWorkspace();

  return (
    <div className="grid gap-4 max-w-xl">
      <section className="bb-panel p-5 grid gap-3">
        <h2 className="bb-page-title text-xl m-0">Owner email alerts</h2>
        {EMAIL_TOGGLES.map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={Boolean(workspace.notifications?.[key])}
              onChange={(event) => updateNotifications({ [key]: event.target.checked })}
            />
            {label}
          </label>
        ))}
      </section>

      <section className="bb-panel p-5 grid gap-2">
        <h2 className="bb-page-title text-xl m-0">Client reminders</h2>
        <div className="bb-settings-stub">
          Email and SMS appointment reminders are coming soon. They will appear here when delivery
          is wired.
        </div>
      </section>
    </div>
  );
}
