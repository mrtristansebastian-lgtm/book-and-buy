import { Button } from '../../../shared/ui/Button';
import { FilterChip } from '../../../shared/ui/FilterChip';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  DURATION_PRESETS,
  createServiceVariantId
} from '../../../utils/services';

export function ServiceEditorVariantsStep({ draft, patch, currency = 'R' }) {
  const variants = Array.isArray(draft.variants) ? draft.variants : [];
  const isSession = draft.scheduleType === 'class_session';
  const [expandedId, setExpandedId] = useState(variants.find((variant) => !variant.name?.trim())?.id || '');

  const setVariants = (next) => patch({ variants: next });

  const addVariant = () => {
    const id = createServiceVariantId();
    setVariants([
      ...variants,
      {
        id,
        name: '',
        description: '',
        price: draft.price || '',
        cost: '',
        minDuration: isSession ? '' : draft.minDuration || draft.duration || '60',
        available: true
      }
    ]);
    setExpandedId(id);
  };

  const patchVariant = (id, partial) => {
    setVariants(
      variants.map((variant) =>
        variant.id === id ? { ...variant, ...partial } : variant
      )
    );
  };

  const removeVariant = (id) => {
    setVariants(variants.filter((variant) => variant.id !== id));
  };

  return (
    <section className="bb-services-section">
      <div className="bb-services-step-head">
        <div>
          <h3 className="bb-services-section-title">Options</h3>
          <p className="bb-services-section-lede">
            {isSession ? 'Optional ticket options, each with its own price per spot. Every choice shares the same session time and capacity.' : 'Optional options with their own name, description, price and duration.'}
          </p>
        </div>
        <Button action="add" variant="primary" type="button" className="bb-ghost-btn" onClick={addVariant}>
          Add option
        </Button>
      </div>

      {variants.length === 0 ? (
        <p className="bb-services-section-lede">
          No options — this service books as one option.
        </p>
      ) : (
        <div className="bb-services-variant-list">
          {variants.map((variant, index) => (
            <article key={variant.id || index} className="bb-services-variant-card">
              <div className="bb-services-variant-card-head">
                <button type="button" className="bb-variant-summary" aria-expanded={expandedId === variant.id} aria-controls={`service-variant-${variant.id}`} onClick={() => setExpandedId(expandedId === variant.id ? '' : variant.id)}>
                  <strong>{variant.name || `Option ${index + 1}`}</strong>
                  <span>{!isSession ? `${variant.minDuration || '—'} min · ` : ''}{currency} {variant.price || '0'}{isSession ? ' / spot' : ''} · {variant.available === false ? 'Hidden' : 'Available'}</span>
                  <small>{expandedId === variant.id ? 'Close details' : 'Edit details'}</small>
                </button>
                <button
                  type="button"
                  className="bb-ghost-btn"
                  aria-label={`Remove ${variant.name || `option ${index + 1}`}`}
                  onClick={() => removeVariant(variant.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div id={`service-variant-${variant.id}`} className="bb-services-fields" hidden={expandedId !== variant.id}>
                <label className="bb-services-field">
                  <span>Name</span>
                  <input
                    className="native-control-input bb-services-control"
                    value={variant.name || ''}
                    placeholder="e.g. Classic cut"
                    onChange={(event) =>
                      patchVariant(variant.id, { name: event.target.value })
                    }
                  />
                </label>
                <label className="bb-services-field">
                  <span>Description</span>
                  <textarea
                    className="native-control-input bb-services-control bb-services-textarea"
                    rows={2}
                    value={variant.description || ''}
                    placeholder="What’s included in this option…"
                    onChange={(event) =>
                      patchVariant(variant.id, {
                        description: event.target.value
                      })
                    }
                  />
                </label>
                <div className="bb-services-variant-row">
                  <label className="bb-services-field">
                    <span>{isSession ? 'Price per spot' : 'Price'} ({currency})</span>
                    <input
                      className="native-control-input bb-services-control"
                      value={variant.price ?? ''}
                      placeholder="e.g. 780"
                      onChange={(event) =>
                        patchVariant(variant.id, {
                          price: event.target.value
                        })
                      }
                    />
                  </label>
                  {!isSession && <label className="bb-services-field">
                    <span>Duration (min)</span>
                    <input
                      className="native-control-input bb-services-control"
                      inputMode="numeric"
                      value={variant.minDuration ?? ''}
                      placeholder="60"
                      onChange={(event) =>
                        patchVariant(variant.id, {
                          minDuration: event.target.value
                        })
                      }
                    />
                  </label>}
                </div>
                <label className="bb-services-field">
                  <span>Cost per booking ({currency}, optional)</span>
                  <input
                    className="native-control-input bb-services-control"
                    inputMode="decimal"
                    value={variant.cost ?? ''}
                    placeholder="Use the main service cost"
                    aria-describedby={`service-variant-cost-${variant.id}`}
                    onChange={(event) => patchVariant(variant.id, { cost: event.target.value })}
                  />
                  <small className="bb-services-field-hint" id={`service-variant-cost-${variant.id}`}>Private to your team. Leave blank to use the main service cost, or enter this option’s own cost.</small>
                </label>
                {!isSession && <div className="bb-services-duration-presets">
                  {DURATION_PRESETS.map((mins) => (
                    <FilterChip
                      key={mins}
                      type="button"
                      selected={Number(variant.minDuration) === mins}
                      className={`bb-services-chip${
                        Number(variant.minDuration) === mins ? ' is-active' : ''
                      }`}
                      onClick={() =>
                        patchVariant(variant.id, { minDuration: String(mins) })
                      }
                    >
                      {mins} min
                    </FilterChip>
                  ))}
                </div>}
                <label className="bb-services-check">
                  <input
                    type="checkbox"
                    checked={variant.available !== false}
                    onChange={(event) =>
                      patchVariant(variant.id, {
                        available: event.target.checked
                      })
                    }
                  />
                  <span>Available to book</span>
                </label>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
