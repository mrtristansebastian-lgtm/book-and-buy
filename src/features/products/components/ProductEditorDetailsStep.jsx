export function ProductEditorDetailsStep({ draft, patch }) {
  return (
    <section className="bb-services-section">
      <h3 className="bb-services-section-title">Details</h3>
      <div className="bb-services-fields">
        <label className="bb-services-field">
          <span>Name</span>
          <input
            className="native-control-input bb-services-control"
            value={draft.name || ''}
            placeholder="Product name"
            autoFocus
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
        <div className="bb-products-price-row">
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
          <label className="bb-services-field">
            <span>Compare-at</span>
            <div className="bb-products-money">
              <span className="bb-products-money-prefix">
                {draft.currency || 'R'}
              </span>
              <input
                className="native-control-input bb-services-control native-control-nest"
                value={draft.compareAtPrice || ''}
                placeholder="0.00"
                disabled={draft.quoteBased}
                onChange={(event) =>
                  patch({ compareAtPrice: event.target.value })
                }
              />
            </div>
          </label>
        </div>
        <label className="bb-services-check">
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
