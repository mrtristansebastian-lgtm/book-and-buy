import { Button } from '../../../shared/ui/Button';
import { getProductTemplate } from '../../../../functions/catalogTemplates.js';
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
  const clothing = getProductTemplate(draft.catalogTemplateId)?.family === 'apparel';
  const presets = [{ name: 'Size', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] }, { name: 'Colour', values: [] }];
  return (
    <section className="bb-services-section">
      <div className="bb-products-step-head">
        <div>
          <h3 className="bb-services-section-title">Options</h3>
          <p className="bb-services-section-lede">
            Add up to 3 options and set each option’s price here. SKU and stock
            live on Stock.
          </p>
        </div>
        <Button action="add" variant="primary"
          type="button"
          className="bb-ghost-btn"
          onClick={() => addOption()}
          disabled={options.length >= 3}
        >
          <Plus size={14} />
          Add option
        </Button>
      </div>

      {clothing && <div className="bb-products-chips" style={{ marginBottom: 16 }}>{presets.filter(preset => !options.some(option => option.name.toLowerCase() === preset.name.toLowerCase())).map(preset => <Button key={preset.name} type="button" disabled={options.length >= 3} onClick={() => addOption(preset)}><Plus size={14}/>Add {preset.name.toLowerCase()} options</Button>)}<p className="bb-services-field-hint">Edit the sizes to match your range, or use age-based and numeric sizes. Set each option’s price here; manage its stock in Stock.</p></div>}
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
                <Button action="add" variant="primary"
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
                </Button>
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
                <th>Option</th>
                <th>Price ({draft.currency || 'R'})</th>
                <th>
                  Compare-at{' '}
                  <span className="bb-products-field-optional">Optional</span>
                </th>
                <th>Available</th>
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
                      inputMode="decimal"
                      aria-label={`Price for ${variant.title || 'option'} (${draft.currency || 'R'})`}
                      value={variant.price ?? ''}
                      placeholder="0.00"
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
                      inputMode="decimal"
                      aria-label={`Compare-at price for ${variant.title || 'option'} (${draft.currency || 'R'})`}
                      value={variant.compareAtPrice ?? ''}
                      placeholder="—"
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
                      aria-label={`${variant.title || 'Option'} available to buy`}
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
