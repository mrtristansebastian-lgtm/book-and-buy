import { Check, RefreshCw } from 'lucide-react';

const GoogleCalendarIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path fill="#fff" d="M10 7h28a3 3 0 0 1 3 3v28a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3z" />
    <path fill="#1a73e8" d="M10 7h28a3 3 0 0 1 3 3v8H7v-8a3 3 0 0 1 3-3z" />
    <path fill="#34a853" d="M7 18h8v23h-5a3 3 0 0 1-3-3V18z" />
    <path fill="#fbbc04" d="M33 18h8v20a3 3 0 0 1-3 3h-5V18z" />
    <path fill="#ea4335" d="M15 33h18v8H15z" />
    <path fill="#e8eaed" d="M15 18h18v15H15z" />
    <path fill="#fff" d="M16 19h16v13H16z" />
    <path fill="#1a73e8" d="M20.3 28.9c1.2 0 1.9-.6 1.9-1.5 0-.9-.7-1.4-1.9-1.4h-1v-1.8h.9c1 0 1.7-.5 1.7-1.3 0-.8-.6-1.2-1.5-1.2-.9 0-1.6.4-2.2 1.1l-1.3-1.3c.9-1 2-1.6 3.7-1.6 2.2 0 3.7 1 3.7 2.7 0 1.1-.6 1.9-1.7 2.3v.1c1.2.3 2.1 1.2 2.1 2.6 0 1.9-1.7 3.1-4.2 3.1-1.8 0-3.1-.6-4-1.6l1.3-1.4c.7.8 1.5 1.2 2.5 1.2zm8.5 1.6h-2.4v-7.8l-2.1 1.3v-2.1l2.5-1.6h2v10.2z" />
  </svg>
);

export const ScheduleTopBar = ({
  googleCalendarState = {},
  googleSyncCount = 0,
  onConnectGoogleCalendar,
  onSave,
  onSyncGoogleCalendar,
  selectedCalendarId
}) => {
  const connected = Boolean(googleCalendarState.connected);
  const label = connected ? 'Connected' : googleCalendarState.email ? 'Reconnect' : 'Connect';

  return (
    <div className="schedule-top-bar">
      <div className="schedule-google-state">
        <span className={`schedule-google-mark ${connected ? 'is-connected' : ''}`}>
          <GoogleCalendarIcon />
        </span>
        <div>
          <p>Google Calendar</p>
          <strong>{connected ? (googleCalendarState.email || 'Connected') : 'Sync confirmed bookings when ready'}</strong>
        </div>
      </div>
      <div className="schedule-top-actions">
        <button type="button" onClick={() => onConnectGoogleCalendar?.()}>
          <GoogleCalendarIcon size={15} />
          {label}
        </button>
        <button type="button" onClick={() => onSyncGoogleCalendar?.(selectedCalendarId)} disabled={googleCalendarState.syncing}>
          <RefreshCw size={15} className={googleCalendarState.syncing ? 'animate-spin' : ''} />
          {googleCalendarState.syncing ? 'Syncing' : `Sync ${googleSyncCount}`}
        </button>
        <button type="button" className="is-primary" onClick={onSave}>
          <Check size={15} />
          Save
        </button>
      </div>
    </div>
  );
};
