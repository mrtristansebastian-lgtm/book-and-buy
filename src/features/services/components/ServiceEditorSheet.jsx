import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ImagePlus, Plus, Replace, X } from 'lucide-react';
import { uploadPublicImage } from '../../../shared/firebase/integrations';
import { ImageCropModal } from '../../media/ImageCropModal';
import {
  DURATION_PRESETS,
  formatServiceSessionLabel,
  isValidServiceSessionWindow,
  parseDurationMinutes
} from '../../../utils/services';
import {
  SCHEDULE_TYPE_OPTIONS,
  getScheduleTypeMeta
} from '../../../utils/scheduleTypes';

function buildSetupSteps(scheduleType) {
  const isSpot = scheduleType === 'class_session';
  return [
    {
      id: 'type',
      label: 'Type',
      lede: 'How do clients book this?'
    },
    {
      id: 'details',
      label: 'Details',
      lede: 'Name it, describe it, and set the price.'
    },
    {
      id: 'photo',
      label: 'Photo',
      lede: 'Add a catalog photo clients will see on Book.'
    },
    isSpot
      ? {
          id: 'when',
          label: 'When',
          lede: 'Set the start and end date and time for this class or programme.'
        }
      : {
          id: 'duration',
          label: 'Duration',
          lede: 'Used with Schedule hours to calculate bookable times.'
        },
    {
      id: 'category',
      label: 'Category',
      lede: 'Optional — helps clients browse your Book page.'
    },
    {
      id: 'review',
      label: 'Review',
      lede: 'Check everything, assign staff, then save.'
    }
  ];
}

function DurationPicker({ label, value, onChange, hint = '' }) {
  const minutes = parseDurationMinutes(value);
  const isCustom = minutes > 0 && !DURATION_PRESETS.includes(minutes);

  return (
    <div className="bb-services-duration">
      <div className="bb-services-field-label-row">
        <span className="bb-services-field-label">{label}</span>
        {hint ? <span className="bb-services-field-hint">{hint}</span> : null}
      </div>
      <div className="bb-services-duration-presets" role="group" aria-label={label}>
        {DURATION_PRESETS.map((preset) => {
          const active = minutes === preset;
          return (
            <button
              key={preset}
              type="button"
              className={`bb-services-duration-chip${active ? ' is-active' : ''}`}
              onClick={() => onChange(String(preset))}
            >
              {preset} min
            </button>
          );
        })}
        <button
          type="button"
          className={`bb-services-duration-chip${isCustom ? ' is-active' : ''}`}
          onClick={() => {
            if (!isCustom) onChange(minutes ? String(minutes) : '75');
          }}
        >
          Custom
        </button>
      </div>
      {isCustom || !minutes ? (
        <label className="bb-services-field">
          <span>Minutes</span>
          <input
            className="native-control-input bb-services-control"
            inputMode="numeric"
            value={value}
            placeholder="e.g. 75"
            onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ''))}
          />
        </label>
      ) : null}
    </div>
  );
}

function durationSummary(draft) {
  if (draft.fixedDuration === false) {
    const mins = parseDurationMinutes(draft.minDuration);
    return mins ? `Min ${mins} min` : 'Minimum not set';
  }
  const mins = parseDurationMinutes(draft.duration);
  return mins ? `${mins} min` : 'Not set';
}

