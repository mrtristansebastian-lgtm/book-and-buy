export function ServiceEditorDetailsStep({ draft, patch, showCapacity, autoFocus = false, currency = 'R' }) {
  return (
    <section className="bb-services-section">
      <div className="bb-services-step-head">
        <div>
          <h3 className="bb-services-section-title">Details</h3>
          <p className="bb-services-section-lede">
            Set your name, description, price and private booking cost.
          </p>
        </div>
      </div>
      <div className="bb-services-fields">
        <label className="bb-services-field">
          <span>Name</span>
          <input
            className="native-control-input bb-services-control"
            value={draft.name}
            placeholder="Service name"
            autoFocus={autoFocus}
            onChange={(event) => patch({ name: event.target.value })}
          />
        </label>
        <label className="bb-services-field">
          <span>Description</span>
          <textarea
            className="native-control-input bb-services-control bb-services-textarea"
            rows={4}
            value={draft.description}
            placeholder="What clients should know…"
            onChange={(event) => patch({ description: event.target.value })}
          />
        </label>
        {showCapacity ? (
          <div className="bb-services-field-row bb-services-field-row--2">
            <label className="bb-services-field">
              <span>Price</span>
              <div className="bb-products-money">
                <span className="bb-products-money-prefix">{currency}</span>
                <input
                  className="native-control-input bb-services-control native-control-nest"
                  value={draft.price}
                  placeholder="0.00"
                  onChange={(event) => patch({ price: event.target.value })}
                />
              </div>
            </label>
            <label className="bb-services-field">
              <span>Open spots</span>
              <input
                className="native-control-input bb-services-control"
                inputMode="numeric"
                value={draft.capacity}
                onChange={(event) =>
                  patch({ capacity: event.target.value.replace(/[^\d]/g, '') })
                }
              />
            </label>
          </div>
        ) : (
          <label className="bb-services-field">
            <span>Price</span>
            <div className="bb-products-money">
              <span className="bb-products-money-prefix">{currency}</span>
              <input
                className="native-control-input bb-services-control native-control-nest"
                value={draft.price}
                placeholder="0.00"
                onChange={(event) => patch({ price: event.target.value })}
              />
            </div>
          </label>
        )}
        <label className="bb-services-field">
          <span>Cost per booking (optional)</span>
          <div className="bb-products-money">
            <span className="bb-products-money-prefix">{currency}</span>
            <input
              className="native-control-input bb-services-control native-control-nest"
              inputMode="decimal"
              value={draft.cost ?? ''}
              placeholder="Leave blank if unknown"
              aria-describedby="bb-service-cost-hint"
              onChange={(event) => patch({ cost: event.target.value })}
            />
          </div>
          <small className="bb-services-field-hint" id="bb-service-cost-hint">Your cost to deliver one booking. Only you and your team see it. Add it to track profit on new bookings.</small>
        </label>
      </div>
    </section>
  );
}
