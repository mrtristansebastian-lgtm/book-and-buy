import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { uploadPublicImage } from '../../../shared/firebase/integrations';
import { ImageCropModal } from '../../media/ImageCropModal';
import {
  isValidServiceSessionWindow,
  parseDurationMinutes
} from '../../../utils/services';
import { ServiceEditorCategoryStep } from './ServiceEditorCategoryStep';
import { ServiceEditorDetailsStep } from './ServiceEditorDetailsStep';
import { ServiceEditorDurationStep } from './ServiceEditorDurationStep';
import { ServiceEditorPhotoStep } from './ServiceEditorPhotoStep';
import { ServiceEditorReviewStep } from './ServiceEditorReviewStep';
import { ServiceEditorTypeStep } from './ServiceEditorTypeStep';
import { ServiceEditorVariantsStep } from './ServiceEditorVariantsStep';
import { ServiceEditorWhenStep } from './ServiceEditorWhenStep';
import { buildSetupSteps } from './serviceEditorUtils';

export function ServiceEditorSheet({
  open,
  draft,
  onChange,
  onClose,
  onSave,
  onDelete,
  staff = [],
  categories = [],
  onAddCategory
}) {
  const fileRef = useRef(null);
  const [step, setStep] = useState('type');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cropSource, setCropSource] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [fileNameHint, setFileNameHint] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep('type');
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

  const setupSteps = useMemo(
    () => buildSetupSteps(draft?.scheduleType || 'appointment'),
    [draft?.scheduleType]
  );

  const stepIndex = Math.max(
    0,
    setupSteps.findIndex((item) => item.id === step)
  );
  const activeStep = setupSteps[stepIndex] || setupSteps[0];
  const isLast = step === 'review';
  const isEdit = Boolean(draft?.id);
  const isSpot = draft?.scheduleType === 'class_session';

  useEffect(() => {
    if (!open) return;
    if (step === 'duration' && isSpot) setStep('when');
    if (step === 'when' && !isSpot) setStep('duration');
  }, [open, isSpot, step]);

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
      const result = await uploadPublicImage(file, 'services');
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
    if (id === 'type') {
      if (!draft.scheduleType) {
        setError('Choose how clients book this service.');
        return false;
      }
    }
    if (id === 'details') {
      if (!String(draft.name || '').trim()) {
        setError('Add a service name.');
        return false;
      }
    }
    if (id === 'variants') {
      const rows = Array.isArray(draft.variants) ? draft.variants : [];
      for (const variant of rows) {
        if (!String(variant.name || '').trim()) {
          setError('Each variant needs a name.');
          return false;
        }
        if (!parseDurationMinutes(variant.minDuration)) {
          setError(`Set a minimum duration for “${variant.name || 'each variant'}”.`);
          return false;
        }
      }
    }
    if (id === 'duration') {
      if (draft.fixedDuration === false) {
        if (!parseDurationMinutes(draft.minDuration)) {
          setError('Set a minimum duration for schedule availability.');
          return false;
        }
      } else if (!parseDurationMinutes(draft.duration)) {
        setError('Set how long this service takes.');
        return false;
      }
    }
    if (id === 'when') {
      if (!isValidServiceSessionWindow(draft)) {
        setError('Set a start and end date/time — end must be after start.');
        return false;
      }
    }
    setError('');
    return true;
  };

  const selectScheduleType = (id) => {
    if (id === 'appointment') {
      patch({ scheduleType: id, capacity: '1' });
      return;
    }
    const current = Number(draft.capacity) || 1;
    patch({
      scheduleType: id,
      capacity: String(current > 1 ? current : 8),
      sessionStartDate: draft.sessionStartDate || '',
      sessionStartTime: draft.sessionStartTime || '10:00',
      sessionEndDate: draft.sessionEndDate || draft.sessionStartDate || '',
      sessionEndTime: draft.sessionEndTime || '12:00'
    });
  };

  const goToStep = (id) => {
    const target = setupSteps.findIndex((item) => item.id === id);
    if (target < 0) return;
    if (target > stepIndex) {
      for (let i = 0; i < target; i += 1) {
        if (!validateStep(setupSteps[i].id)) {
          setStep(setupSteps[i].id);
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
    setStep(setupSteps[stepIndex - 1].id);
  };

  const goContinue = () => {
    if (!validateStep(step)) return;
    if (stepIndex >= setupSteps.length - 1) return;
    setStep(setupSteps[stepIndex + 1].id);
  };

  const save = () => {
    if (!validateStep('type')) {
      setStep('type');
      return;
    }
    if (!validateStep('details')) {
      setStep('details');
      return;
    }
    if (!validateStep('variants')) {
      setStep('variants');
      return;
    }
    if (isSpot) {
      if (!validateStep('when')) {
        setStep('when');
        return;
      }
    } else if (!validateStep('duration')) {
      setStep('duration');
      return;
    }
    setError('');
    onSave?.();
  };

  const showCapacity = isSpot;

  return (
    <div
      className="bb-services-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit service' : 'New service'}
    >
      <div className="bb-services-sheet-backdrop" onClick={onClose} />
      <div className="bb-services-sheet-panel bb-services-sheet-panel--setup">
        <header className="bb-services-sheet-head">
          <div>
            <p className="bb-services-sheet-eyebrow">{isEdit ? 'Edit service' : 'New service'}</p>
            <h2 className="bb-services-sheet-title">
              {String(draft.name || '').trim() || 'Untitled service'}
            </h2>
            <p className="bb-services-sheet-lede">{activeStep.lede}</p>
          </div>
          <button type="button" className="bb-ghost-btn bb-services-sheet-close" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className="bb-services-sheet-body bb-services-setup">
          <p className="bb-services-setup-mobile" aria-live="polite">
            Step {stepIndex + 1} of {setupSteps.length}
            <span>{activeStep.label}</span>
          </p>

          <nav className="bb-services-setup-rail" aria-label="Setup steps">
            <ol className="bb-services-setup-rail-list">
              {setupSteps.map((item, index) => {
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
            {step === 'type' ? (
              <ServiceEditorTypeStep
                draft={draft}
                selectScheduleType={selectScheduleType}
              />
            ) : null}

            {step === 'details' ? (
              <ServiceEditorDetailsStep
                draft={draft}
                patch={patch}
                showCapacity={showCapacity}
              />
            ) : null}

            {step === 'variants' ? (
              <ServiceEditorVariantsStep draft={draft} patch={patch} />
            ) : null}

            {step === 'photo' ? (
              <ServiceEditorPhotoStep
                draft={draft}
                busy={busy}
                fileRef={fileRef}
                onPick={onPick}
              />
            ) : null}

            {step === 'when' ? (
              <ServiceEditorWhenStep draft={draft} patch={patch} />
            ) : null}

            {step === 'duration' ? (
              <ServiceEditorDurationStep draft={draft} patch={patch} />
            ) : null}

            {step === 'category' ? (
              <ServiceEditorCategoryStep
                draft={draft}
                patch={patch}
                categoryOptions={categoryOptions}
                addingCategory={addingCategory}
                setAddingCategory={setAddingCategory}
                newCategory={newCategory}
                setNewCategory={setNewCategory}
                commitCategory={commitCategory}
              />
            ) : null}

            {step === 'review' ? (
              <ServiceEditorReviewStep
                draft={draft}
                patch={patch}
                showCapacity={showCapacity}
                isSpot={isSpot}
                staff={staff}
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
                  <button type="button" className="bb-ghost-btn" onClick={onDelete}>
                    Delete
                  </button>
                ) : null}
                <button type="button" className="bb-ghost-btn" onClick={onClose}>
                  Cancel
                </button>
                <button type="button" className="bb-primary-btn" onClick={save} disabled={busy}>
                  {isEdit ? 'Save changes' : 'Save service'}
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
