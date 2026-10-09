import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import './setup-picker.css';

/** A shared setup menu that stays inside the editor's keyboard focus boundary. */
export function SetupPicker({ value = '', options = [], onChange, label = 'Choose an option', placeholder = 'Choose…', searchable = false, className = '', disabled = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState(null);
  const root = useRef(null);
  const trigger = useRef(null);
  const menu = useRef(null);
  const search = useRef(null);
  const id = useId();
  const selected = options.find(option => String(option.value) === String(value));
  const filtered = options.filter(option => `${option.label} ${option.description || ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const close = (restore = true) => { setOpen(false); if (restore) trigger.current?.focus({ preventScroll: true }); };

  useEffect(() => {
    if (!open) return undefined;
    const place = () => {
      if (!trigger.current) return;
      const rect = trigger.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop || 0;
      const viewportHeight = viewport?.height || window.innerHeight;
      const availableBelow = viewportTop + viewportHeight - rect.bottom - 16;
      const availableAbove = rect.top - viewportTop - 16;
      const above = availableBelow < 240 && availableAbove > availableBelow;
      const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 24);
      setPosition({ left: Math.min(Math.max(12, rect.left), window.innerWidth - width - 12), width, maxHeight: Math.max(80, Math.min(380, above ? availableAbove : availableBelow)), ...(above ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }) });
    };
    place();
    const frame = requestAnimationFrame(() => {
      if (searchable) search.current?.focus({ preventScroll: true });
      else (menu.current?.querySelector('[aria-selected="true"]') || menu.current?.querySelector('[role="option"]'))?.focus({ preventScroll: true });
    });
    const outside = event => { if (!root.current?.contains(event.target)) close(false); };
    const scroll = event => { if (!menu.current?.contains(event.target)) place(); };
    const resize = place;
    document.addEventListener('pointerdown', outside);
    document.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('pointerdown', outside); document.removeEventListener('scroll', scroll, true); window.removeEventListener('resize', resize); window.visualViewport?.removeEventListener('resize', resize); };
  }, [open, searchable]);

  const keyboard = event => {
    if (!open) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key === 'Tab') { close(false); return; }
    const items = [...(menu.current?.querySelectorAll('[role="option"]:not(:disabled)') || [])];
    const index = items.indexOf(document.activeElement);
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % items.length;
    if (event.key === 'ArrowUp') next = index <= 0 ? items.length - 1 : index - 1;
    if (document.activeElement !== search.current && event.key === 'Home') next = 0;
    if (document.activeElement !== search.current && event.key === 'End') next = items.length - 1;
    if (next !== undefined && items.length) { event.preventDefault(); items[next]?.focus(); }
  };

  return <div className={`bb-setup-picker ${className}`} ref={root} onKeyDown={keyboard} onKeyDownCapture={event => {
    // Editor focus traps listen on their panel before React's bubbling handlers.
    if (open && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
  }}>
    <button type="button" ref={trigger} className="bb-setup-picker-trigger" disabled={disabled} aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => { setQuery(''); setOpen(previous => !previous); }}
      onKeyDown={event => { if (!open && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setQuery(''); setOpen(true); } }}>
      <span className={selected ? '' : 'is-placeholder'}>{selected?.label || placeholder}</span><ChevronDown size={16} aria-hidden="true"/>
    </button>
    {open && <div ref={menu} className="bb-setup-picker-menu" style={position || { visibility: 'hidden' }}>
      {searchable && <div className="bb-setup-picker-search"><Search size={15} aria-hidden="true"/><input ref={search} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search options…" aria-label={`Search ${label.toLowerCase()}`}/></div>}
      <div className="bb-setup-picker-options" role="listbox" aria-label={label} id={id}>
        {filtered.map(option => <button key={option.value} type="button" role="option" tabIndex={-1} aria-selected={String(option.value) === String(value)} disabled={option.disabled} onClick={() => { onChange?.(option.value); close(); }}><span>{option.label}{option.description && <small>{option.description}</small>}</span>{String(option.value) === String(value) && <Check size={15} aria-hidden="true"/>}</button>)}
        {!filtered.length && <p className="bb-setup-picker-empty">No matching options.</p>}
      </div>
    </div>}
  </div>;
}
