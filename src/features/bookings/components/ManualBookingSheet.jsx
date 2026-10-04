import { Button } from '../../../shared/ui/Button';
import { useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { getDaySlots } from '../../../utils/availability';
import { toDateKey } from '../../../utils/dates';
import { DateField } from '../../../shared/ui/DateField';
import {
  formatServiceSessionLabel,
  getServiceDurationMinutes
} from '../../../utils/services';
import { getServiceScheduleType } from '../../../utils/scheduleTypes';

export function ManualBookingSheet({ onClose }) {
  const { services, staff, bookings, addBooking, workspace } = useWorkspace();
  const [form, setForm] = useState({
    serviceId: services[0]?.id || '',
    staffId: '',
    date: toDateKey(new Date()),
    time: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    status: 'confirmed'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const service = services.find((item) => item.id === form.serviceId);
  const isSpot = getServiceScheduleType(service) === 'class_session';

  useEffect(() => {
    if (!isSpot || !service) return;
    setForm((prev) => ({
      ...prev,
      date: service.sessionStartDate || prev.date,
      time: service.sessionStartTime || prev.time
    }));
  }, [isSpot, service?.id, service?.sessionStartDate, service?.sessionStartTime]);

  const slots = useMemo(
    () =>
      isSpot
        ? []
        : getDaySlots({
            dateKey: form.date,
            bookings,
            serviceId: form.serviceId,
            openTime: workspace.availabilityRules?.businessOpenTime,
            closeTime: workspace.availabilityRules?.businessCloseTime,
            availabilityRules: workspace.availabilityRules,
            services,
            staff,
            staffId: form.staffId || undefined,
            staffAvailability: workspace.staffAvailability,
            ignoreAdvanceLimit: true
          }),
    [
      isSpot,
      form.date,
      form.serviceId,
      form.staffId,
      bookings,
      workspace.availabilityRules,
      workspace.staffAvailability,
      services,
      staff
    ]
  );

  const selectedStaff = staff.find((item) => item.id === form.staffId);
  const slotAvailable = isSpot ? Boolean(service?.sessionStartDate && service?.sessionStartTime)
    : slots.some((slot) => slot.available !== false && slot.time === form.time);
  const canSubmit = Boolean(service && form.date && form.time && slotAvailable && form.clientName.trim());

  const submit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true); setError('');
    try { await addBooking({
      serviceId: service.id,
      serviceName: service.name,
      scheduleType: service.scheduleType,
      staffId: selectedStaff?.id,
      staffName: selectedStaff?.name,
      date: form.date,
      dateKey: form.date,
      time: form.time,
      sessionEndDate: isSpot ? service.sessionEndDate || '' : '',
      sessionEndTime: isSpot ? service.sessionEndTime || '' : '',
      durationMinutes: getServiceDurationMinutes(service),
      clientName: form.clientName.trim(),
      clientEmail: form.clientEmail.trim(),
      clientPhone: form.clientPhone.trim(),
      status: form.status,
      paymentStatus: 'unpaid',
      source: 'manual'
    });
    onClose?.(); } catch (failure) { setError(failure.message || 'Could not save the booking.'); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/30 grid place-items-end md:place-items-center p-4">
      <div role="dialog" aria-modal="true" aria-label="Manual booking" className="bb-panel bb-manual-booking w-full max-w-lg p-5 grid gap-3 max-h-[90vh] overflow-auto">
        <h2 className="bb-page-title text-2xl m-0">Manual booking</h2>
        {error && <p role="alert" className="bb-pay-error">{error}</p>}
        <label className="bb-settings-field">Service<select
          value={form.serviceId}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, serviceId: event.target.value, time: '' }))
          }
        >
          {services.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select></label>
        <label className="bb-settings-field">Staff<select
          value={form.staffId}
          onChange={(event) => setForm((prev) => ({ ...prev, staffId: event.target.value, time: isSpot ? prev.time : '' }))}
        >
          <option value="">Any staff</option>
          {staff.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select></label>
        {isSpot ? (
          <p className="bb-muted m-0 text-sm">
            Spot programme · {formatServiceSessionLabel(service) || 'Session window'}
          </p>
        ) : (
          <>
            <DateField
              label="Date"
              value={form.date}
              onChange={(date) => setForm((prev) => ({ ...prev, date, time: '' }))}
            />
            <div className="flex flex-wrap gap-2">
              {slots.length === 0 ? (
                <p className="bb-muted m-0 text-sm" role="status">No open slots on this day. Choose another date or staff member.</p>
              ) : (
                slots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    aria-pressed={form.time === slot.time}
                    disabled={slot.available === false}
                    className={form.time === slot.time ? 'bb-primary-btn' : 'bb-ghost-btn'}
                    onClick={() => setForm((prev) => ({ ...prev, time: slot.time }))}
                  >
                    {slot.time}
                  </button>
                ))
              )}
            </div>
          </>
        )}
        <label className="bb-settings-field">Client name<input
          className="native-control-input px-4"
          placeholder="Client name"
          value={form.clientName}
          onChange={(event) => setForm((prev) => ({ ...prev, clientName: event.target.value }))}
        /></label>
        <label className="bb-settings-field">Email (optional)<input type="email"
          className="native-control-input px-4"
          placeholder="Email"
          value={form.clientEmail}
          onChange={(event) => setForm((prev) => ({ ...prev, clientEmail: event.target.value }))}
        /></label>
        <label className="bb-settings-field">Phone (optional)<input type="tel"
          className="native-control-input px-4"
          placeholder="Phone"
          value={form.clientPhone}
          onChange={(event) => setForm((prev) => ({ ...prev, clientPhone: event.target.value }))}
        /></label>
        <label className="bb-settings-field">Booking status<select
          value={form.status}
          onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
        >
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
        </select></label>
        {!canSubmit && <p className="bb-muted m-0 text-sm" id="manual-booking-requirements">Select an available time and enter the client's name to create a booking.</p>}
        <div className="flex gap-2 justify-end">
          <Button action="cancel" variant="secondary" type="button" className="bb-ghost-btn" onClick={onClose}>
            Cancel
          </Button>
          <Button action="book" variant="primary" type="button" className="bb-primary-btn" disabled={!canSubmit} busy={saving} busyLabel="Creating…" aria-describedby={!canSubmit ? 'manual-booking-requirements' : undefined} onClick={submit}>
            Create booking
          </Button>
        </div>
      </div>
    </div>
  );
}
