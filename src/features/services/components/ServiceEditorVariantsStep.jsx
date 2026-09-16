import { Plus, Trash2 } from 'lucide-react';
import {
  DURATION_PRESETS,
  createServiceVariantId
} from '../../../utils/services';

export function ServiceEditorVariantsStep({ draft, patch }) {
  const variants = Array.isArray(draft.variants) ? draft.variants : [];

  const setVariants = (next) => patch({ variants: next });

  const addVariant = () => {
    setVariants([
      ...variants,
      {
        id: createServiceVariantId(),
        name: '',
        description: '',
        price: draft.price || '',
        minDuration: draft.minDuration || draft.duration || '60',
        available: true
      }
    ]);
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
          <h3 className="bb-services-section-title">Variants</h3>
          <p className="bb-services-section-lede">
            Optional packages with their own name, description, price, and
            minimum duration. No stock tracking for services.
          </p>
        </div>
        <button type="button" className="bb-ghost-btn" onClick={addVariant}>
          <Plus size={14} />
          Add variant
        </button>
      </div>

      {variants.length === 0 ? (
        <p className="bb-services-section-lede">
          No variants — this service books as one option.
        </p>
      ) : (
        <div className="bb-services-variant-list">
          {variants.map((variant, index) => (
            <article key={variant.id || index} className="bb-services-variant-card">
              <div className="bb-services-variant-card-head">
                <h4 className="bb-services-variant-card-title">
                  Variant {index + 1}
                </h4>
                <button
                  type="button"
                  className="bb-ghost-btn"
                  aria-label="Remove variant"
                  onClick={() => removeVariant(variant.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="bb-services-fields">
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
                    <span>Price</span>
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
                  <label className="bb-services-field">
                    <span>Min duration (min)</span>
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
                  </label>
                </div>
                <div className="bb-services-duration-presets">
                  {DURATION_PRESETS.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      className={`bb-services-chip${
                        Number(variant.minDuration) === mins ? ' is-active' : ''
                      }`}
                      onClick={() =>
                        patchVariant(variant.id, { minDuration: String(mins) })
                      }
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
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
