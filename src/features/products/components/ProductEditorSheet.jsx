import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
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
  formatProductPrice,
  normalizeProductOption
} from '../../../utils/products';

const SETUP_STEPS = [
  {
    id: 'details',
    label: 'Details',
    lede: 'Name it, describe it, and set the price.'
  },
  {
    id: 'media',
    label: 'Media',
    lede: 'Add catalog photos — first one is the cover.'
  },
  {
    id: 'category',
    label: 'Category',
    lede: 'Optional — helps clients browse your Buy page.'
  },
  {
    id: 'variants',
    label: 'Variants',
    lede: 'Optional size or colour options. SKUs and stock live on Stock.'
  },
  {
    id: 'review',
    label: 'Review',
    lede: 'Check everything, then save to your Buy catalog.'
  }
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active — visible on Buy' },
  { value: 'draft', label: 'Draft — owner only' },
  { value: 'archived', label: 'Archived — hidden' }
];

function ChipList({ values = [], selected, onSelect, onAdd, addLabel = 'Add' }) {
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
      <button
        type="button"
        className={`bb-products-chip${!selected ? ' is-active' : ''}`}
        onClick={() => onSelect?.('')}
      >
        None
      </button>
      {values.map((label) => (
        <button
          key={label}
          type="button"
          className={`bb-products-chip${selected === label ? ' is-active' : ''}`}
          onClick={() => onSelect?.(label)}
        >
          {label}
        </button>
      ))}
      {adding ? (
        <div className="bb-products-inline-add">
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
            Add
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
          <Plus size={13} />
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
  const [step, setStep] = useState('details');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cropSource, setCropSource] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [fileNameHint, setFileNameHint] = useState('');
  const [valueDrafts, setValueDrafts] = useState({});

  useEffect(() => {
    if (!open) return;
    setStep('details');
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
  const stepIndex = Math.max(
    0,
    SETUP_STEPS.findIndex((item) => item.id === step)
  );
  const activeStep = SETUP_STEPS[stepIndex] || SETUP_STEPS[0];
  const isLast = step === 'review';
  const isEdit = Boolean(draft?.id);

  if (!open) return null;

  const patch = (partial) => onChange?.({ ...draft, ...partial });

  const syncVariants = (nextOptions, existing = draft.variants) =>
    buildVariantMatrix(nextOptions, existing || [], {
      price: draft.price,
      compareAtPrice: draft.compareAtPrice,
      sku: draft.sku,
      stockAvailable: draft.stockAvailable,
      weight: draft.weight,
      weightUnit: draft.weightUnit,
      length: draft.length,
      width: draft.width,
      height: draft.height,
      dimensionUnit: draft.dimensionUnit,
      size: draft.size
    });

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
    patch({ options: nextOptions, variants: syncVariants(nextOptions) });
  };

  const updateOption = (index, partial) => {
    const nextOptions = options.map((option, i) =>
      i === index ? normalizeProductOption({ ...option, ...partial }, i) : option
    );
    patch({ options: nextOptions, variants: syncVariants(nextOptions) });
  };

  const removeOption = (index) => {
    const nextOptions = options.filter((_, i) => i !== index);
    patch({ options: nextOptions, variants: syncVariants(nextOptions) });
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

  const validateStep = (id) => {
    if (id === 'details') {
      if (!String(draft.name || '').trim()) {
        setError('Add a product name.');
        return false;
      }
    }
    setError('');
    return true;
  };

  const goToStep = (id) => {
    const target = SETUP_STEPS.findIndex((item) => item.id === id);
    if (target < 0) return;
    if (target > stepIndex) {
      for (let i = 0; i < target; i += 1) {
        if (!validateStep(SETUP_STEPS[i].id)) {
          setStep(SETUP_STEPS[i].id);
          return;
        }
      }
    }
    setError('');
    setStep(id);
  };

  const goBack = () => {
    if (stepIndex <= 0) return;
    setError('');
    setStep(SETUP_STEPS[stepIndex - 1].id);
  };

  const goContinue = () => {
    if (!validateStep(step)) return;
    if (stepIndex >= SETUP_STEPS.length - 1) return;
    setStep(SETUP_STEPS[stepIndex + 1].id);
  };

  const save = () => {
    if (!validateStep('details')) {
      setStep('details');
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

  const priceLabel = formatProductPrice({
    price: draft.price,
    quoteBased: draft.quoteBased,
    priceType: draft.quoteBased ? 'quote' : 'fixed',
    currency: draft.currency || 'R',
    variants: draft.variants,
    options: draft.options
  });

  return (
    <div
      className="bb-services-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit product' : 'New product'}
    >
      <div className="bb-services-sheet-backdrop" onClick={onClose} />
      <div className="bb-services-sheet-panel bb-services-sheet-panel--setup">
        <header className="bb-services-sheet-head">
          <div>
            <p className="bb-services-sheet-eyebrow">
              {isEdit ? 'Edit product' : 'New product'}
            </p>
            <h2 className="bb-services-sheet-title">
              {String(draft.name || '').trim() || 'Untitled product'}
            </h2>
            <p className="bb-services-sheet-lede">{activeStep.lede}</p>
          </div>
          <button
            type="button"
            className="bb-ghost-btn bb-services-sheet-close"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </header>

        <div className="bb-services-sheet-body bb-services-setup">
          <p className="bb-services-setup-mobile" aria-live="polite">
            Step {stepIndex + 1} of {SETUP_STEPS.length}
            <span>{activeStep.label}</span>
          </p>

          <nav className="bb-services-setup-rail" aria-label="Setup steps">
            <ol className="bb-services-setup-rail-list">
              {SETUP_STEPS.map((item, index) => {
                const done = index < stepIndex;
                const current = index === stepIndex;
                const state = current ? 'current' : done ? 'done' : 'upcoming';
                const clickable = done || current;
                return (
                  <li
                    key={item.id}
                    className={`bb-services-setup-rail-item is-${state}`}
                  >
                    <button
                      type="button"
                      className="bb-services-setup-rail-btn"
                      disabled={!clickable}
                      aria-current={current ? 'step' : undefined}
                      onClick={() => goToStep(item.id)}
                    >
                      <span
                        className="bb-services-setup-rail-dot"
                        aria-hidden="true"
                      >
                        {done ? <Check size={12} strokeWidth={2.6} /> : index + 1}
                      </span>
                      <span className="bb-services-setup-rail-label">
                        {item.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="bb-services-setup-stage" key={step}>
            {step === 'details' ? (
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
            ) : null}

            {step === 'media' ? (
              <section className="bb-services-section">
                <h3 className="bb-services-section-title">Media</h3>
                <p className="bb-services-section-lede">
                  First image is the catalog cover.
                </p>
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
              </section>
            ) : null}

            {step === 'category' ? (
              <section className="bb-services-section">
                <h3 className="bb-services-section-title">Category</h3>
                <ChipList
                  values={categoryOptions}
                  selected={draft.category || ''}
                  onSelect={(label) => patch({ category: label })}
                  onAdd={(label) => patch({ category: label })}
                  addLabel="Add category"
                />
              </section>
            ) : null}

            {step === 'variants' ? (
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
            ) : null}

            {step === 'review' ? (
              <section className="bb-services-section">
                <h3 className="bb-services-section-title">Review</h3>
                <div className="bb-services-review">
                  <div className="bb-services-review-media">
                    {imageUrls[0] ? (
                      <img src={imageUrls[0]} alt="" />
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
                      <dd>{priceLabel || '—'}</dd>
                    </div>
                    <div>
                      <dt>Category</dt>
                      <dd>{String(draft.category || '').trim() || 'None'}</dd>
                    </div>
                    <div>
                      <dt>Variants</dt>
                      <dd>
                        {hasVariants
                          ? `${draft.variants?.length || 0} options`
                          : 'Single item'}
                      </dd>
                    </div>
                    <div>
                      <dt>Photos</dt>
                      <dd>{imageUrls.length || 0}</dd>
                    </div>
                    {String(draft.description || '').trim() ? (
                      <div className="bb-services-review-desc">
                        <dt>Description</dt>
                        <dd>{draft.description}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>

                <label className="bb-services-field">
                  <span>Status</span>
                  <select
                    className="native-control-input bb-services-control"
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
              </section>
            ) : null}

            {error ? <p className="bb-services-error">{error}</p> : null}
          </div>
        </div>

        <footer className="bb-services-sheet-footer">
          <button
            type="button"
            className="bb-ghost-btn"
            onClick={goBack}
            disabled={stepIndex === 0}
          >
            Back
          </button>
          <div className="bb-services-sheet-footer-actions">
            {isLast ? (
              <>
                {isEdit && onDelete ? (
                  <button
                    type="button"
                    className="bb-ghost-btn"
                    onClick={onDelete}
                  >
                    Delete
                  </button>
                ) : null}
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
              </>
            ) : (
              <button
                type="button"
                className="bb-primary-btn"
                onClick={goContinue}
                disabled={busy}
              >
                Continue
              </button>
            )}
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
