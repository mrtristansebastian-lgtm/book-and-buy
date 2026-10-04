import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/** The same compact, keyboard-operable statistics menu in Finance and Reports. */
export function MetricPicker({ value, options = [], onChange, ariaLabel = 'Choose statistic', className = '', buttonLabel }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const menu = useRef(null);
  const id = useId();
  const selected = options.find((option) => option.id === value) || options[0];
  const close = (restore = true) => {
    setOpen(false);
    if (restore) trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    const current = menu.current;
    const items = [...(current?.querySelectorAll('[role="option"]') || [])];
    const frame = requestAnimationFrame(() => (items.find((item) => item.getAttribute('aria-selected') === 'true') || items[0])?.focus());
    const outside = (event) => { if (!root.current?.contains(event.target)) close(false); };
    document.addEventListener('pointerdown', outside);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('pointerdown', outside); };
  }, [open]);

  const onKeyDown = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key === 'Tab') { close(false); return; }
    const items = [...(menu.current?.querySelectorAll('[role="option"]') || [])];
    const index = items.indexOf(document.activeElement);
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % items.length;
    if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = items.length - 1;
    if (next !== undefined) { event.preventDefault(); items[next]?.focus(); }
  };

  return (
    <div className={`bb-metric-picker ${className}`} ref={root}>
      <button type="button" className="bb-control-trigger bb-sort-field-value bb-metric-picker-trigger" ref={trigger}
        data-selected={open || undefined}
        aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setOpen(true); } }}>
        <span>{buttonLabel || selected?.label || 'Choose statistic'}</span>
        <ChevronDown className="bb-metric-picker-chevron" size={14} aria-hidden="true" />
      </button>
      {open ? (
        <div className="bb-metric-menu" role="listbox" aria-label={ariaLabel} id={id} ref={menu} onKeyDown={onKeyDown}>
          {options.map((option) => (
            <button key={option.id} type="button" role="option" tabIndex={-1} aria-selected={option.id === value}
              onClick={() => { onChange?.(option.id); close(); }}>
              <span><span className="bb-metric-option-label">{option.label}</span>{option.description ? <span className="bb-metric-option-description">{option.description}</span> : null}</span>
              {option.id === value ? <Check size={15} aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
