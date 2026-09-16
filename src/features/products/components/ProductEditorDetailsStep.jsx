import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';

export function ProductEditorDetailsStep({ draft, patch, autoFocus = false }) {
  const hasCompareAt = Boolean(String(draft.compareAtPrice || '').trim());
  const [showCompareAt, setShowCompareAt] = useState(hasCompareAt);

  useEffect(() => {
    if (hasCompareAt) setShowCompareAt(true);
  }, [hasCompareAt]);

  useEffect(() => {
    if (draft.quoteBased) setShowCompareAt(false);
  }, [draft.quoteBased]);

  const clearCompareAt = () => {
    patch({ compareAtPrice: '' });
    setShowCompareAt(false);
  };

  return (
    <section className="bb-services-section">
      <div className="bb-services-step-head">
        <div>
          <h3 className="bb-services-section-title">Details</h3>
          <p className="bb-services-section-lede">
            Name, description, and pricing for this product.
          </p>
        </div>
      </div>
      <div className="bb-services-fields">
        <label className="bb-services-field">
          <span>Name</span>
          <input
            className="native-control-input bb-services-control"
            value={draft.name || ''}
            placeholder="Product name"
            autoFocus={autoFocus}
            onChange={(event) => patch({ name: event.target.value })}
          />
        </label>
        <label className="bb-services-field">
          <span>Description</span>
          <textarea
            className="native-control-input bb-services-control bb-services-textarea"
            rows={4}
            value={draft.description || ''}
            placeholder="What clients should know…"
            onChange={(event) =>
              patch({ description: event.target.value })
            }
          />
        </label>

        <div className="bb-products-pricing">
          <label className="bb-services-field">
            <span>Price</span>
            <div className="bb-products-money">
              <span className="bb-products-money-prefix">
                {draft.currency || 'R'}
              </span>
              <input
                className="native-control-input bb-services-control native-control-nest"
                value={draft.price || ''}
                placeholder="0.00"
                disabled={draft.quoteBased}
                onChange={(event) =>
                  patch({ price: event.target.value })
                }
              />
            </div>
          </label>

          {!draft.quoteBased && showCompareAt ? (
            <label className="bb-services-field bb-products-compare-field">
              <span className="bb-services-field-label-row">
                <span>Compare-at price</span>
                <button
                  type="button"
                  className="bb-products-compare-clear"
                  onClick={clearCompareAt}
                  aria-label="Remove compare-at price"
                >
                  <X size={14} strokeWidth={2.2} />
                  Remove
                </button>
              </span>
              <div className="bb-products-money">
                <span className="bb-products-money-prefix">
                  {draft.currency || 'R'}
                </span>
                <input
                  className="native-control-input bb-services-control native-control-nest"
                  value={draft.compareAtPrice || ''}
                  placeholder="Was price"
                  autoFocus={!hasCompareAt}
                  onChange={(event) =>
                    patch({ compareAtPrice: event.target.value })
                  }
                />
              </div>
            </label>
          ) : null}

          {!draft.quoteBased && !showCompareAt ? (
            <button
              type="button"
              className="bb-products-compare-add"
              onClick={() => setShowCompareAt(true)}
            >
              <Plus size={15} strokeWidth={2.2} />
              Add compare-at price
            </button>
          ) : null}
        </div>

        <label className="bb-services-check bb-products-check">
          <input
            type="checkbox"
            checked={Boolean(draft.quoteBased)}
            onChange={(event) => {
              const quoteBased = event.target.checked;
              patch({
                quoteBased,
                price: quoteBased ? '' : draft.price,
                compareAtPrice: quoteBased ? '' : draft.compareAtPrice
              });
            }}
          />
          <span>Quote only (no cart price)</span>
        </label>
      </div>
    </section>
  );
}
