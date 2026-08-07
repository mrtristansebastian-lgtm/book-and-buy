import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ImagePlus, Plus, Replace, X } from 'lucide-react';
import { uploadPublicImage } from '../../../shared/firebase/integrations';
import { ImageCropModal } from '../../media/ImageCropModal';
import { formatProductPrice, formatStockNote } from '../../../utils/products';

const SETUP_STEPS = [
  {
    id: 'details',
    label: 'Details',
    lede: 'Name it, describe it, and set the price.'
  },
  {
    id: 'photo',
    label: 'Photo',
    lede: 'Add a catalog photo clients will see on Buy.'
  },
  {
    id: 'stock',
    label: 'Stock',
    lede: 'Show how much is available — or a custom stock note.'
  },
  {
    id: 'category',
    label: 'Category',
    lede: 'Optional — helps clients browse your Buy page.'
  },
  {
    id: 'review',
    label: 'Review',
    lede: 'Check everything, then save to your Buy catalog.'
  }
];

function stockSummary(draft) {
  const note = formatStockNote({
    stockAvailable: draft.stockAvailable,
    stockLabel: draft.stockLabel,
    hideStockOnCard: draft.hideStockOnCard
  });
  if (draft.hideStockOnCard) return 'Hidden on card';
  return note || 'Not shown';
}

