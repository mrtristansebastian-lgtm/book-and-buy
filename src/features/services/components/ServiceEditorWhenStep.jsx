import { DateField } from '../../../shared/ui/DateField';
import { TimeField } from '../../../shared/ui/TimeField';

export function ServiceEditorWhenStep({ draft, patch }) {
  return (
    <section className="bb-services-section">
      <h3 className="bb-services-section-title">When</h3>
      <p className="bb-services-section-lede">
        Clients reserve a seat for this fixed class or programme window.
      </p>
      <div className="bb-services-fields">
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
      </div>
    </section>
  );
}
