import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Copy,
  Layers,
  Palette,
  Pipette,
  RefreshCw,
  Sparkles,
  X
} from 'lucide-react';

import {
  getColorInputValue,
  normalizeCssColor,
  normalizeHexColor
} from '../../../utils/theme';

const groupGuidance = {
  base: {
    tone: 'Foundation',
    summary: 'Page background, headings, and reading colour.',
    moment: 'Seen everywhere'
  },
  action: {
    tone: 'Conversion',
    summary: 'Primary booking button and its label.',
    moment: 'Add to cart'
  },
  calendar: {
    tone: 'Selection',
    summary: 'Selected day and open date tiles.',
    moment: 'Pick a day'
  },
  time: {
    tone: 'Selection',
    summary: 'Available slots and selected time.',
    moment: 'Choose a time'
  },
  services: {
    tone: 'Merchandising',
    summary: 'Service cards, descriptions, and selected service.',
    moment: 'Choose a service'
  },
  faq: {
    tone: 'Support',
    summary: 'Question surfaces, dividers, and answer text.',
    moment: 'FAQ'
  },
  venue: {
    tone: 'Proof',
    summary: 'Venue gallery, map, and location surfaces.',
    moment: 'Venue'
  },
  social: {
    tone: 'Footer',
    summary: 'Social icon fill, mark, and labels.',
    moment: 'Social links'
  },
  'page-base': {
    tone: 'Funnel page',
    summary: 'Background, panels, and dividers for this step.',
    moment: 'Current step'
  },
  'page-type': {
    tone: 'Funnel text',
    summary: 'Headings and helper copy for this step.',
    moment: 'Current step'
  },
  'page-action': {
    tone: 'Funnel action',
    summary: 'Primary button colour for this step.',
    moment: 'Current step'
  }
};

const coreGroupIds = new Set(['base', 'action', 'calendar', 'time', 'page-base', 'page-type', 'page-action']);
const quickControlIds = [
  'background',
  'heading',
  'body',
  'button-fill',
  'button-text',
  'date-active-bg',
  'date-active-text',
  'slot-active-bg',
  'page-bg',
  'page-surface',
  'page-heading',
  'page-accent',
  'page-button-text'
];

const nativeGradientManagedControlIds = new Set(['button-fill', 'date-active-bg', 'slot-active-bg']);

const getControlColor = (control) => normalizeCssColor(control?.value, control?.fallback || '#050505');
const getDisplayColor = (control) => getColorInputValue(getControlColor(control), control?.fallback || '#050505');

const getGroupMeta = (group) => groupGuidance[group.id] || {
  tone: 'Section',
  summary: 'Fine tune this part of the booking page.',
  moment: group.title
};

const getGroupPreviewColors = (group) => group.controls
  .map(control => getColorInputValue(control.value || '', control.fallback || '#050505'))
  .filter(Boolean);

function ColorSwatchStack({ colors, id }) {
  return (
    <div className="editor-color-swatch-stack" aria-hidden="true">
      {colors.slice(0, 5).map((color, index) => (
        <i key={`${id}-${color}-${index}`} style={{ backgroundColor: color }} />
      ))}
    </div>
  );
}