function typeSummary(draft) {
  return getScheduleTypeMeta(draft.scheduleType).setupLabel;
}

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
              <section className="bb-services-section">
                <h3 className="bb-services-section-title">Type</h3>
                <div className="bb-services-type-grid" role="radiogroup" aria-label="Booking type">
                  {SCHEDULE_TYPE_OPTIONS.map((option) => {
                    const active = draft.scheduleType === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`bb-services-type-card${active ? ' is-active' : ''}`}
                        onClick={() => selectScheduleType(option.id)}
                      >
                        <strong className="bb-services-type-card-title">{option.setupLabel}</strong>
                        <span className="bb-services-type-card-copy">{option.description}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {step === 'details' ? (
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

            {step === 'when' ? (
              <section className="bb-services-section">
                <h3 className="bb-services-section-title">When</h3>
                <p className="bb-services-section-lede">
                  Clients reserve a seat for this fixed class or programme window.
                </p>
                <div className="bb-services-fields">
                  <div className="bb-services-field-row bb-services-field-row--2">
                    <label className="bb-services-field">
                      <span>Start date</span>
                      <input
                        type="date"
                        className="native-control-input bb-services-control"
                        value={draft.sessionStartDate || ''}
                        onChange={(event) => {
                          const sessionStartDate = event.target.value;
                          patch({
                            sessionStartDate,
                            sessionEndDate:
                              !draft.sessionEndDate || draft.sessionEndDate < sessionStartDate
                                ? sessionStartDate
                                : draft.sessionEndDate
                          });
                        }}
                      />
                    </label>
                    <label className="bb-services-field">
                      <span>Start time</span>
                      <input
                        type="time"
                        className="native-control-input bb-services-control"
                        value={draft.sessionStartTime || ''}
                        onChange={(event) => patch({ sessionStartTime: event.target.value })}
                      />
                    </label>
                  </div>
                  <div className="bb-services-field-row bb-services-field-row--2">
                    <label className="bb-services-field">
                      <span>End date</span>
                      <input
                        type="date"
                        className="native-control-input bb-services-control"
                        value={draft.sessionEndDate || ''}
                        min={draft.sessionStartDate || undefined}
                        onChange={(event) => patch({ sessionEndDate: event.target.value })}
                      />
                    </label>
                    <label className="bb-services-field">
                      <span>End time</span>
                      <input
                        type="time"
                        className="native-control-input bb-services-control"
                        value={draft.sessionEndTime || ''}
                        onChange={(event) => patch({ sessionEndTime: event.target.value })}
                      />
                    </label>
                  </div>
                </div>
              </section>
            ) : null}

            {step === 'duration' ? (
              <section className="bb-services-section">
                <h3 className="bb-services-section-title">Duration</h3>
                <p className="bb-services-section-lede">
                  Used with Schedule hours to calculate bookable times.
                </p>
                <label className="bb-services-check">
                  <input
                    type="checkbox"
                    checked={draft.fixedDuration === false}
                    onChange={(event) => {
                      const noFixed = event.target.checked;
                      if (noFixed) {
                        patch({
                          fixedDuration: false,
                          minDuration: draft.minDuration || draft.duration || '60'
                        });
                      } else {
                        patch({
                          fixedDuration: true,
                          duration: draft.duration || draft.minDuration || '60'
                        });
                      }
                    }}
                  />
                  <span>No fixed duration</span>
                </label>

                {draft.fixedDuration === false ? (
                  <DurationPicker
                    label="Minimum duration"
                    hint="Required for availability"
                    value={draft.minDuration}
                    onChange={(minDuration) => patch({ minDuration })}
                  />
                ) : (
                  <DurationPicker
                    label="Service length"
                    hint="Blocks this much time on the schedule"
                    value={draft.duration}
                    onChange={(duration) => patch({ duration })}
                  />
                )}
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
                    {draft.image ? (
                      <img src={draft.image} alt="" />
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
                      <dd>{String(draft.price || '').trim() || '—'}</dd>
                    </div>
                    <div>
                      <dt>Type</dt>
                      <dd>
                        {typeSummary(draft)}
                        {showCapacity && draft.capacity ? ` · ${draft.capacity} open spots` : ''}
                      </dd>
                    </div>
                    <div>
                      <dt>{isSpot ? 'When' : 'Duration'}</dt>
                      <dd>
                        {isSpot
                          ? formatServiceSessionLabel(draft) || 'Not set'
                          : durationSummary(draft)}
                      </dd>
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

                <div className="bb-services-staff">
                  <span className="bb-services-field-label">Assigned staff</span>
                  <div className="bb-services-staff-chips">
                    {staff.length === 0 ? (
                      <p className="bb-services-empty-note">Add team members on Schedule.</p>
                    ) : (
                      staff.map((member) => {
                        const on = (draft.staffIds || []).includes(member.id);
                        return (
                          <button
                            key={member.id}
                            type="button"
                            className={`bb-services-chip${on ? ' is-active' : ''}`}
                            onClick={() =>
                              patch({
                                staffIds: on
                                  ? draft.staffIds.filter((id) => id !== member.id)
                                  : [...(draft.staffIds || []), member.id]
                              })
                            }
                          >
                            {member.name}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <label className="bb-services-check">
                  <input
                    type="checkbox"
                    checked={draft.active !== false}
                    onChange={(event) => patch({ active: event.target.checked })}
                  />
                  <span>Visible on public Book page</span>
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
