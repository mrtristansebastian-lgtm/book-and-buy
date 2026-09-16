import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { uploadPublicImage } from '../../../shared/firebase/integrations';
import { ImageCropModal } from '../../media/ImageCropModal';
import {
  buildVariantMatrix,
  formatProductPrice,
  normalizeProductOption
} from '../../../utils/products';
import { ProductEditorCategoryStep } from './ProductEditorCategoryStep';
import { ProductEditorDetailsStep } from './ProductEditorDetailsStep';
import { ProductEditorMediaStep } from './ProductEditorMediaStep';
import { ProductEditorReviewStep } from './ProductEditorReviewStep';
import { ProductEditorVariantsStep } from './ProductEditorVariantsStep';

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

export function ProductEditorSheet({
  open,
  draft,
  onChange,
  onClose,
  onSave,
  onDelete,
  categories = [],
  variant = 'sheet'
}) {
  const fileRef = useRef(null);
  const [step, setStep] = useState('details');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cropSource, setCropSource] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [fileNameHint, setFileNameHint] = useState('');
  const [valueDrafts, setValueDrafts] = useState({});
  const isPage = variant === 'page';

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
      className={`bb-services-sheet${isPage ? ' is-page' : ''}`}
      role={isPage ? 'region' : 'dialog'}
      aria-modal={isPage ? undefined : true}
      aria-label={isEdit ? 'Edit product' : 'New product'}
    >
      {isPage ? null : <div className="bb-services-sheet-backdrop" onClick={onClose} />}
      <div className="bb-services-sheet-panel bb-services-sheet-panel--setup">
        <header className="bb-services-sheet-head">
          <div>
            <p className="bb-services-sheet-eyebrow">
              {isEdit ? 'Edit product' : 'New product'}
            </p>
            <h2 className="bb-services-sheet-title">
              {String(draft.name || '').trim() || (isEdit ? 'Edit product' : 'Add a product')}
            </h2>
            <p className="bb-services-sheet-lede">{activeStep.lede}</p>
          </div>
          <button
            type="button"
            className="bb-ghost-btn bb-services-sheet-close"
            onClick={onClose}
            aria-label={isPage ? 'Back to products' : 'Close'}
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
              <ProductEditorDetailsStep draft={draft} patch={patch} autoFocus={isPage} />
            ) : null}

            {step === 'media' ? (
              <ProductEditorMediaStep
                imageUrls={imageUrls}
                busy={busy}
                fileRef={fileRef}
                onPick={onPick}
                moveImage={moveImage}
                removeImage={removeImage}
              />
            ) : null}

            {step === 'category' ? (
              <ProductEditorCategoryStep
                categoryOptions={categoryOptions}
                draft={draft}
                patch={patch}
              />
            ) : null}

            {step === 'variants' ? (
              <ProductEditorVariantsStep
                options={options}
                addOption={addOption}
                updateOption={updateOption}
                removeOption={removeOption}
                addOptionValue={addOptionValue}
                removeOptionValue={removeOptionValue}
                valueDrafts={valueDrafts}
                setValueDrafts={setValueDrafts}
                hasVariants={hasVariants}
                draft={draft}
                patchVariant={patchVariant}
              />
            ) : null}

            {step === 'review' ? (
              <ProductEditorReviewStep
                imageUrls={imageUrls}
                draft={draft}
                priceLabel={priceLabel}
                hasVariants={hasVariants}
                setStatus={setStatus}
              />
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
