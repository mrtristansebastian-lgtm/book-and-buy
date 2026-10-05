import { Button } from './Button';
import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, X } from 'lucide-react';
import { useDialogFocus } from './useDialogFocus';

export function SortField({
  label = 'Sort',
  value,
  onChange,
  options = [],
  pickerTitle = 'Sort by',
  pickerHint = 'Choose how this list is ordered.',
  disabled = false
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  useDialogFocus(panelRef, open, () => setOpen(false));
  const selected = useMemo(
    () => options.find((option) => option.id === value) || options[0] || null,
    [options, value]
  );

  const choose = (nextValue) => {
    onChange?.(nextValue);
    setOpen(false);
  };

  return (
    <>
      <div className={`bb-sort-field${disabled ? ' is-disabled' : ''}`}>
        <span className="bb-sort-field-label">{label}</span>
        <div className="bb-sort-field-control">
          <button
            type="button"
            className="bb-sort-field-value"
            disabled={disabled}
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={`${label}: ${selected?.label || 'Choose'}`}
          >
            <span className={selected ? '' : 'is-placeholder'}>
              {selected?.label || 'Choose'}
            </span>
            <ChevronDown size={14} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {open && typeof document !== 'undefined' ? createPortal(
        <div className="bb-sort-picker-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div
            ref={panelRef}
            tabIndex={-1}
            className="bb-sort-picker-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={pickerTitle}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="bb-sort-picker-head">
              <h2 className="bb-sort-picker-title">{pickerTitle}</h2>
              <p className="bb-sort-picker-hint">{pickerHint}</p>
            </header>

            <div className="bb-sort-picker-options">
              {options.map((option) => {
                const active = option.id === selected?.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`bb-sort-picker-option${active ? ' is-active' : ''}`}
                    aria-pressed={active}
                    onClick={() => choose(option.id)}
                  >
                    <span>{option.label}</span>
                    {active ? <Check size={16} strokeWidth={2.5} /> : null}
                  </button>
                );
              })}
            </div>

            <footer className="bb-sort-picker-actions">
              <Button action="close" variant="secondary" type="button" className="bb-ghost-btn" onClick={() => setOpen(false)}>
                <X size={15} /> Close
              </Button>
            </footer>
          </div>
        </div>, document.body
      ) : null}
    </>
  );
}
