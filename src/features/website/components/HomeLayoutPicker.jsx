import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  applyHomeLayoutPack,
  getHomeLayoutLabel,
  isUniqueLayoutCombo,
  listHomeLayoutOptions,
  resolveHomeLayoutId,
  saveHomeLayoutTemplate
} from './home-sections/homeLayoutPacks';

export function HomeLayoutPicker({ website, onUpdateWebsite }) {
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const rootRef = useRef(null);
  const menuId = useId();

  const options = listHomeLayoutOptions(website);
  const builtins = options.filter((item) => item.kind === 'builtin');
  const templates = options.filter((item) => item.kind === 'template');
  const activeId = resolveHomeLayoutId(website);
  const label = getHomeLayoutLabel(website);
  const canSave = isUniqueLayoutCombo(website);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setNaming(false);
        setError('');
      }
    };
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setNaming(false);
        setError('');
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const applyPack = (id) => {
    onUpdateWebsite?.(applyHomeLayoutPack(id, website));
    setOpen(false);
    setNaming(false);
    setError('');
  };

  const saveTemplate = () => {
    try {
      onUpdateWebsite?.(saveHomeLayoutTemplate(website, name));
      setName('');
      setNaming(false);
      setError('');
      setOpen(false);
    } catch (err) {
      setError(err?.message || 'Could not save template.');
    }
  };

  return (
    <div className="bb-home-layout-picker" ref={rootRef}>
      <button
        type="button"
        className="bb-home-layout-picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          setOpen((prev) => !prev);
          setNaming(false);
          setError('');
        }}
      >
        <span className="bb-home-layout-picker-kicker">Layout</span>
        <span className="bb-home-layout-picker-value">{label}</span>
        <ChevronDown size={14} strokeWidth={2.4} />
      </button>

      {open ? (
        <div className="bb-home-layout-picker-menu" id={menuId} role="listbox">
          <p className="bb-home-layout-picker-group">Overall</p>
          {builtins.map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={activeId === item.id}
              className={`bb-home-layout-picker-option${
                activeId === item.id ? ' is-active' : ''
              }`}
              onClick={() => applyPack(item.id)}
            >
              {item.label}
            </button>
          ))}

          {templates.length ? (
            <>
              <p className="bb-home-layout-picker-group">Your templates</p>
              {templates.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={activeId === item.id}
                  className={`bb-home-layout-picker-option${
                    activeId === item.id ? ' is-active' : ''
                  }`}
                  onClick={() => applyPack(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </>
          ) : null}

          <div className="bb-home-layout-picker-footer">
            {naming ? (
              <div className="bb-home-layout-picker-save-form">
                <input
                  className="native-control-input px-3"
                  value={name}
                  placeholder="Template name"
                  autoFocus
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      saveTemplate();
                    }
                  }}
                />
                <div className="bb-home-layout-picker-save-actions">
                  <button
                    type="button"
                    className="bb-ghost-btn py-1.5 px-3 text-sm"
                    onClick={() => {
                      setNaming(false);
                      setError('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="bb-primary-btn py-1.5 px-3 text-sm"
                    onClick={saveTemplate}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="bb-home-layout-picker-save"
                disabled={!canSave}
                title={
                  canSave
                    ? 'Save this mix as a reusable template'
                    : 'Mix sections to create a unique layout first'
                }
                onClick={() => {
                  if (!canSave) return;
                  setNaming(true);
                  setError('');
                }}
              >
                Save as template…
              </button>
            )}
            {error ? <p className="bb-home-layout-picker-error">{error}</p> : null}
            {!canSave && !naming ? (
              <p className="bb-home-layout-picker-hint">
                Mix section layouts to unlock a new template.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
