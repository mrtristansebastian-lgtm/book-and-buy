import { Plus, Trash2 } from 'lucide-react';

export function ProductEditorVariantsStep({
  options,
  addOption,
  updateOption,
  removeOption,
  addOptionValue,
  removeOptionValue,
  valueDrafts,
  setValueDrafts,
  hasVariants,
  draft,
  patchVariant
}) {
  return (
    <section className="bb-services-section">
      <div className="bb-products-step-head">
        <div>
          <h3 className="bb-services-section-title">Variants</h3>
          <p className="bb-services-section-lede">
            Add up to 3 options. Manage SKU and quantity on Stock.
          </p>
        </div>
        <button
          type="button"
          className="bb-ghost-btn"
          onClick={addOption}
          disabled={options.length >= 3}
        >
          <Plus size={14} />
          Add option
        </button>
      </div>

      {options.length === 0 ? (
        <p className="bb-services-section-lede">
          No options yet — this product sells as a single item.
        </p>
      ) : (
        <div className="bb-products-option-list">
          {options.map((option, index) => (
            <div
              key={option.id || index}
              className="bb-products-option"
            >
              <div className="bb-products-option-head">
                <input
                  className="native-control-input bb-services-control"
                  value={option.name}
                  placeholder="Option name (e.g. Size)"
                  onChange={(event) =>
                    updateOption(index, { name: event.target.value })
                  }
                />
                <button
                  type="button"
                  className="bb-ghost-btn"
                  aria-label="Remove option"
                  onClick={() => removeOption(index)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="bb-products-chips">
                {option.values.map((value) => (
                  <span
                    key={value}
                    className="bb-products-chip is-active"
                  >
                    {value}
                    <button
                      type="button"
                      className="bb-products-chip-remove"
                      aria-label={`Remove ${value}`}
                      onClick={() => removeOptionValue(index, value)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="bb-products-value-row">
                <input
                  className="native-control-input bb-services-control"
                  value={valueDrafts[index] || ''}
                  placeholder="Add a value"
                  onChange={(event) =>
                    setValueDrafts((prev) => ({
                      ...prev,
                      [index]: event.target.value
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addOptionValue(index, valueDrafts[index]);
                      setValueDrafts((prev) => ({
                        ...prev,
                        [index]: ''
                      }));
                    }
                  }}
                />
                <button
                  type="button"
                  className="bb-primary-btn"
                  onClick={() => {
                    addOptionValue(index, valueDrafts[index]);
                    setValueDrafts((prev) => ({
                      ...prev,
                      [index]: ''
                    }));
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasVariants ? (
        <div className="bb-products-variant-table-wrap">
          <table className="bb-products-variant-table">
            <thead>
              <tr>
                <th>Variant</th>
                <th>Price</th>
                <th>Compare-at</th>
                <th>On</th>
              </tr>
            </thead>
            <tbody>
              {(draft.variants || []).map((variant) => (
                <tr key={variant.id}>
                  <td className="bb-products-variant-title">
                    {variant.title ||
                      Object.values(variant.optionValues || {}).join(
                        ' / '
                      )}
                  </td>
                  <td>
                    <input
                      type="text"
                      value={variant.price ?? ''}
                      onChange={(event) =>
                        patchVariant(variant.id, {
                          price: event.target.value
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={variant.compareAtPrice ?? ''}
                      onChange={(event) =>
                        patchVariant(variant.id, {
                          compareAtPrice: event.target.value
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={variant.available !== false}
                      onChange={(event) =>
                        patchVariant(variant.id, {
                          available: event.target.checked
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
