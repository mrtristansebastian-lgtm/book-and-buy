import { useWorkspace } from '../../workspace/WorkspaceContext';
import { AdvanceBookingField } from '../../schedule/components/AdvanceBookingField';
import { navigate } from '../../../app/routing';

export function BookingsSettingsPage() {
  const { workspace, updateAvailabilityRules } = useWorkspace();
  const rules = workspace.availabilityRules || {};

  return (
    <div className="grid gap-4 max-w-2xl">
      <section className="bb-panel p-5 grid gap-3">
        <h2 className="bb-page-title text-xl m-0">Booking policies</h2>
        <p className="bb-muted m-0 text-sm">
          How far ahead clients can book, and how requests are held. Day hours and status stay in
          Availability Studio.
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
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Hold mode</span>
          <select
            value={rules.holdMode || 'pending_confirmed'}
            onChange={(event) => updateAvailabilityRules({ holdMode: event.target.value })}
          >
            <option value="pending_confirmed">Pending until you confirm</option>
            <option value="pending_only">Stay pending</option>
            <option value="confirmed_only">Auto-confirm</option>
            <option value="confirmed">Confirmed</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Cancellation window</span>
          <input
            className="native-control-input px-4"
            placeholder="e.g. 24 hours"
            value={rules.cancellationWindow || ''}
            onChange={(event) =>
              updateAvailabilityRules({ cancellationWindow: event.target.value })
            }
          />
        </label>
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
