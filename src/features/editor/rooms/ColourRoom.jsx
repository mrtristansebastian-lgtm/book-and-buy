import { useState } from 'react';
import { Check, ChevronLeft, Copy, Pencil, Pipette, RefreshCw } from 'lucide-react';

import {
  getColorInputValue,
  normalizeCssColor,
  normalizeHexColor
} from '../../../utils/theme';

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

  if (activeGroup) {
    const editingColorValue = editingControl
      ? normalizeCssColor(editingControl.value, editingControl.fallback || '#050505')
      : '';
    const editingDisplayColor = editingControl
      ? getColorInputValue(codeDraft || editingColorValue, editingControl.fallback || '#050505')
      : '#050505';

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
            <div>
              <span>{activeGroup.title}</span>
              <small>Tune the exact elements in this category.</small>
            </div>
          </div>
          <div className="editor-color-category-controls">
            {activeGroup.controls.map((control) => {
              const colorValue = normalizeCssColor(control.value, control.fallback || '#050505');
              const displayColor = getColorInputValue(colorValue, control.fallback || '#050505');
              return (
                <div
                  key={control.id}
                  className="editor-color-control-row"
                  style={{ '--editor-row-color': displayColor, '--editor-row-css-color': colorValue }}
                >
                  <span className="editor-color-drop-swatch" />
                  <div className="editor-color-control-copy">
                    <b>{control.label}</b>
                    <small>{control.note}</small>
                  </div>
                  {detectedBrandSwatches.length > 0 && (
                    <div className="editor-color-tile-options" aria-label={`${control.label} logo colour options`}>
                      {detectedBrandSwatches.slice(0, 4).map(color => {
                        const optionColor = normalizeHexColor(color, '');
                        return optionColor ? (
                          <button
                            key={`${control.id}-${optionColor}`}
                            type="button"
                            className={optionColor === displayColor ? 'is-active' : ''}
                            onClick={() => onApplyControlColor(control, optionColor)}
                            style={{ backgroundColor: optionColor }}
                            aria-label={`Set ${control.label} to ${optionColor}`}
                          />
                        ) : null;
                      })}
                    </div>
                  )}
                  <button
                    type="button"
                    className="editor-color-drop-plus"
                    title={`Edit ${control.label} colour`}
                    onClick={(event) => {
                      event.stopPropagation();
                      openColorEditor(control);
                    }}
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
        {editingControl && (
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
                <span className="editor-color-drop-swatch" />
                <div>
                  <b>{editingControl.label}</b>
                  <small>{editingControl.note}</small>
                </div>
                <button type="button" className="editor-color-spectrum-close" onClick={closeColorEditor} aria-label="Close colour editor">
                  ×
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
        )}
      </div>
    );
  }

  return (
    <div className="palette-flow-room color-system-room">
      <div className="editor-color-sync-note">
        <span><Pipette size={14} /></span>
        <p>{scopeLabel ? `${scopeLabel} has its own colours.` : 'Logo colours appear as small options after brand media is uploaded.'}</p>
        {onUseBookingColors ? (
          <button type="button" onClick={onUseBookingColors}>
            <RefreshCw size={14} />
            Use Booking colours
          </button>
        ) : (
          <button type="button" onClick={onResetColors}>
            <RefreshCw size={14} />
            Reset colours
          </button>
        )}
      </div>
      {!onUseBookingColors && <div className="cinema-gradient-mode is-single" role="group" aria-label="Native gradient">
        <button type="button" onClick={() => onNativeAccentChange(!nativeAccent)} className={`editor-native-gradient-toggle ${nativeAccent ? 'is-on' : ''}`} aria-pressed={nativeAccent}>
          <span>Native gradient</span>
          <i aria-hidden="true" />
        </button>
      </div>}
      <div className="cinema-control-title is-compact">
        <span>Element colour board</span>
        <small>Choose a category to edit its colours.</small>
      </div>
      <div className="editor-color-category-board" aria-label="Booking page colour categories">
        {groups.map((group) => {
          const previewColors = group.controls
            .map(control => getColorInputValue(control.value || '', control.fallback || '#050505'))
            .filter(Boolean);
          const leadColor = previewColors[0] || '#050505';
          return (
            <button
              key={group.id}
              type="button"
              className="editor-color-category-tile"
              style={{ '--editor-category-color': leadColor }}
              onClick={() => onSelectCategory(group.id)}
            >
              <div className="editor-color-category-head">
                <div>
                  <span>{group.title}</span>
                  <small>{group.controls.length} colours</small>
                </div>
                <div className="editor-color-category-preview" aria-hidden="true">
                  {previewColors.slice(0, 4).map((color, index) => (
                    <i key={`${group.id}-${color}-${index}`} style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
