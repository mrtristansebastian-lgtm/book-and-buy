import { DateField } from '../../../shared/ui/DateField';
import { TimeField } from '../../../shared/ui/TimeField';
import { getServiceTimingMode, serviceTimingOptions } from '../../../../functions/serviceTiming';

export function ServiceEditorWhenStep({ draft, patch, availabilityRules = {} }) {
  const mode = getServiceTimingMode(draft);
  const firstCome = availabilityRules.scheduleMode === 'first_come';
  return (
    <section className="bb-services-section">
      <h3 className="bb-services-section-title">When</h3>
      <p className="bb-services-section-lede">
        Choose how you and your clients will decide when this service happens.
      </p>
      <div className="bb-services-fields">
        <fieldset className="bb-service-timing-options">
          <legend className="sr-only">How is the time decided?</legend>
          {serviceTimingOptions(draft).map(option => <label key={option.id} className={`bb-service-timing-choice${mode === option.id ? ' is-selected' : ''}`}>
            <input type="radio" name="service-timing" value={option.id} checked={mode === option.id} onChange={() => patch({ timingMode: option.id })} />
            <span><strong>{firstCome && option.id === 'availability' ? 'First come, first served' : option.label}</strong><small>{firstCome && option.id === 'availability' ? 'Clients submit a request without choosing a time. You manage the queue in Bookings.' : option.description}</small></span>
          </label>)}
        </fieldset>
        {mode === 'fixed' && <>
        <p className="bb-services-section-lede">Clients reserve a seat for these dates and times.</p>
        <div className="bb-services-field-row bb-services-field-row--2">
          <div className="bb-services-field">
            <DateField
              label="Start date"
              value={draft.sessionStartDate || ''}
              onChange={(sessionStartDate) => {
                patch({
                  sessionStartDate,
                  sessionEndDate:
                    !draft.sessionEndDate || draft.sessionEndDate < sessionStartDate
                      ? sessionStartDate
                      : draft.sessionEndDate
                });
              }}
            />
          </div>
          <div className="bb-services-field">
            <TimeField
              label="Start time"
              value={draft.sessionStartTime || ''}
              onChange={(next) => patch({ sessionStartTime: next })}
            />
          </div>
        </div>
        <div className="bb-services-field-row bb-services-field-row--2">
          <div className="bb-services-field">
            <DateField
              label="End date"
              value={draft.sessionEndDate || ''}
              min={draft.sessionStartDate || undefined}
              onChange={(sessionEndDate) => patch({ sessionEndDate })}
            />
          </div>
          <div className="bb-services-field">
            <TimeField
              label="End time"
              value={draft.sessionEndTime || ''}
              onChange={(next) => patch({ sessionEndTime: next })}
            />
          </div>
        </div>
        </>}
        {mode === 'availability' && <p className="bb-services-section-lede">{firstCome ? 'Set the duration next. No availability is required. Change the business-wide mode in Bookings settings or Availability settings.' : 'Set the duration next. Available times come from Schedule and your assigned team. You can switch to first come, first served in Bookings settings or Availability settings.'}</p>}
        {mode === 'arranged' && <p className="bb-services-section-lede">Clients message you to agree the timing. No date or payment is requested until you set a bookable schedule.</p>}
        {mode === 'to_be_announced' && <p className="bb-services-section-lede">Clients can message about upcoming dates. Set fixed dates or enable available times when you are ready to accept bookings.</p>}
        <label className="bb-services-field"><span className="bb-services-field-label">Timing details (optional)</span>
          <textarea className="bb-input" rows={3} maxLength={600} value={draft.timingNotes || ''} placeholder="For example: weekly sessions arranged together, or new dates announced each month."
            onChange={event => patch({ timingNotes: event.target.value })} />
          <small className="bb-muted">Shown to clients on the service page.</small>
        </label>
      </div>
    </section>
  );
}
