import { SCHEDULE_TYPE_OPTIONS } from '../../../utils/scheduleTypes';

export function ServiceEditorTypeStep({ draft, selectScheduleType }) {
  return (
    <section className="bb-services-section">
      <h3 className="bb-services-section-title">Type</h3>
      <div className="bb-services-type-grid" role="radiogroup" aria-label="Booking type">
        {SCHEDULE_TYPE_OPTIONS.map((option) => {
          const active = draft.scheduleType === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={`bb-services-type-card${active ? ' is-active' : ''}`}
              onClick={() => selectScheduleType(option.id)}
            >
              <strong className="bb-services-type-card-title">{option.setupLabel}</strong>
              <span className="bb-services-type-card-copy">{option.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
