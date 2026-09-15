import { formatServiceSessionLabel } from '../../../utils/services';
import { durationSummary, typeSummary } from './serviceEditorUtils';

export function ServiceEditorReviewStep({
  draft,
  patch,
  showCapacity,
  isSpot,
  staff
}) {
  return (
    <section className="bb-services-section">
      <h3 className="bb-services-section-title">Review</h3>
      <div className="bb-services-review">
        <div className="bb-services-review-media">
          {draft.image ? (
            <img src={draft.image} alt="" />
          ) : (
            <span>No photo</span>
          )}
        </div>
        <dl className="bb-services-review-list">
          <div>
            <dt>Name</dt>
            <dd>{String(draft.name || '').trim() || '—'}</dd>
          </div>
          <div>
            <dt>Price</dt>
            <dd>{String(draft.price || '').trim() || '—'}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>
              {typeSummary(draft)}
              {showCapacity && draft.capacity ? ` · ${draft.capacity} open spots` : ''}
            </dd>
          </div>
          <div>
            <dt>{isSpot ? 'When' : 'Duration'}</dt>
            <dd>
              {isSpot
                ? formatServiceSessionLabel(draft) || 'Not set'
                : durationSummary(draft)}
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{String(draft.category || '').trim() || 'None'}</dd>
          </div>
          {String(draft.description || '').trim() ? (
            <div className="bb-services-review-desc">
              <dt>Description</dt>
              <dd>{draft.description}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="bb-services-staff">
        <span className="bb-services-field-label">Assigned staff</span>
        <div className="bb-services-staff-chips">
          {staff.length === 0 ? (
            <p className="bb-services-empty-note">Add team members on Schedule.</p>
          ) : (
            staff.map((member) => {
              const on = (draft.staffIds || []).includes(member.id);
              return (
                <button
                  key={member.id}
                  type="button"
                  className={`bb-services-chip${on ? ' is-active' : ''}`}
                  onClick={() =>
                    patch({
                      staffIds: on
                        ? draft.staffIds.filter((id) => id !== member.id)
                        : [...(draft.staffIds || []), member.id]
                    })
                  }
                >
                  {member.name}
                </button>
              );
            })
          )}
        </div>
      </div>

      <label className="bb-services-check">
        <input
          type="checkbox"
          checked={draft.active !== false}
          onChange={(event) => patch({ active: event.target.checked })}
        />
        <span>Visible on public Book page</span>
      </label>
    </section>
  );
}
