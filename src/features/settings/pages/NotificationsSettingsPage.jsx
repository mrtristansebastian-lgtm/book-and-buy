import { useWorkspace } from '../../workspace/WorkspaceContext';

const EMAIL_TOGGLES = [
  ['emailBookingRequests', 'Email booking requests'],
  ['emailProductOrders', 'Email product orders'],
  ['emailSupportMessages', 'Email support messages']
];

export function NotificationsSettingsPage() {
  const { workspace, updateNotifications, setWorkspacePresence } = useWorkspace();
  const showActivity = workspace.notifications?.showActivityStatus !== false;

  return (
    <div className="bb-settings-content bb-settings-content--notifications">
      <section className="bb-panel p-5 grid gap-3">
        <h2 className="bb-page-title text-xl m-0">Owner email alerts</h2>
        <p className="bb-muted m-0 text-sm">Not available yet. Bookings, orders and messages still appear in your app. Saved email preferences are retained, but no alert emails are being sent.</p>
        {EMAIL_TOGGLES.map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={false}
              disabled
            />
            {label}<span className="bb-settings-unavailable">Not available</span>
          </label>
        ))}
      </section>

      <section className="bb-panel p-5 grid gap-3">
        <h2 className="bb-page-title text-xl m-0">Activity status</h2>
        <label className="flex items-start gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            className="mt-1"
            checked={showActivity}
            onChange={(event) => {
              const next = event.target.checked;
              updateNotifications({ showActivityStatus: next });
              setWorkspacePresence?.({
                status: next && !document.hidden ? 'online' : 'offline',
                lastSeenAt: Date.now(),
                visible: next
              });
            }}
          />
          <span>
            Show activity status in chats
            <span className="block font-normal text-[#667085] mt-0.5">
              Clients see a green online dot or last seen when you are away. Turn off to hide your
              status completely.
            </span>
          </span>
        </label>
      </section>

      <section className="bb-panel p-5 grid gap-2">
        <h2 className="bb-page-title text-xl m-0">Client reminders</h2>
        <div className="bb-settings-stub">
          Email and SMS appointment reminders are not available yet. You can contact clients from
          their booking or inbox conversation.
        </div>
      </section>
    </div>
  );
}
