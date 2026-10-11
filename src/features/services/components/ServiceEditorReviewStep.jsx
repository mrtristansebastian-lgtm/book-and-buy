import { formatServiceSessionLabel } from '../../../utils/services';
import { serviceTimingLabel, serviceNeedsTimingConversation } from '../../../../functions/serviceTiming';
import { durationSummary } from './serviceEditorUtils';
import { categoryLabel } from '../../../config/businessCategories';
import { FilterChip } from '../../../shared/ui/FilterChip';
import { getServiceTemplate, serviceConfigurationFields } from '../../../../functions/serviceTemplates';

export function ServiceEditorReviewStep({
  draft,
  patch,
  showCapacity,
  isSpot,
  staff,
  currency = 'R'
}) {
  const activeStaff = staff.filter((member) => member.active !== false);
  const inactiveAssigned = staff.filter((member) => member.active === false && (draft.staffIds || []).includes(member.id));
  const template = getServiceTemplate(draft.catalogTemplateId);
  const configuration = serviceConfigurationFields(draft);
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
            <dd>{String(draft.price ?? '').trim() ? `${currency} ${Number(draft.price).toLocaleString('en-ZA', { maximumFractionDigits: 2 })}` : '—'}</dd>
          </div>
          {(draft.variants || []).length ? (
            <div>
              <dt>Options</dt>
              <dd>{draft.variants.length} {draft.variants.length === 1 ? 'variant' : 'variants'}</dd>
            </div>
          ) : null}
          <div>
            <dt>Type</dt>
            <dd>
              {isSpot ? 'Spot' : 'Slot'}{template?.label ? ` · ${template.label}` : ''}
              {showCapacity && draft.capacity ? ` · ${draft.capacity} open spots` : ''}
            </dd>
          </div>
          <div>
            <dt>When</dt>
            <dd>
              {serviceNeedsTimingConversation(draft) || !isSpot ? serviceTimingLabel(draft)
                : formatServiceSessionLabel(draft) || 'Not set'}
            </dd>
          </div>
          {draft.timingNotes && <div><dt>Timing details</dt><dd>{draft.timingNotes}</dd></div>}
          {!isSpot && <div><dt>Duration</dt><dd>{durationSummary(draft)}</dd></div>}
          <div>
            <dt>Store Category</dt>
            <dd>{String(draft.category || '').trim() || 'None'}</dd>
          </div>
          <div>
            <dt>Discovery Category</dt>
            <dd>
              {draft.exploreMainCategoryId && draft.exploreSubcategoryId
                ? `${categoryLabel(draft.exploreMainCategoryId)} · ${categoryLabel(draft.exploreSubcategoryId)}`
                : 'Not set'}
            </dd>
          </div>
          {configuration.map((field) => <div key={field.key}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}
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
          {activeStaff.length === 0 ? (
            <p className="bb-services-empty-note">Add active team members in Teams. With no assigned staff, this service uses your business availability.</p>
          ) : (
            activeStaff.map((member) => {
              const on = (draft.staffIds || []).includes(member.id);
              return (
                <FilterChip
                  key={member.id}
                  type="button"
                  selected={on}
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
                </FilterChip>
              );
            })
          )}
        </div>
        {inactiveAssigned.length > 0 && <div className="bb-services-staff-chips">
          <p className="bb-services-empty-note">These assigned team members are inactive. Remove them or reactivate them in Teams to offer their availability.</p>
          {inactiveAssigned.map((member) => <FilterChip key={member.id} type="button" selected
            aria-label={`Remove inactive ${member.name}`} onClick={() => patch({ staffIds: (draft.staffIds || []).filter((id) => id !== member.id) })}>
            {member.name} · inactive ×
          </FilterChip>)}
        </div>}
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
