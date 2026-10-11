import { useId } from 'react';

export function BookingModeSettings({ rules = {}, onChange }) {
  const id = useId();
  const mode = rules.scheduleMode || 'time_slots';
  return <fieldset className="bb-booking-mode-settings grid gap-3 min-w-0 border-0 p-0 m-0">
    <legend className="text-sm font-semibold mb-2">How clients request appointments</legend>
    {[
      ['time_slots', 'Choose an available time', 'Clients select a time from your availability, then you confirm the request.'],
      ['first_come', 'First come, first served', 'Clients join your request queue without choosing a date or time. Accept, decline or arrange a time from Bookings. No availability or staff shifts required.']
    ].map(([value, label, hint]) => <label key={value} className="bb-panel p-3 flex items-start gap-3 cursor-pointer">
      <input type="radio" name={`${id}-booking-mode`} value={value} checked={mode === value} onChange={() => onChange?.({ scheduleMode: value })} className="mt-1" />
      <span className="grid gap-1 min-w-0"><strong className="text-sm">{label}</strong><span className="bb-muted text-sm">{hint}</span></span>
    </label>)}
    <p className="bb-muted text-sm m-0">Applies to Slots that use availability. Fixed Spots keep their session times and seat limits. Services marked “Arrange with the client” or “To be announced” keep their conversation flow. Existing bookings retain their original mode.</p>
  </fieldset>;
}
