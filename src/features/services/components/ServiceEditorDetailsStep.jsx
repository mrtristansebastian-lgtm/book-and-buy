export function ServiceEditorDetailsStep({ draft, patch, showCapacity }) {
  return (
    <section className="bb-services-section">
      <h3 className="bb-services-section-title">Details</h3>
      <div className="bb-services-fields">
        <label className="bb-services-field">
          <span>Name</span>
          <input
            className="native-control-input bb-services-control"
            value={draft.name}
            placeholder="Service name"
            autoFocus
            onChange={(event) => patch({ name: event.target.value })}
          />
        </label>
        <label className="bb-services-field">
          <span>Description</span>
          <textarea
            className="native-control-input bb-services-control bb-services-textarea"
            rows={3}
            value={draft.description}
            placeholder="What clients should know…"
            onChange={(event) => patch({ description: event.target.value })}
          />
        </label>
        {showCapacity ? (
          <div className="bb-services-field-row bb-services-field-row--2">
            <label className="bb-services-field">
              <span>Price</span>
              <input
                className="native-control-input bb-services-control"
                value={draft.price}
                placeholder="e.g. 780"
                onChange={(event) => patch({ price: event.target.value })}
              />
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
            <input
              className="native-control-input bb-services-control"
              value={draft.price}
              placeholder="e.g. 780"
              onChange={(event) => patch({ price: event.target.value })}
            />
          </label>
        )}
      </div>
    </section>
  );
}