export function ColourRoom({
  activeGroup,
  detectedBrandSwatches,
  groups,
  nativeAccent,
  onApplyControlColor,
  onBack,
  onNativeAccentChange,
  onResetColors,
  onSelectCategory,
  onUseBookingColors,
  scopeLabel
}) {
  const [copiedControlId, setCopiedControlId] = useState('');
  const [editingControl, setEditingControl] = useState(null);
  const [codeDraft, setCodeDraft] = useState('');

  const allControls = useMemo(() => groups.flatMap(group => (
    group.controls.map(control => ({ ...control, groupId: group.id, groupTitle: group.title }))
  )), [groups]);

  const quickControls = useMemo(() => {
    const used = new Set();
    return quickControlIds
      .map(id => allControls.find(control => control.id === id))
      .filter(Boolean)
      .filter(control => {
        if (used.has(control.id)) return false;
        if (nativeAccent && nativeGradientManagedControlIds.has(control.id)) return false;
        used.add(control.id);
        return true;
      })
      .slice(0, 5);
  }, [allControls, nativeAccent]);

  const coreGroups = groups.filter(group => coreGroupIds.has(group.id));
  const advancedGroups = groups.filter(group => !coreGroupIds.has(group.id));
  const brandSwatches = detectedBrandSwatches
    .map(color => normalizeHexColor(color, ''))
    .filter(Boolean)
    .slice(0, 8);

  const copyColorCode = async (control, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedControlId(control.id);
      window.setTimeout(() => setCopiedControlId(''), 1200);
    } catch {
      setCopiedControlId('');
    }
  };

  const applyTypedColorCode = (control, rawValue, fallback) => {
    const typed = String(rawValue || '').trim();
    if (!typed) return;
    const cssColor = normalizeCssColor(typed, fallback);
    if (cssColor) {
      onApplyControlColor(control, cssColor);
      setCodeDraft(cssColor);
    }
  };

  const openColorEditor = (control) => {
    const colorValue = normalizeCssColor(control.value, control.fallback || '#050505');
    setEditingControl(control);
    setCodeDraft(colorValue);
  };

  const closeColorEditor = () => {
    setEditingControl(null);
    setCodeDraft('');
  };

  const renderBrandSwatches = (control, className = '') => brandSwatches.length > 0 && (
    <div className={`editor-color-brand-swatches ${className}`} aria-label={`${control.label} brand colour options`}>
      {brandSwatches.map(color => (
        <button
          key={`${control.id}-${color}`}
          type="button"
          className={color === getDisplayColor(control) ? 'is-active' : ''}
          onClick={() => onApplyControlColor(control, color)}
          style={{ backgroundColor: color }}
          aria-label={`Set ${control.label} to ${color}`}
        />
      ))}
    </div>
  );

  const renderControlCard = (control, mode = 'detail') => {
    const colorValue = getControlColor(control);
    const displayColor = getDisplayColor(control);
    return (
      <article
        key={control.id}
        className={`editor-color-control-card is-${mode}`}
        style={{ '--editor-row-color': displayColor, '--editor-row-css-color': colorValue }}
      >
        <label className="editor-color-control-swatch" aria-label={`Pick ${control.label} colour`}>
          <input
            type="color"
            value={displayColor}
            onChange={(event) => onApplyControlColor(control, event.target.value)}
          />
          <span />
        </label>
        <div className="editor-color-control-copy">
          <span className="editor-color-control-kicker">{control.groupTitle || activeGroup?.title || 'Colour'}</span>
          <b>{control.label}</b>
          <small>{control.note}</small>
        </div>
        <div className="editor-color-control-actions">
          <button
            type="button"
            className="editor-color-value-pill"
            onClick={() => openColorEditor(control)}
            title={`Edit ${control.label} colour code`}
          >
            {displayColor}
          </button>
          <label
            className="editor-color-icon-button"
            title={`Open ${control.label} colour picker`}
            aria-label={`Advanced edit ${control.label}`}
          >
            <input
              type="color"
              value={displayColor}
              onChange={(event) => onApplyControlColor(control, event.target.value)}
              aria-label={`Pick ${control.label} colour`}
            />
            <Pipette size={13} />
          </label>
        </div>
        {mode === 'detail' && renderBrandSwatches(control)}
      </article>
    );
  };

  const renderGroupTile = (group) => {
    const meta = getGroupMeta(group);
    const previewColors = getGroupPreviewColors(group);
    const leadColor = previewColors[0] || '#050505';
    return (
      <button
        key={group.id}
        type="button"
        className="editor-color-category-tile"
        style={{ '--editor-category-color': leadColor }}
        onClick={() => onSelectCategory(group.id)}
      >
        <div className="editor-color-category-topline">
          <span>{meta.tone}</span>
          <ColorSwatchStack colors={previewColors} id={group.id} />
        </div>
        <div className="editor-color-category-copy">
          <b>{group.title}</b>
          <small>{meta.summary}</small>
        </div>
        <div className="editor-color-category-footer">
          <span>{group.controls.length} colours</span>
          <ArrowRight size={14} />
        </div>
      </button>
    );
  };

  const editingColorValue = editingControl
    ? normalizeCssColor(editingControl.value, editingControl.fallback || '#050505')
    : '';
  const editingDisplayColor = editingControl
    ? getColorInputValue(codeDraft || editingColorValue, editingControl.fallback || '#050505')
    : '#050505';

  const renderColorEditorModal = () => editingControl && (
    <div className="editor-color-spectrum-overlay" role="presentation" onClick={closeColorEditor}>
      <section
        className="editor-color-spectrum-popover"
        role="dialog"
        aria-modal="true"
        aria-label={`${editingControl.label} colour editor`}
        style={{ '--editor-spectrum-color': editingDisplayColor }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="editor-color-spectrum-head">
          <span className="editor-color-modal-swatch" />
          <div>
            <b>{editingControl.label}</b>
            <small>{editingControl.note}</small>
          </div>
          <button type="button" className="editor-color-spectrum-close" onClick={closeColorEditor} aria-label="Close colour editor">
            <X size={14} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
        <label className="editor-color-spectrum-picker">
          <span>Spectrum</span>
          <input
            type="color"
            value={editingDisplayColor}
            onChange={(event) => {
              setCodeDraft(event.target.value);
              onApplyControlColor(editingControl, event.target.value);
            }}
            aria-label={`Edit ${editingControl.label.toLowerCase()} colour`}
          />
        </label>
        {renderBrandSwatches(editingControl, 'is-modal')}
        <div className="editor-color-spectrum-code-row">
          <input
            className="editor-color-spectrum-code"
            type="text"
            value={codeDraft || editingColorValue}
            spellCheck="false"
            aria-label={`${editingControl.label} colour code`}
            onChange={(event) => setCodeDraft(event.currentTarget.value)}
            onBlur={(event) => applyTypedColorCode(editingControl, event.currentTarget.value, editingColorValue)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              applyTypedColorCode(editingControl, event.currentTarget.value, editingColorValue);
              event.currentTarget.blur();
            }}
          />
          <button
            type="button"
            className="editor-color-copy-button"
            title={`Copy ${editingControl.label} colour code`}
            onClick={() => copyColorCode(editingControl, normalizeCssColor(codeDraft || editingColorValue, editingColorValue))}
          >
            {copiedControlId === editingControl.id ? <Check size={13} /> : <Copy size={13} />}
            <span>Copy</span>
          </button>
        </div>
      </section>
    </div>
  );

  if (activeGroup) {
    const meta = getGroupMeta(activeGroup);
    const activeColors = getGroupPreviewColors(activeGroup);
    return (
      <div className="palette-flow-room color-system-room">
        <section
          className="editor-color-category-detail editor-color-category-screen"
          style={{
            '--editor-category-color': normalizeHexColor(
              getColorInputValue(activeGroup.controls[0]?.value || '', activeGroup.controls[0]?.fallback || '#050505'),
              activeGroup.controls[0]?.fallback || '#050505'
            )
          }}
        >
          <div className="editor-color-category-detail-head">
            <button
              type="button"
              className="editor-color-back-button"
              onPointerDown={onBack}
              onClick={onBack}
              aria-label="Back to colour categories"
            >
              <ChevronLeft size={15} />
              Back
            </button>
            <div className="editor-color-detail-title">
              <span>{activeGroup.title}</span>
              <small>{meta.summary}</small>
            </div>
            <ColorSwatchStack colors={activeColors} id={`${activeGroup.id}-detail`} />
          </div>

          {brandSwatches.length > 0 && (
            <div className="editor-color-brand-strip">
              <span><Pipette size={13} /> Brand picks</span>
              <div>
                {brandSwatches.map(color => (
                  <i key={`${activeGroup.id}-brand-${color}`} style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
          )}

          <div className="editor-color-category-controls">
            {activeGroup.controls.map(control => renderControlCard(control, 'detail'))}
          </div>
        </section>
        {renderColorEditorModal()}
      </div>
    );
  }

  return (
    <div className="palette-flow-room color-system-room">
      <section className="editor-color-command-card">
        <div className="editor-color-command-head">
          <span className="editor-color-command-icon"><Palette size={15} /></span>
          <div>
            <b>{scopeLabel ? `${scopeLabel} colours` : 'Booking palette'}</b>
            <small>{scopeLabel ? `${scopeLabel} can override the booking palette.` : 'Start with the colours people see first.'}</small>
          </div>
        </div>
        <div className="editor-color-command-actions">
          {onUseBookingColors ? (
            <button type="button" onClick={onUseBookingColors}>
              <RefreshCw size={14} />
              Use Booking colours
            </button>
          ) : (
            <>
              <button type="button" onClick={onResetColors}>
                <RefreshCw size={14} />
                Reset
              </button>
              <button
                type="button"
                onClick={() => onNativeAccentChange(!nativeAccent)}
                className={`editor-native-gradient-toggle ${nativeAccent ? 'is-on' : ''}`}
                aria-pressed={nativeAccent}
              >
                <Sparkles size={14} />
                Native gradient
                <i aria-hidden="true" />
              </button>
            </>
          )}
        </div>
        {!onUseBookingColors && nativeAccent && (
          <div className="editor-color-native-note">
            <Sparkles size={13} />
            <span>Native gradient is driving primary buttons and selected-state fills. Turn it off for exact solid colours there.</span>
          </div>
        )}
      </section>

      {quickControls.length > 0 && (
        <section className="editor-color-quick-panel">
          <div className="cinema-control-title is-compact">
            <span>High impact colours</span>
            <small>Edit these first; they drive the page, buttons, and selected states.</small>
          </div>
          <div className="editor-color-quick-grid">
            {quickControls.map(control => renderControlCard(control, 'quick'))}
          </div>
        </section>
      )}

      <section className="editor-color-groups-panel">
        <div className="cinema-control-title is-compact">
          <span>Colour areas</span>
          <small>Open a focused area when you need exact control.</small>
        </div>
        <div className="editor-color-category-section">
          <div className="editor-color-section-label">
            <Layers size={13} />
            Core flow
          </div>
          <div className="editor-color-category-board" aria-label="Core booking page colour categories">
            {coreGroups.map(renderGroupTile)}
          </div>
        </div>
        {advancedGroups.length > 0 && (
          <div className="editor-color-category-section">
            <div className="editor-color-section-label">
              <Pipette size={13} />
              Supporting sections
            </div>
            <div className="editor-color-category-board" aria-label="Supporting booking page colour categories">
              {advancedGroups.map(renderGroupTile)}
            </div>
          </div>
        )}
      </section>
      {renderColorEditorModal()}
    </div>
  );
}