export function ProductEditorSheet({
  open,
  draft,
  onChange,
  onClose,
  onSave,
  onDelete,
  categories = [],
  onAddCategory
}) {
  const fileRef = useRef(null);
  const [step, setStep] = useState('details');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cropSource, setCropSource] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [fileNameHint, setFileNameHint] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep('details');
    setError('');
    setNewCategory('');
    setAddingCategory(false);
  }, [open, draft?.id]);

  const categoryOptions = useMemo(() => {
    const selected = String(draft.category || '').trim();
    const list = [...categories];
    if (selected && !list.some((item) => item.toLowerCase() === selected.toLowerCase())) {
      list.push(selected);
    }
    return list;
  }, [categories, draft.category]);

  const stepIndex = Math.max(
    0,
    SETUP_STEPS.findIndex((item) => item.id === step)
  );
  const activeStep = SETUP_STEPS[stepIndex] || SETUP_STEPS[0];
  const isLast = step === 'review';
  const isEdit = Boolean(draft?.id);

  if (!open) return null;

  const patch = (partial) => onChange?.({ ...draft, ...partial });

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
      patch({ image: result.url || '' });
      setCropOpen(false);
      setCropSource(null);
    } catch (err) {
      setError(err?.message || 'Upload failed');
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const commitCategory = () => {
    const label = newCategory.trim();
    if (!label) return;
    onAddCategory?.(label);
    patch({ category: label });
    setNewCategory('');
    setAddingCategory(false);
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

  const priceLabel = formatProductPrice({
    price: draft.price,
    quoteBased: draft.quoteBased,
    priceType: draft.quoteBased ? 'quote' : 'fixed',
    currency: 'R'
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
            <p className="bb-services-sheet-eyebrow">{isEdit ? 'Edit product' : 'New product'}</p>
            <h2 className="bb-services-sheet-title">
              {String(draft.name || '').trim() || 'Untitled product'}
            </h2>
            <p className="bb-services-sheet-lede">{activeStep.lede}</p>
          </div>
          <button type="button" className="bb-ghost-btn bb-services-sheet-close" onClick={onClose}>
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
                  <li key={item.id} className={`bb-services-setup-rail-item is-${state}`}>
                    <button
                      type="button"
                      className="bb-services-setup-rail-btn"
                      disabled={!clickable}
                      aria-current={current ? 'step' : undefined}
                      onClick={() => goToStep(item.id)}
                    >
                      <span className="bb-services-setup-rail-dot" aria-hidden="true">
                        {done ? <Check size={12} strokeWidth={2.6} /> : index + 1}
                      </span>
                      <span className="bb-services-setup-rail-label">{item.label}</span>
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
                      value={draft.name}
                      placeholder="Product name"
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
                  <label className="bb-services-field">
                    <span>Price</span>
                    <input
                      className="native-control-input bb-services-control"
                      value={draft.price}
                      placeholder="e.g. 280"
                      disabled={draft.quoteBased}
                      onChange={(event) => patch({ price: event.target.value })}
                    />
                  </label>
                  <label className="bb-services-check">
                    <input
                      type="checkbox"
                      checked={Boolean(draft.quoteBased)}
                      onChange={(event) => {
                        const quoteBased = event.target.checked;
                        patch({
                          quoteBased,
                          price: quoteBased ? '' : draft.price
                        });
                      }}
                    />
                    <span>Quote only (no cart price)</span>
                  </label>
                </div>
              </section>
            ) : null}

            {step === 'photo' ? (
              <section className="bb-services-section">
                <h3 className="bb-services-section-title">Photo</h3>
                <button
                  type="button"
                  className={`bb-services-photo${draft.image ? ' has-media' : ''}`}
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                >
                  {draft.image ? (
                    <img src={draft.image} alt="" />
                  ) : (
                    <span className="bb-services-photo-empty">
                      <ImagePlus size={20} />
                      <strong>Add photo</strong>
                      <span>16:9 catalog crop</span>
                    </span>
                  )}
                </button>
                {draft.image ? (
                  <button
                    type="button"
                    className="bb-ghost-btn bb-services-photo-replace"
                    onClick={() => fileRef.current?.click()}
                    disabled={busy}
                  >
                    <Replace size={14} />
                    Replace
                  </button>
                ) : null}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
              </section>
            ) : null}

            {step === 'stock' ? (
              <section className="bb-services-section">
                <h3 className="bb-services-section-title">Stock</h3>
                <p className="bb-services-section-lede">
                  Shows on the Buy card as a small sticker (unless hidden).
                </p>
                <div className="bb-services-fields">
                  <label className="bb-services-field">
                    <span>Available</span>
                    <input
                      className="native-control-input bb-services-control"
                      inputMode="numeric"
                      value={draft.stockAvailable}
                      placeholder="e.g. 12"
                      onChange={(event) =>
                        patch({ stockAvailable: event.target.value.replace(/[^\d]/g, '') })
                      }
                    />
                  </label>
                  <label className="bb-services-field">
                    <span>Custom stock label</span>
                    <input
                      className="native-control-input bb-services-control"
                      value={draft.stockLabel}
                      placeholder="e.g. By arrangement"
                      onChange={(event) => patch({ stockLabel: event.target.value })}
                    />
                  </label>
                  <label className="bb-services-check">
                    <input
                      type="checkbox"
                      checked={Boolean(draft.hideStockOnCard)}
                      onChange={(event) => patch({ hideStockOnCard: event.target.checked })}
                    />
                    <span>Hide stock on card</span>
                  </label>
                </div>
              </section>
            ) : null}

            {step === 'category' ? (
              <section className="bb-services-section">
                <h3 className="bb-services-section-title">Category</h3>
                <div className="bb-services-category-chips">
                  <button
                    type="button"
                    className={`bb-services-chip${!draft.category ? ' is-active' : ''}`}
                    onClick={() => patch({ category: '' })}
                  >
                    None
                  </button>
                  {categoryOptions.map((label) => {
                    const active = draft.category === label;
                    return (
                      <button
                        key={label}
                        type="button"
                        className={`bb-services-chip${active ? ' is-active' : ''}`}
                        onClick={() => patch({ category: label })}
                      >
                        {label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="bb-services-chip bb-services-chip--add"
                    onClick={() => setAddingCategory(true)}
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>
                {addingCategory ? (
                  <div className="bb-services-category-add">
                    <input
                      className="native-control-input bb-services-control"
                      value={newCategory}
                      placeholder="New category"
                      autoFocus
                      onChange={(event) => setNewCategory(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          commitCategory();
                        }
                      }}
                    />
                    <button type="button" className="bb-primary-btn" onClick={commitCategory}>
                      Save
                    </button>
                    <button
                      type="button"
                      className="bb-ghost-btn"
                      onClick={() => {
                        setAddingCategory(false);
                        setNewCategory('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}
              </section>
            ) : null}

            {step === 'review' ? (
              <section className="bb-services-section">
                <h3 className="bb-services-section-title">Review</h3>
                <div className="bb-services-review">
                  <div className="bb-services-review-media">
                    {draft.image ? <img src={draft.image} alt="" /> : <span>No photo</span>}
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
                      <dt>Stock</dt>
                      <dd>{stockSummary(draft)}</dd>
                    </div>
                    <div>
                      <dt>Category</dt>
                      <dd>{String(draft.category || '').trim() || 'None'}</dd>
                    </div>
                    {String(draft.description || '').trim() ? (
                      <div className="bb-services-review-desc">
                        <dt>Description</dt>
                        <dd>{draft.description}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>

                <label className="bb-services-check">
                  <input
                    type="checkbox"
                    checked={draft.active !== false}
                    onChange={(event) => patch({ active: event.target.checked })}
                  />
                  <span>Visible on public Buy page</span>
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
                  <button type="button" className="bb-ghost-btn" onClick={onDelete}>
                    Delete
                  </button>
                ) : null}
                <button type="button" className="bb-ghost-btn" onClick={onClose}>
                  Cancel
                </button>
                <button type="button" className="bb-primary-btn" onClick={save} disabled={busy}>
                  {isEdit ? 'Save changes' : 'Save product'}
                </button>
              </>
            ) : (
              <button type="button" className="bb-primary-btn" onClick={goContinue} disabled={busy}>
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
