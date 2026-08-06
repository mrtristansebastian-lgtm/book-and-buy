import { useMemo, useState } from 'react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { formatServiceDuration, formatServicePrice } from '../../../utils/services';
import { getDaySlots } from '../../../utils/availability';
import { buildMonthGrid, formatDisplayDate, toDateKey } from '../../../utils/dates';
import { getScheduleTypeMeta } from '../../../utils/scheduleTypes';

const STEPS = ['service', 'datetime', 'details', 'done'];

export function PublicBookingFlow({ workspaceName, hideTitle = false, preview = false }) {
  const { services, bookings, addBooking, workspace } = useWorkspace();
  const activeServices = services.filter((service) => service.active !== false);
  const [step, setStep] = useState('service');
  const [serviceId, setServiceId] = useState('');
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [dateKey, setDateKey] = useState('');
  const [time, setTime] = useState('');
  const [details, setDetails] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientNote: ''
  });
  const [created, setCreated] = useState(null);

  const service = activeServices.find((item) => item.id === serviceId);
  const monthDays = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor]);
  const slots = useMemo(
    () =>
      getDaySlots({
        dateKey,
        bookings,
        serviceId,
        openTime: workspace.availabilityRules?.businessOpenTime,
        closeTime: workspace.availabilityRules?.businessCloseTime
      }),
    [dateKey, bookings, serviceId, workspace.availabilityRules]
  );

  const submit = () => {
    if (!service || !dateKey || !time || !details.clientName.trim()) return;
    const booking = addBooking({
      serviceId: service.id,
      serviceName: service.name,
      scheduleType: service.scheduleType,
      date: dateKey,
      dateKey,
      time,
      clientName: details.clientName.trim(),
      clientEmail: details.clientEmail.trim(),
      clientPhone: details.clientPhone.trim(),
      clientNote: details.clientNote.trim(),
      status: 'pending',
      paymentStatus: 'unpaid',
      source: 'public',
      workspaceSlug: workspace.slug,
      workspaceName: workspaceName || workspace.brandName
    });
    setCreated(booking);
    setStep('done');
  };

  const stepIndex = STEPS.indexOf(step) + 1;
  const stepTotal = STEPS.length - 1;

  if (step === 'done' && created) {
    return (
      <section className="bb-public-gutter py-10">
        <div className="bb-public-measure grid gap-4">
          <h1 className="bb-page-title text-4xl m-0">Request sent</h1>
          <p className="bb-muted m-0">
            {created.serviceName} on {formatDisplayDate(created.dateKey)} at {created.time}.{' '}
            {workspaceName || 'The business'} will review and confirm.
          </p>
          <button
            type="button"
            className="bb-primary-btn justify-self-start"
            onClick={() => {
              setStep('service');
              setServiceId('');
              setDateKey('');
              setTime('');
              setDetails({ clientName: '', clientEmail: '', clientPhone: '', clientNote: '' });
              setCreated(null);
            }}
          >
            Book another
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`bb-public-gutter py-7 ${preview ? 'pointer-events-none' : ''}`}
    >
      <div className="bb-public-measure-wide grid gap-6">
        {hideTitle ? (
          <p className="bb-public-progress">
            Step {stepIndex} of {stepTotal}
          </p>
        ) : (
          <header className="grid gap-2">
            <h1 className="bb-page-title text-4xl m-0">Book</h1>
            <p className="bb-public-progress">
              Step {stepIndex} of {stepTotal} · Choose a service, pick a time, send your request.
            </p>
          </header>
        )}

      {step === 'service' ? (
        <div className="grid gap-4">
          <div className="bb-public-service-list">
            {activeServices.map((item) => {
              const meta = getScheduleTypeMeta(item.scheduleType);
              return (
                <button
                  key={item.id}
                  type="button"
                  className="bb-public-service-row"
                  aria-pressed={serviceId === item.id}
                  onClick={() => setServiceId(item.id)}
                >
                  <div className="bb-public-service-media">
                    {item.imageUrls?.[0] ? (
                      <img src={item.imageUrls[0]} alt="" />
                    ) : null}
                  </div>
                  <div className="bb-public-service-copy">
                    <p className="bb-public-service-meta">{meta.singular}</p>
                    <strong>{item.name}</strong>
                    <p className="bb-public-service-desc">{item.description}</p>
                    <p className="bb-public-service-price md:hidden">
                      {[formatServicePrice(item), formatServiceDuration(item.duration)]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <p className="bb-public-service-price hidden md:block">
                    {[formatServicePrice(item), formatServiceDuration(item.duration)]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="bb-primary-btn justify-self-start"
            disabled={!serviceId}
            onClick={() => setStep('datetime')}
          >
            Continue
          </button>
        </div>
      ) : null}

      {step === 'datetime' ? (
        <div className="grid gap-5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="bb-ghost-btn"
              onClick={() => setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            >
              Prev
            </button>
            <strong>
              {monthAnchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </strong>
            <button
              type="button"
              className="bb-ghost-btn"
              onClick={() => setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            >
              Next
            </button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((day) => {
              const key = toDateKey(day);
              const inMonth = day.getMonth() === monthAnchor.getMonth();
              const available =
                key >= toDateKey(new Date()) &&
                getDaySlots({ dateKey: key, bookings, serviceId }).length > 0;
              return (
                <button
                  key={key + String(day)}
                  type="button"
                  disabled={!available}
                  className={`rounded-xl py-3 text-sm font-semibold ${
                    dateKey === key
                      ? 'bb-primary-btn'
                      : available
                        ? 'bb-ghost-btn'
                        : 'opacity-35 bg-transparent border-0'
                  } ${inMonth ? '' : 'opacity-40'}`}
                  onClick={() => {
                    setDateKey(key);
                    setTime('');
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          {dateKey ? (
            <div className="grid gap-2">
              <h2 className="bb-page-title text-xl m-0">Times on {formatDisplayDate(dateKey)}</h2>
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    className={time === slot.time ? 'bb-primary-btn' : 'bb-ghost-btn'}
                    onClick={() => setTime(slot.time)}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="bb-ghost-btn" onClick={() => setStep('service')}>
              Back
            </button>
            <button
              type="button"
              className="bb-primary-btn"
              disabled={!dateKey || !time}
              onClick={() => setStep('details')}
            >
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {step === 'details' ? (
        <div className="grid gap-3 max-w-lg">
          <p className="m-0 text-sm font-semibold">
            {service?.name} · {formatDisplayDate(dateKey)} · {time}
          </p>
          <input
            className="native-control-input px-4"
            placeholder="Your name"
            value={details.clientName}
            onChange={(event) => setDetails((prev) => ({ ...prev, clientName: event.target.value }))}
          />
          <input
            className="native-control-input px-4"
            placeholder="Email"
            value={details.clientEmail}
            onChange={(event) => setDetails((prev) => ({ ...prev, clientEmail: event.target.value }))}
          />
          <input
            className="native-control-input px-4"
            placeholder="Phone"
            value={details.clientPhone}
            onChange={(event) => setDetails((prev) => ({ ...prev, clientPhone: event.target.value }))}
          />
          <textarea
            className="native-control-input px-4 py-3"
            rows={3}
            placeholder="Note (optional)"
            value={details.clientNote}
            onChange={(event) => setDetails((prev) => ({ ...prev, clientNote: event.target.value }))}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="bb-ghost-btn" onClick={() => setStep('datetime')}>
              Back
            </button>
            <button
              type="button"
              className="bb-primary-btn"
              disabled={!details.clientName.trim()}
              onClick={submit}
            >
              Request booking
            </button>
          </div>
        </div>
      ) : null}
      </div>
    </section>
  );
}
