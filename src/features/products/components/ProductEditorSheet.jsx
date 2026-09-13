import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { uploadPublicImage } from '../../../shared/firebase/integrations';
import { ImageCropModal } from '../../media/ImageCropModal';
import {
  buildVariantMatrix,
  normalizeProductOption
} from '../../../utils/products';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' }
];

function ChipList({
  values = [],
  selected,
  onSelect,
  onRemove,
  onAdd,
  addLabel = 'Add'
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const commit = () => {
    const label = draft.trim();
    if (!label) return;
    onAdd?.(label);
    setDraft('');
    setAdding(false);
  };

  return (
    <div className="bb-products-chips">
      {typeof selected !== 'undefined' ? (
        <button
          type="button"
          className={`bb-products-chip${!selected ? ' is-active' : ''}`}
          onClick={() => onSelect?.('')}
        >
          None
        </button>
      ) : null}
      {values.map((label) => {
        const active =
          typeof selected === 'undefined' ? true : selected === label;
        return (
          <span
            key={label}
            className={`bb-products-chip${active ? ' is-active' : ''}`}
          >
            <button
              type="button"
              className="bb-products-chip-label"
              onClick={() => onSelect?.(label)}
            >
              {label}
            </button>
            {onRemove ? (
              <button
                type="button"
                className="bb-products-chip-remove"
                aria-label={`Remove ${label}`}
                onClick={() => onRemove(label)}
              >
                ×
              </button>
            ) : null}
          </span>
        );
      })}
      {adding ? (
        <div className="bb-products-inline-add" style={{ width: '100%' }}>
          <input
            className="native-control-input bb-services-control"
            value={draft}
            placeholder={addLabel}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commit();
              }
            }}
          />
          <button type="button" className="bb-primary-btn" onClick={commit}>
            Save
          </button>
          <button
            type="button"
            className="bb-ghost-btn"
            onClick={() => {
              setAdding(false);
              setDraft('');
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="bb-products-chip bb-products-chip--add"
          onClick={() => setAdding(true)}
        >
          <Plus size={14} />
          {addLabel}
        </button>
      )}
    </div>
  );
}

