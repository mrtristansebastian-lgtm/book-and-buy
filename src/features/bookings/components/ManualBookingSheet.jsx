import { useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { getDaySlots } from '../../../utils/availability';
import { toDateKey } from '../../../utils/dates';
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
            staffAvailability: workspace.staffAvailability
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

  const submit = () => {
    if (!service || !form.date || !form.time || !form.clientName.trim()) return;
    addBooking({
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
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/30 grid place-items-end md:place-items-center p-4">
      <div className="bb-panel w-full max-w-lg p-5 grid gap-3 max-h-[90vh] overflow-auto">
        <h2 className="bb-page-title text-2xl m-0">Manual booking</h2>
        <select
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
        </select>
        <select
          value={form.staffId}
          onChange={(event) => setForm((prev) => ({ ...prev, staffId: event.target.value }))}
        >
          <option value="">Any staff</option>
          {staff.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        {isSpot ? (
          <p className="bb-muted m-0 text-sm">
            Spot programme · {formatServiceSessionLabel(service) || 'Session window'}
          </p>
        ) : (
          <>
            <input
              type="date"
              className="native-control-input px-4"
              value={form.date}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, date: event.target.value, time: '' }))
              }
            />
            <div className="flex flex-wrap gap-2">
              {slots.length === 0 ? (
                <p className="bb-muted m-0 text-sm">No open slots on this day.</p>
              ) : (
                slots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
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
        <input
          className="native-control-input px-4"
          placeholder="Client name"
          value={form.clientName}
          onChange={(event) => setForm((prev) => ({ ...prev, clientName: event.target.value }))}
        />
        <input
          className="native-control-input px-4"
          placeholder="Email"
          value={form.clientEmail}
          onChange={(event) => setForm((prev) => ({ ...prev, clientEmail: event.target.value }))}
        />
        <input
          className="native-control-input px-4"
          placeholder="Phone"
          value={form.clientPhone}
          onChange={(event) => setForm((prev) => ({ ...prev, clientPhone: event.target.value }))}
        />
        <select
          value={form.status}
          onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
        >
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
        </select>
        <div className="flex gap-2 justify-end">
          <button type="button" className="bb-ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="bb-primary-btn" onClick={submit}>
            Create booking
          </button>
        </div>
      </div>
    </div>
  );
}
