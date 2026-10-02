import { useWorkspace } from '../../workspace/WorkspaceContext';
import { AdvanceBookingField } from '../../schedule/components/AdvanceBookingField';
import { navigate } from '../../../app/routing';
import { CancellationNoticeField } from '../components/CancellationNoticeField';

export function BookingsSettingsPage() {
  const { workspace, updateAvailabilityRules } = useWorkspace();
  const rules = workspace.availabilityRules || {};

  return (
    <div className="bb-settings-content bb-settings-content--bookings">
      <section className="bb-panel p-5 grid gap-3">
        <h2 className="bb-page-title text-xl m-0">Booking policies</h2>
        <p className="bb-muted m-0 text-sm">
          Control the advance booking window and client rescheduling. Opening hours, shifts and breaks live in Availability.
        </p>
        <AdvanceBookingField
          days={rules.maxAdvanceBookingDays ?? 90}
          until={rules.maxAdvanceBookingUntil || ''}
          onChange={({ days, until }) =>
            updateAvailabilityRules({
              maxAdvanceBookingDays: days,
              maxAdvanceBookingUntil: until || ''
            })
          }
        />
        <div className="bb-settings-explainer"><strong>Requests need your confirmation</strong><p>New bookings enter Requests as pending. Accepting a request confirms the booking; payment does not automatically confirm it. Automatic confirmation is not currently available.</p></div>
        <CancellationNoticeField value={rules.cancellationWindow || ''} onChange={(value) => updateAvailabilityRules({ cancellationWindow: value })} />
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={rules.reschedulingAllowed !== false}
            onChange={(event) =>
              updateAvailabilityRules({ reschedulingAllowed: event.target.checked })
            }
          />
          Clients may request a reschedule
        </label>
        <p className="bb-muted m-0 text-sm">Clients propose a new time in their booking conversation. The original booking stays unchanged until you accept. Turning this off prevents new client proposals.</p>
      </section>

      <button
        type="button"
        className="bb-ghost-btn justify-self-start"
        onClick={() => navigate('/dashboard/availability')}
      >
        Manage hours &amp; status →
      </button>
    </div>
  );
}
