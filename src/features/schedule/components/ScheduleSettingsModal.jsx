import { useEffect, useState } from 'react';
import { Bell, Bookmark, CalendarCheck, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Info, ListChecks, Pencil, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { getLocalDateStr } from '../../../utils/dates';

const scheduleWizardSteps = [
  { id: 'defaults', label: 'Slots', title: 'Set up available time slots', helper: 'Choose the booking method and times clients can book from this schedule.' },
  { id: 'apply', label: 'Time period', title: 'Time period', helper: 'Choose the day or date range this schedule should apply to.' },
  { id: 'rules', label: 'Rules', title: 'Booking rules', helper: 'Control notice, cancellations, waitlists, and availability holds.' },
  { id: 'templates', label: 'Templates', title: 'Saved schedule templates', helper: 'Save reusable schedule setups and apply them when the business runs different hours.' },
  { id: 'review', label: 'Review', title: 'Review and save', helper: 'Confirm the setup before saving schedule settings.' }
];

const bookingNoticeOptions = [
  { value: '', label: 'No minimum notice' },
  { value: '1 hour', label: '1 hour' },
  { value: '2 hours', label: '2 hours' },
  { value: '4 hours', label: '4 hours' },
  { value: '12 hours', label: '12 hours' },
  { value: '24 hours', label: '24 hours' },
  { value: '48 hours', label: '48 hours' },
  { value: '7 days', label: '7 days' }
];

const advanceBookingOptions = [
  { value: '', label: 'No limit' },
  { value: '7 days', label: '7 days' },
  { value: '14 days', label: '14 days' },
  { value: '30 days', label: '30 days' },
  { value: '60 days', label: '60 days' },
  { value: '90 days', label: '90 days' },
  { value: '6 months', label: '6 months' },
  { value: '12 months', label: '12 months' }
];

const cancellationWindowOptions = [
  { value: '', label: 'No cancellation window' },
  { value: '1 hour', label: '1 hour' },
  { value: '2 hours', label: '2 hours' },
  { value: '4 hours', label: '4 hours' },
  { value: '12 hours', label: '12 hours' },
  { value: '24 hours', label: '24 hours' },
  { value: '48 hours', label: '48 hours' },
  { value: '7 days', label: '7 days' }
];

export const ScheduleSettingsModal = ({
  applyScope,
  availabilityRules = {},
  defaultSlots,
  isOpen,
  onAddSlot,
  onApplyDefaults,
  onChangeApplyScope,
  onClose,
  onDeleteSlot,
  onDeleteScheduleTemplate,
  onEditSlot,
  onApplyScheduleTemplate,
  onSaveScheduleTemplate,
  onSelectDate,
  onUpdateAvailabilityRules,
  onSaveAvailabilitySettings,
  onSaveDefaults,
  onToggleWaitlist,
  launchMode = false,
  launcherSkin = false,
  scheduleTemplates = [],
  selectedDate,
  selectedCalendarName,
  waitlistEnabled
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [customRange, setCustomRange] = useState({ startDate: '', endDate: '' });
  const [templateDraft, setTemplateDraft] = useState({ name: '', description: '' });
  const [rangePicker, setRangePicker] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0);
      setCustomRange({ startDate: '', endDate: '' });
      setTemplateDraft({ name: '', description: '' });
      setRangePicker(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const normalizedAvailabilityRules = {
    enabled: true,
    scheduleMode: ['time_slots', 'first_come'].includes(availabilityRules.scheduleMode)
      ? availabilityRules.scheduleMode
      : 'time_slots',
    holdMode: ['pending_confirmed', 'pending_only', 'confirmed_only'].includes(availabilityRules.holdMode)
      ? availabilityRules.holdMode
      : 'pending_confirmed',
    bookingNotice: String(availabilityRules.bookingNotice || '').trim(),
    maxAdvanceBooking: String(availabilityRules.maxAdvanceBooking || '').trim(),
    cancellationWindow: String(availabilityRules.cancellationWindow || '').trim(),
    reschedulingAllowed: availabilityRules.reschedulingAllowed !== false
  };
  const currentStep = scheduleWizardSteps[stepIndex] || scheduleWizardSteps[0];
  const canGoBack = stepIndex > 0;
  const isLastStep = stepIndex === scheduleWizardSteps.length - 1;
  const holdModeLabels = {
    pending_confirmed: 'Pending + confirmed',
    pending_only: 'Pending only',
    confirmed_only: 'Confirmed only'
  };
  const scopeLabels = {
    day: 'Selected day',
    week: 'This week',
    month: 'This month',
    always: 'Always',
    custom: 'Custom period'
  };

  const rangePayload = applyScope === 'custom'
    ? {
      startDate: customRange.startDate || selectedDate,
      endDate: customRange.endDate || customRange.startDate || selectedDate
    }
    : {};
  const formatRangeDate = (dateStr) => (
    dateStr
      ? new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Choose day'
  );
  const openRangePicker = (field) => {
    const dateStr = field === 'selectedDate' ? selectedDate : (customRange[field] || selectedDate);
    setRangePicker({ field, month: new Date(`${dateStr}T00:00:00`) });
  };
  const rangePickerMonthLabel = rangePicker?.month?.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const rangePickerDays = rangePicker ? (() => {
    const firstDay = new Date(rangePicker.month.getFullYear(), rangePicker.month.getMonth(), 1);
    const lastDay = new Date(rangePicker.month.getFullYear(), rangePicker.month.getMonth() + 1, 0);
    const leadingDays = (firstDay.getDay() + 6) % 7;
    return [
      ...Array.from({ length: leadingDays }, (_, index) => ({ key: `empty-${index}`, empty: true })),
      ...Array.from({ length: lastDay.getDate() }, (_, index) => {
        const date = new Date(rangePicker.month.getFullYear(), rangePicker.month.getMonth(), index + 1);
        return { key: getLocalDateStr(date), date, dateStr: getLocalDateStr(date), empty: false };
      })
    ];
  })() : [];
  const selectRangeDate = (dateStr) => {
    if (rangePicker.field === 'selectedDate') {
      onSelectDate?.(dateStr);
      setRangePicker(null);
      return;
    }
    setCustomRange(prev => {
      const next = { ...prev, [rangePicker.field]: dateStr };
      if (rangePicker.field === 'startDate' && next.endDate && next.endDate < dateStr) next.endDate = dateStr;
      if (rangePicker.field === 'endDate' && (next.startDate || selectedDate) > dateStr) next.startDate = dateStr;
      return next;
    });
    setRangePicker(null);
  };
  const saveTemplateDraft = () => {
    const saved = onSaveScheduleTemplate?.(templateDraft);
    if (saved !== false) setTemplateDraft({ name: '', description: '' });
  };
  const nextStep = () => setStepIndex(index => Math.min(index + 1, scheduleWizardSteps.length - 1));
  const prevStep = () => setStepIndex(index => Math.max(index - 1, 0));

  const renderDefaultSlotsStep = () => (
    <div className="schedule-settings-wizard-grid">
      <section className="schedule-settings-card schedule-time-slots-card is-wide">
        <div className="schedule-settings-card-head">
          <span><Clock size={15} /></span>
          <div>
            <strong>{normalizedAvailabilityRules.scheduleMode === 'first_come' ? 'First come, first served' : 'Available time slots'}</strong>
            <small>{normalizedAvailabilityRules.scheduleMode === 'first_come' ? 'Let clients choose an arrival time without reserving an exact slot.' : `${defaultSlots.length} times ready for clients to choose from.`}</small>
          </div>
        </div>
        <div className="schedule-settings-option-list is-schedule-mode">
          {[
            { id: 'time_slots', label: 'Bookable time slots', copy: 'Clients choose an exact available time.' },
            { id: 'first_come', label: 'First come, first served', copy: 'Clients choose a time for arrival planning, not a reserved slot.' }
          ].map(option => (
            <button
              key={option.id}
              type="button"
              className={normalizedAvailabilityRules.scheduleMode === option.id ? 'is-active' : ''}
              onClick={() => onUpdateAvailabilityRules?.({ scheduleMode: option.id })}
              aria-pressed={normalizedAvailabilityRules.scheduleMode === option.id}
            >
              <span>{normalizedAvailabilityRules.scheduleMode === option.id && <Check size={13} />}</span>
              <strong>{option.label}</strong>
              <small>{option.copy}</small>
            </button>
          ))}
        </div>
        {normalizedAvailabilityRules.scheduleMode !== 'first_come' && (
          <div className="schedule-time-slots-board">
            <div className="schedule-time-slots-summary">
              <span>{defaultSlots.length}</span>
              <div>
                <strong>Bookable times</strong>
                <small>Edit individual times or add another opening.</small>
              </div>
            </div>
            <div className="schedule-slot-bubble-grid" aria-label="Available time slots">
              {defaultSlots.map(slot => (
                <div key={slot} className="schedule-slot-bubble">
                  <span>{slot}</span>
                  <button type="button" onClick={() => onEditSlot?.(slot)} aria-label={`Edit ${slot}`}>
                    <Pencil size={13} />
                  </button>
                  <button type="button" onClick={() => onDeleteSlot(slot)} aria-label={`Delete ${slot}`}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button type="button" className="schedule-slot-bubble is-add" onClick={() => onAddSlot?.()} aria-label="Add slot">
                <Plus size={16} />
                <span>Add time</span>
              </button>
            </div>
          </div>
        )}
      </section>
      <div className="schedule-settings-note is-wide">
        <Info size={15} />
        <span>{normalizedAvailabilityRules.scheduleMode === 'first_come' ? 'In first come, first served mode, clients do not reserve a fixed time slot. The booking page can collect an optional arrival heads-up during checkout.' : 'You will be able to assign these time slots to a set period in the next step and save them as a template as well.'}</span>
      </div>
    </div>
  );

  const renderTemplatesStep = () => (
    <div className="schedule-settings-wizard-grid">
      <section className="schedule-settings-card is-wide">
        <div className="schedule-settings-card-head">
          <span><Bookmark size={15} /></span>
          <div>
            <strong>Save current setup</strong>
            <small>Capture the current slots, waitlist setting, booking rules, and service periods as a reusable template.</small>
          </div>
        </div>
        <div className="schedule-template-form">
          <label className="schedule-settings-field">
            <span>Template name</span>
            <input
              type="text"
              value={templateDraft.name}
              onChange={event => setTemplateDraft(prev => ({ ...prev, name: event.target.value }))}
              placeholder="Weekend hours, Holiday hours, Summer schedule..."
            />
          </label>
          <label className="schedule-settings-field">
            <span>Description</span>
            <input
              type="text"
              value={templateDraft.description}
              onChange={event => setTemplateDraft(prev => ({ ...prev, description: event.target.value }))}
              placeholder={`${defaultSlots.length} slots, ${waitlistEnabled ? 'waitlist on' : 'waitlist off'}`}
            />
          </label>
        </div>
        <div className="schedule-settings-actions is-service-periods">
          <button type="button" className="is-primary" onClick={saveTemplateDraft}>
            <Save size={15} />
            Save template
          </button>
        </div>
      </section>

      <section className="schedule-settings-card is-wide">
        <div className="schedule-settings-card-head">
          <span><ListChecks size={15} /></span>
          <div>
            <strong>{scheduleTemplates.length} saved templates</strong>
            <small>Apply a template to update the default slots and business schedule rules.</small>
          </div>
        </div>
        {scheduleTemplates.length > 0 ? (
          <div className="schedule-template-list">
            {scheduleTemplates.map(template => (
              <div key={template.id} className="schedule-template-row">
                <div>
                  <strong>{template.name}</strong>
                  <small>{template.description || `${template.defaultTimes.length} slots, ${template.waitlistEnabled ? 'waitlist on' : 'waitlist off'}`}</small>
                  <span>
                    {template.defaultTimes.slice(0, 4).join(', ')}
                    {template.defaultTimes.length > 4 ? ` +${template.defaultTimes.length - 4}` : ''}
                  </span>
                </div>
                <div>
                  <button type="button" className="is-primary" onClick={() => onApplyScheduleTemplate?.(template.id)}>
                    <Check size={14} />
                    Apply
                  </button>
                  <button type="button" className="is-danger" onClick={() => onDeleteScheduleTemplate?.(template.id)} aria-label={`Delete ${template.name}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="schedule-empty-state">
            <strong>No templates yet</strong>
            <small>Save the current setup to make your first reusable schedule template.</small>
          </div>
        )}
      </section>
    </div>
  );

  const renderApplyStep = () => (
    <div className="schedule-settings-wizard-grid">
      <section className="schedule-settings-card is-wide">
        <div className="schedule-settings-card-head">
          <span><CalendarDays size={15} /></span>
          <div>
            <strong>Where should these slots apply?</strong>
            <small>Push the default slots to a day, week, month, all future days, or a custom period.</small>
          </div>
        </div>
        <div className="schedule-settings-option-list is-compact">
          {[
            { id: 'day', label: 'Selected day', copy: `Only ${formatRangeDate(selectedDate)}.` },
            { id: 'week', label: 'This week', copy: 'Apply to the visible business week.' },
            { id: 'month', label: 'This month', copy: 'Apply to the selected month.' },
            { id: 'always', label: 'Always', copy: 'Update the reusable business defaults.' },
            { id: 'custom', label: 'Custom period', copy: 'Choose a date range for temporary hours.' }
          ].map(option => (
            <button
              key={option.id}
              type="button"
              className={applyScope === option.id ? 'is-active' : ''}
              onClick={() => onChangeApplyScope(option.id)}
              aria-pressed={applyScope === option.id}
            >
              <span>{applyScope === option.id && <Check size={13} />}</span>
              <strong>{option.label}</strong>
              <small>{option.copy}</small>
            </button>
          ))}
        </div>
        {applyScope === 'day' && (
          <div className="schedule-custom-range is-single">
            <label>
              <span>Selected day</span>
              <button type="button" onClick={() => openRangePicker('selectedDate')}>
                <CalendarCheck size={14} />
                {formatRangeDate(selectedDate)}
              </button>
            </label>
          </div>
        )}
        {applyScope === 'custom' && (
          <div className="schedule-custom-range">
            <label>
              <span>From</span>
              <button type="button" onClick={() => openRangePicker('startDate')}>
                <CalendarCheck size={14} />
                {formatRangeDate(customRange.startDate || selectedDate)}
              </button>
            </label>
            <label>
              <span>Until</span>
              <button type="button" onClick={() => openRangePicker('endDate')}>
                <CalendarCheck size={14} />
                {formatRangeDate(customRange.endDate || customRange.startDate || selectedDate)}
              </button>
            </label>
          </div>
        )}
      </section>
      {!launchMode && (
        <div className="schedule-settings-actions is-wide">
          <button type="button" className="is-primary" onClick={onSaveDefaults}>
            <Save size={15} />
            Save default slots
          </button>
          <button type="button" onClick={() => onApplyDefaults(applyScope, rangePayload)}>
            <CalendarCheck size={15} />
            Apply to {scopeLabels[applyScope] || 'schedule'}
          </button>
        </div>
      )}
    </div>
  );

  const renderRuleToggle = ({ keyName, label, copy }) => (
    <button
      key={keyName}
      type="button"
      className={`schedule-rule-toggle ${normalizedAvailabilityRules[keyName] ? 'is-active' : ''}`}
      onClick={() => onUpdateAvailabilityRules?.({ [keyName]: !normalizedAvailabilityRules[keyName] })}
      aria-pressed={normalizedAvailabilityRules[keyName]}
    >
      <span>{normalizedAvailabilityRules[keyName] && <Check size={13} />}</span>
      <strong>{label}</strong>
      <small>{copy}</small>
    </button>
  );

  const renderRulesStep = () => (
    <div className="schedule-settings-wizard-grid schedule-rules-grid">
      <section className="schedule-settings-card schedule-rules-primary-card">
        <div className="schedule-settings-card-head">
          <span><Bell size={15} /></span>
          <div>
            <strong>Booking windows</strong>
            <small>Set when clients can book and which statuses hold a slot.</small>
          </div>
        </div>
        <div className="schedule-rules-field-grid">
          <label className="schedule-settings-field">
            <span>Minimum notice</span>
            <select
              value={normalizedAvailabilityRules.bookingNotice}
              onChange={event => onUpdateAvailabilityRules?.({ bookingNotice: event.target.value })}
            >
              {bookingNoticeOptions.map(option => <option key={option.value || 'none'} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="schedule-settings-field">
            <span>Book ahead</span>
            <select
              value={normalizedAvailabilityRules.maxAdvanceBooking}
              onChange={event => onUpdateAvailabilityRules?.({ maxAdvanceBooking: event.target.value })}
            >
              {advanceBookingOptions.map(option => <option key={option.value || 'none'} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="schedule-settings-field">
            <span>Cancellation window</span>
            <select
              value={normalizedAvailabilityRules.cancellationWindow}
              onChange={event => onUpdateAvailabilityRules?.({ cancellationWindow: event.target.value })}
            >
              {cancellationWindowOptions.map(option => <option key={option.value || 'none'} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="schedule-settings-field">
            <span>Held by</span>
            <select
              value={normalizedAvailabilityRules.holdMode}
              onChange={event => onUpdateAvailabilityRules?.({ holdMode: event.target.value })}
            >
              <option value="pending_confirmed">Pending + confirmed</option>
              <option value="pending_only">Pending only</option>
              <option value="confirmed_only">Confirmed only</option>
            </select>
          </label>
        </div>
        <div className="schedule-rules-client-inline">
          <div className="schedule-rules-inline-label">
            <span><RotateCcw size={14} /> Client controls</span>
            <small>Choose what clients can do when availability is tight.</small>
          </div>
          <div className="schedule-rule-toggle-grid is-horizontal">
            {renderRuleToggle({
              keyName: 'reschedulingAllowed',
              label: 'Rescheduling allowed',
              copy: 'Clients can move bookings within rules.'
            })}
            <button
              type="button"
              className={`schedule-rule-toggle ${waitlistEnabled ? 'is-active' : ''}`}
              onClick={onToggleWaitlist}
              aria-pressed={waitlistEnabled}
            >
              <span>{waitlistEnabled && <Check size={13} />}</span>
              <strong>Waitlist when full</strong>
              <small>Clients can join when no times are open.</small>
            </button>
          </div>
        </div>
      </section>
    </div>
  );

  const renderReviewStep = () => (
    <div className="schedule-settings-wizard-grid">
      <section className="schedule-settings-review-card">
        <span><Clock size={16} /></span>
        <strong>{defaultSlots.length} default slots</strong>
        <small>{defaultSlots.length ? `${defaultSlots.slice(0, 4).join(', ')}${defaultSlots.length > 4 ? ` +${defaultSlots.length - 4}` : ''}` : 'No default slots yet'}</small>
      </section>
      <section className="schedule-settings-review-card">
        <span><CalendarCheck size={16} /></span>
        <strong>{scopeLabels[applyScope] || 'Selected day'}</strong>
        <small>{applyScope === 'custom' ? `${formatRangeDate(rangePayload.startDate)} - ${formatRangeDate(rangePayload.endDate)}` : 'Default apply target'}</small>
      </section>
      <section className="schedule-settings-review-card">
        <span><Bell size={16} /></span>
        <strong>{holdModeLabels[normalizedAvailabilityRules.holdMode]} holds</strong>
        <small>{holdModeLabels[normalizedAvailabilityRules.holdMode]} holds · {normalizedAvailabilityRules.reschedulingAllowed ? 'Rescheduling allowed' : 'No client rescheduling'}</small>
      </section>
      <section className="schedule-settings-review-card">
        <span><ListChecks size={16} /></span>
        <strong>{scheduleTemplates.length} saved templates</strong>
        <small>{scheduleTemplates.length ? 'Reusable schedules ready' : 'No templates saved yet'}</small>
      </section>
      {!launchMode && (
        <div className="schedule-settings-actions is-wide">
          <button type="button" className="is-primary" onClick={onSaveAvailabilitySettings}>
            <Save size={15} />
            Save schedule settings
          </button>
          <button type="button" onClick={() => onApplyDefaults(applyScope, rangePayload)}>
            <CalendarCheck size={15} />
            Apply defaults
          </button>
        </div>
      )}
    </div>
  );

  const renderStep = () => {
    if (currentStep.id === 'defaults') return renderDefaultSlotsStep();
    if (currentStep.id === 'templates') return renderTemplatesStep();
    if (currentStep.id === 'apply') return renderApplyStep();
    if (currentStep.id === 'rules') return renderRulesStep();
    return renderReviewStep();
  };

  return (
    <div className={`schedule-settings-backdrop ${launchMode || launcherSkin ? 'schedule-settings-launcher-skin' : ''}`}>
      <div className="schedule-settings-modal schedule-settings-wizard-modal" role="dialog" aria-modal="true" aria-label="Schedule settings">
        <div className="schedule-settings-wizard-header">
          <div>
            <p>Schedule setup</p>
            <h3>Schedule settings</h3>
            <small>{selectedCalendarName}</small>
          </div>
          <button type="button" className="schedule-icon-button" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="schedule-settings-wizard-shell">
          <aside className="schedule-settings-step-list" aria-label="Schedule settings steps">
            {scheduleWizardSteps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                className={`${index === stepIndex ? 'is-active' : ''} ${index < stepIndex ? 'is-complete' : ''}`}
                onClick={() => setStepIndex(index)}
                aria-current={index === stepIndex ? 'step' : undefined}
              >
                <span>{index < stepIndex ? <Check size={13} /> : index + 1}</span>
                <strong>{step.label}</strong>
              </button>
            ))}
          </aside>
          <main className="schedule-settings-wizard-main">
            <div className="schedule-settings-wizard-title">
              <span>Step {stepIndex + 1} of {scheduleWizardSteps.length}</span>
              <h3>{currentStep.title}</h3>
              <p>{currentStep.helper}</p>
            </div>
            {renderStep()}
          </main>
        </div>

        <div className="schedule-settings-wizard-footer">
          <button type="button" onClick={canGoBack ? prevStep : onClose}>
            {canGoBack || launchMode ? <ChevronLeft size={15} /> : <X size={15} />}
            {canGoBack || launchMode ? 'Back' : 'Close'}
          </button>
          {isLastStep ? (
            <button type="button" className="is-primary" onClick={onSaveAvailabilitySettings}>
              {launchMode ? 'Continue to Publish' : (
                <>
                  <Save size={15} />
                  Save settings
                </>
              )}
              {launchMode && <ChevronRight size={15} />}
            </button>
          ) : (
            <button type="button" className="is-primary" onClick={nextStep}>
              Continue
              <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>
      {rangePicker && (
        <div className="schedule-date-picker-backdrop schedule-range-picker-backdrop">
          <div className="schedule-date-picker-modal" role="dialog" aria-modal="true" aria-label="Select date">
            <div className="schedule-panel-title">
              <div>
                <p>{rangePicker.field === 'selectedDate' ? 'Selected day' : rangePicker.field === 'startDate' ? 'From' : 'Until'}</p>
                <h3>{rangePickerMonthLabel}</h3>
              </div>
              <button type="button" className="schedule-icon-button" onClick={() => setRangePicker(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="schedule-picker-month-nav">
              <button type="button" onClick={() => setRangePicker(prev => ({ ...prev, month: new Date(prev.month.getFullYear(), prev.month.getMonth() - 1, 1) }))}>
                <ChevronLeft size={16} />
                Previous
              </button>
              <button type="button" onClick={() => setRangePicker(prev => ({ ...prev, month: new Date() }))}>Today</button>
              <button type="button" onClick={() => setRangePicker(prev => ({ ...prev, month: new Date(prev.month.getFullYear(), prev.month.getMonth() + 1, 1) }))}>
                Next
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="schedule-picker-weekdays" aria-hidden="true">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}
            </div>
            <div className="schedule-picker-grid">
              {rangePickerDays.map(day => day.empty ? (
                <span key={day.key} className="is-empty" />
              ) : (
                <button
                  key={day.key}
                  type="button"
                  className={`${day.dateStr === (rangePicker.field === 'selectedDate' ? selectedDate : (customRange[rangePicker.field] || selectedDate)) ? 'is-active' : ''} ${day.dateStr === selectedDate ? 'is-today' : ''}`}
                  onClick={() => selectRangeDate(day.dateStr)}
                >
                  {day.date.getDate()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
