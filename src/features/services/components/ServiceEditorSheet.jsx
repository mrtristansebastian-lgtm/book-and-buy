import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Plus, Replace, X } from 'lucide-react';
import { uploadPublicImage } from '../../../shared/firebase/integrations';
import { ImageCropModal } from '../../media/ImageCropModal';
import {
  DURATION_PRESETS,
  parseDurationMinutes
} from '../../../utils/services';

function DurationPicker({
  label,
  value,
  onChange,
  hint = ''
}) {
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
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cropSource, setCropSource] = useState(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [fileNameHint, setFileNameHint] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  useEffect(() => {
    if (!open) return;
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

  const save = () => {
    if (!String(draft.name || '').trim()) {
      setError('Add a service name.');
      return;
    }
    if (draft.fixedDuration === false) {
      if (!parseDurationMinutes(draft.minDuration)) {
        setError('Set a minimum duration for schedule availability.');
        return;
      }
    } else if (!parseDurationMinutes(draft.duration)) {
      setError('Set how long this service takes.');
      return;
    }
    setError('');
    onSave?.();
  };

  const isEdit = Boolean(draft.id);

  return (
    <div className="bb-services-sheet" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit service' : 'New service'}>
      <div className="bb-services-sheet-backdrop" onClick={onClose} />
      <div className="bb-services-sheet-panel">
        <header className="bb-services-sheet-head">
          <div>
            <p className="bb-services-sheet-eyebrow">{isEdit ? 'Edit service' : 'New service'}</p>
            <h2 className="bb-services-sheet-title">
              {String(draft.name || '').trim() || 'Untitled service'}
            </h2>
            <p className="bb-services-sheet-lede">
              Duration feeds public Book availability from your Schedule hours.
            </p>
          </div>
          <button type="button" className="bb-ghost-btn bb-services-sheet-close" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className="bb-services-sheet-body">
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

          <section className="bb-services-section">
            <h3 className="bb-services-section-title">Basics</h3>
            <div className="bb-services-fields">
              <label className="bb-services-field">
                <span>Name</span>
                <input
                  className="native-control-input bb-services-control"
                  value={draft.name}
                  placeholder="Service name"
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
              <div className="bb-services-field-row">
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
                  <span>Type</span>
                  <select
                    className="native-control-input bb-services-control"
                    value={draft.scheduleType}
                    onChange={(event) => patch({ scheduleType: event.target.value })}
                  >
                    <option value="appointment">Appointment</option>
                    <option value="class_session">Spot / class</option>
                  </select>
                </label>
                <label className="bb-services-field">
                  <span>Capacity</span>
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
            </div>
          </section>

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

          {error ? <p className="bb-services-error">{error}</p> : null}
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
            <button type="button" className="bb-primary-btn" onClick={save} disabled={busy}>
              {isEdit ? 'Save changes' : 'Save service'}
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