export function ProductEditorSheet({
  open,
  draft,
  onChange,
  onClose,
  onSave,
  onDelete,
  categories = []
}) {
  const fileRef = useRef(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cropSource, setCropSource] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [fileNameHint, setFileNameHint] = useState('');
  const [valueDrafts, setValueDrafts] = useState({});

  useEffect(() => {
    if (!open) return;
    setError('');
    setValueDrafts({});
  }, [open, draft?.id]);

  const imageUrls = useMemo(
    () =>
      (Array.isArray(draft?.imageUrls) ? draft.imageUrls : [])
        .map((url) => String(url || '').trim())
        .filter(Boolean),
    [draft?.imageUrls]
  );

  const options = useMemo(
    () =>
      (Array.isArray(draft?.options) ? draft.options : []).map(
        normalizeProductOption
      ),
    [draft?.options]
  );

  const hasVariants = options.some((option) => option.values.length > 0);
  const isEdit = Boolean(draft?.id);

  if (!open) return null;

  const patch = (partial) => onChange?.({ ...draft, ...partial });

  const syncVariants = (nextOptions, existing = draft.variants, defaults) => {
    const matrix = buildVariantMatrix(nextOptions, existing || [], {
      price: defaults?.price ?? draft.price,
      compareAtPrice: defaults?.compareAtPrice ?? draft.compareAtPrice,
      sku: defaults?.sku ?? draft.sku,
      stockAvailable: defaults?.stockAvailable ?? draft.stockAvailable
    });
    return matrix;
  };

  const onPick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setFileNameHint(file.name || '');
    setCropSource(file);
    setCropOpen(true);
  };

  const onCropConfirm = async (file) => {
    setBusy(true);
    setError('');
    try {
      const result = await uploadPublicImage(file, 'products');
      const url = result.url || '';
      if (!url) throw new Error('Upload failed');
      patch({ imageUrls: [...imageUrls, url] });
      setCropOpen(false);
      setCropSource(null);
    } catch (err) {
      setError(err?.message || 'Upload failed');
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const moveImage = (index, delta) => {
    const next = [...imageUrls];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    patch({ imageUrls: next });
  };

  const removeImage = (index) => {
    patch({ imageUrls: imageUrls.filter((_, i) => i !== index) });
  };

  const setStatus = (status) => {
    patch({ status, active: status === 'active' });
  };

  const addOption = () => {
    if (options.length >= 3) return;
    const nextOptions = [
      ...options,
      { id: `option-${Date.now()}`, name: '', values: [] }
    ];
    patch({
      options: nextOptions,
      variants: syncVariants(nextOptions)
    });
  };

  const updateOption = (index, partial) => {
    const nextOptions = options.map((option, i) =>
      i === index ? normalizeProductOption({ ...option, ...partial }, i) : option
    );
    patch({
      options: nextOptions,
      variants: syncVariants(nextOptions)
    });
  };

  const removeOption = (index) => {
    const nextOptions = options.filter((_, i) => i !== index);
    patch({
      options: nextOptions,
      variants: syncVariants(nextOptions)
    });
  };

  const addOptionValue = (index, raw) => {
    const value = String(raw || '').trim();
    if (!value) return;
    const option = options[index];
    if (!option) return;
    if (option.values.some((item) => item.toLowerCase() === value.toLowerCase())) {
      return;
    }
    updateOption(index, { values: [...option.values, value] });
  };

  const removeOptionValue = (index, value) => {
    const option = options[index];
    if (!option) return;
    updateOption(index, {
      values: option.values.filter((item) => item !== value)
    });
  };

  const patchVariant = (variantId, partial) => {
    patch({
      variants: (draft.variants || []).map((variant) =>
        variant.id === variantId ? { ...variant, ...partial } : variant
      )
    });
  };

  const toggleListValue = (field, label, selected = true) => {
    const list = Array.isArray(draft[field]) ? draft[field] : [];
    if (selected) {
      if (list.some((item) => item.toLowerCase() === label.toLowerCase())) return;
      patch({ [field]: [...list, label] });
      return;
    }
    patch({
      [field]: list.filter((item) => item.toLowerCase() !== label.toLowerCase())
    });
  };

  const save = () => {
    if (!String(draft.name || '').trim()) {
      setError('Add a product name.');
      return;
    }
    setError('');
    onSave?.();
  };

  const categoryOptions = (() => {
    const selected = String(draft.category || '').trim();
    const list = [...categories];
    if (
      selected &&
      !list.some((item) => item.toLowerCase() === selected.toLowerCase())
    ) {
      list.push(selected);
    }
    return list;
  })();

  return (
    <div
      className="bb-services-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit product' : 'New product'}
    >
      <div className="bb-services-sheet-backdrop" onClick={onClose} />
      <div className="bb-services-sheet-panel bb-products-sheet-panel">
        <header className="bb-services-sheet-head">
          <div>
            <p className="bb-services-sheet-eyebrow">
              {isEdit ? 'Edit product' : 'Add product'}
            </p>
            <h2 className="bb-services-sheet-title">
              {String(draft.name || '').trim() || 'Untitled product'}
            </h2>
            <p className="bb-services-sheet-lede">
              Title, media, pricing, and options — ready for Buy.
            </p>
          </div>
          <button
            type="button"
            className="bb-ghost-btn bb-services-sheet-close"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </header>

        <div className="bb-products-sheet-body">
          <div className="bb-products-layout">
            <div className="bb-products-main">
              <section className="bb-products-card">
                <h3 className="bb-products-card-title">Details</h3>
                <div className="bb-products-fields">
                  <label className="bb-products-field">
                    <span>Title</span>
                    <input
                      className="native-control-input bb-services-control"
                      value={draft.name || ''}
                      placeholder="Short sleeve t-shirt"
                      autoFocus
                      onChange={(event) => patch({ name: event.target.value })}
                    />
                  </label>
                  <label className="bb-products-field">
                    <span>Description</span>
                    <textarea
                      className="native-control-input bb-services-control bb-products-textarea"
                      rows={5}
                      value={draft.description || ''}
                      placeholder="What clients should know…"
                      onChange={(event) =>
                        patch({ description: event.target.value })
                      }
                    />
                  </label>
                </div>
              </section>

              <section className="bb-products-card">
                <h3 className="bb-products-card-title">Media</h3>
                <p className="bb-products-card-lede">
                  First image is the catalog cover. Accepts images.
                </p>
                <div className="bb-products-gallery">
                  <div className="bb-products-gallery-grid">
                    {imageUrls.map((src, index) => (
                      <div
                        key={`${src}-${index}`}
                        className={`bb-products-gallery-item${
                          index === 0 ? ' is-cover' : ''
                        }`}
                      >
                        <img src={src} alt="" />
                        <div className="bb-products-gallery-actions">
                          <button
                            type="button"
                            aria-label="Move earlier"
                            disabled={index === 0}
                            onClick={() => moveImage(index, -1)}
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button
                            type="button"
                            aria-label="Move later"
                            disabled={index === imageUrls.length - 1}
                            onClick={() => moveImage(index, 1)}
                          >
                            <ChevronDown size={12} />
                          </button>
                          <button
                            type="button"
                            aria-label="Remove image"
                            onClick={() => removeImage(index)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="bb-products-gallery-add"
                      disabled={busy}
                      onClick={() => fileRef.current?.click()}
                    >
                      <ImagePlus size={18} />
                      <strong>Upload</strong>
                    </button>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onPick}
                  />
                </div>
              </section>

              <section className="bb-products-card">
                <h3 className="bb-products-card-title">Category</h3>
                <ChipList
                  values={categoryOptions}
                  selected={draft.category || ''}
                  onSelect={(label) => patch({ category: label })}
                  onAdd={(label) => patch({ category: label })}
                  addLabel="Add category"
                />
              </section>

              <section className="bb-products-card">
                <h3 className="bb-products-card-title">Pricing</h3>
                <div className="bb-products-fields">
                  <div className="bb-products-fields bb-products-fields--2">
                    <label className="bb-products-field">
                      <span>Price</span>
                      <div className="bb-products-money">
                        <span className="bb-products-money-prefix">
                          {draft.currency || 'R'}
                        </span>
                        <input
                          className="native-control-input bb-services-control"
                          value={draft.price || ''}
                          placeholder="0.00"
                          disabled={draft.quoteBased || hasVariants}
                          onChange={(event) =>
                            patch({ price: event.target.value })
                          }
                        />
                      </div>
                    </label>
                    <label className="bb-products-field">
                      <span>Compare-at price</span>
                      <div className="bb-products-money">
                        <span className="bb-products-money-prefix">
                          {draft.currency || 'R'}
                        </span>
                        <input
                          className="native-control-input bb-services-control"
                          value={draft.compareAtPrice || ''}
                          placeholder="0.00"
                          disabled={draft.quoteBased || hasVariants}
                          onChange={(event) =>
                            patch({ compareAtPrice: event.target.value })
                          }
                        />
                      </div>
                    </label>
                  </div>
                  {hasVariants ? (
                    <p className="bb-products-side-note">
                      Base price fields are defaults for new variants. Edit each
                      variant row below for live Buy pricing.
                    </p>
                  ) : null}
                  <label className="bb-products-check">
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

              <section className="bb-products-card">
                <div className="bb-products-option-head">
                  <div>
                    <h3 className="bb-products-card-title">Variants</h3>
                    <p className="bb-products-card-lede">
                      Add up to 3 options (Size, Color…) to generate a variant
                      matrix. Set SKUs, stock, weight, and size on Stock.
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
                  <p className="bb-products-side-note">
                    No options yet — this product sells as a single item. Manage
                    SKU and quantity on Stock.
                  </p>
                ) : (
                  <div className="bb-products-fields">
                    {options.map((option, index) => (
                      <div key={option.id || index} className="bb-products-option">
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
                            <span key={value} className="bb-products-chip is-active">
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
            </div>

            <aside className="bb-products-side">
              <section className="bb-products-card">
                <h3 className="bb-products-card-title">Status</h3>
                <label className="bb-products-field">
                  <span>Visibility</span>
                  <select
                    className="native-control-input bb-services-control bb-products-status-select"
                    value={draft.status || 'active'}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="bb-products-side-note">
                  Active products appear on your public Buy page. Draft and
                  archived stay owner-only.
                </p>
              </section>

              <section className="bb-products-card">
                <h3 className="bb-products-card-title">Organization</h3>
                <div className="bb-products-fields">
                  <label className="bb-products-field">
                    <span>Type</span>
                    <input
                      className="native-control-input bb-services-control"
                      value={draft.productType || ''}
                      placeholder="e.g. Apparel"
                      onChange={(event) =>
                        patch({ productType: event.target.value })
                      }
                    />
                  </label>
                  <label className="bb-products-field">
                    <span>Vendor</span>
                    <input
                      className="native-control-input bb-services-control"
                      value={draft.vendor || ''}
                      placeholder="e.g. Studio"
                      onChange={(event) => patch({ vendor: event.target.value })}
                    />
                  </label>
                  <div className="bb-products-field">
                    <span>Collections</span>
                    <ChipList
                      values={draft.collections || []}
                      onAdd={(label) =>
                        toggleListValue('collections', label, true)
                      }
                      onRemove={(label) =>
                        toggleListValue('collections', label, false)
                      }
                      addLabel="Add collection"
                    />
                  </div>
                  <div className="bb-products-field">
                    <span>Tags</span>
                    <ChipList
                      values={draft.tags || []}
                      onAdd={(label) => toggleListValue('tags', label, true)}
                      onRemove={(label) =>
                        toggleListValue('tags', label, false)
                      }
                      addLabel="Add tag"
                    />
                  </div>
                </div>
              </section>
            </aside>
          </div>

          {error ? <p className="bb-products-error">{error}</p> : null}
        </div>

        <footer className="bb-services-sheet-footer">
          {isEdit && onDelete ? (
            <button type="button" className="bb-ghost-btn" onClick={onDelete}>
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="bb-services-sheet-footer-actions">
            <button type="button" className="bb-ghost-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="bb-primary-btn"
              onClick={save}
              disabled={busy}
            >
              {isEdit ? 'Save changes' : 'Save product'}
            </button>
          </div>
        </footer>
      </div>

      <ImageCropModal
        open={cropOpen}
        source={cropSource}
        preset="catalogCard"
        fileNameHint={fileNameHint}
        onCancel={() => {
          if (busy) return;
          setCropOpen(false);
          setCropSource(null);
        }}
        onConfirm={onCropConfirm}
      />
    </div>
  );
}
