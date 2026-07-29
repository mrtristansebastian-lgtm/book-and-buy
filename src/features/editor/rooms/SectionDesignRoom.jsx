import { useState } from 'react';
import { Check, Pipette, X } from 'lucide-react';

import { getColorInputValue, normalizeHexColor } from '../../../utils/theme';

const quickColours = [
  '#000000', '#FFFFFF', '#F4F4F5', '#E7FF6A',
  '#BFF5D2', '#B9E3FF', '#D2CBFF', '#FFD4F2',
  '#FFB86B', '#FF6B6B', '#22C55E', '#2563EB'
];

const isOptionSelected = (option, group, settings) => (
  typeof option.isSelected === 'function'
    ? option.isSelected(settings)
    : settings[group.settingKey] === option.value
);

export function SectionDesignRoom({
  colourGroup,
  colourInFieldGroup = false,
  fieldGroupHelper = 'Only completed profiles appear on the booking page.',
  fieldGroupTitle = 'Links',
  fields = [],
  groups = [],
  groupsInColourGroup = false,
  onApplyControlColor,
  onSettingChange,
  settings
}) {
  const colourControls = colourGroup?.controls || [];
  const inlineColourControls = groups.flatMap(group => group.colourControls || []);
  const allColourControls = [...colourControls, ...inlineColourControls];
  const [activeColourId, setActiveColourId] = useState('');
  const activeColour = allColourControls.find(control => control.id === activeColourId) || null;
  const activeColourValue = activeColour
    ? getColorInputValue(activeColour.value || '', activeColour.fallback || '#050505')
    : '#050505';
  const documentColours = Array.from(new Set(allColourControls.map(control => (
    getColorInputValue(control.value || '', control.fallback || '#050505')
  ))));

  const applyOption = (group, option) => {
    if (option.patch) {
      Object.entries(option.patch).forEach(([key, value]) => onSettingChange(key, value));
      return;
    }
    onSettingChange(group.settingKey, option.value);
  };

  const updateNestedField = (field, value) => {
    if (!field.objectKey) {
      onSettingChange(field.key, value);
      return;
    }
    onSettingChange(field.objectKey, {
      ...(settings[field.objectKey] || {}),
      [field.key]: value
    });
  };

  const renderColourStudio = (controls = []) => controls.length > 0 ? (
    <>
      <div className="editor-colour-targets" aria-label="Colour targets">
        {controls.map((control) => {
          const value = getColorInputValue(control.value || '', control.fallback || '#050505');
          return (
            <button
              key={control.id}
              type="button"
              className={activeColour?.id === control.id ? 'is-active' : ''}
              aria-pressed={activeColour?.id === control.id}
              onClick={() => setActiveColourId(control.id)}
            >
              <i style={{ backgroundColor: value }} aria-hidden="true" />
              <span>
                <b>{control.label}</b>
                <small>{value.toUpperCase()}</small>
              </span>
              {activeColour?.id === control.id ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>

      {activeColour && controls.some(control => control.id === activeColour.id) ? (
        <div
          className="editor-colour-workbench"
          role="dialog"
          aria-label={`Edit ${activeColour.label} colour`}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setActiveColourId('');
          }}
        >
          <button type="button" className="editor-colour-close" aria-label="Close colour editor" onClick={() => setActiveColourId('')}>
            <X size={15} aria-hidden="true" />
          </button>
          <div className="editor-colour-active-row">
            <label className="editor-colour-native-picker" style={{ '--active-colour': activeColourValue }}>
              <Pipette size={17} aria-hidden="true" />
              <input
                type="color"
                value={activeColourValue}
                aria-label={`Open ${activeColour.label} colour picker`}
                onChange={(event) => onApplyControlColor(activeColour, event.target.value)}
              />
            </label>
            <span>
              <b>{activeColour.label}</b>
              <small>{activeColour.note}</small>
            </span>
            <label className="editor-colour-hex-field">
              <span>#</span>
              <input
                key={`${activeColour.id}-${activeColourValue}`}
                type="text"
                defaultValue={activeColourValue.slice(1).toUpperCase()}
                aria-label={`${activeColour.label} hex colour`}
                maxLength={6}
                onBlur={(event) => {
                  const nextColour = normalizeHexColor(`#${event.target.value}`, '');
                  if (nextColour) onApplyControlColor(activeColour, nextColour);
                  else event.target.value = activeColourValue.slice(1).toUpperCase();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur();
                }}
              />
            </label>
          </div>

          <div className="editor-colour-palette-group">
            <span>Quick colours</span>
            <div className="editor-colour-palette-grid">
              {quickColours.map(color => (
                <button
                  key={color}
                  type="button"
                  className={color.toLowerCase() === activeColourValue.toLowerCase() ? 'is-selected' : ''}
                  style={{ '--palette-colour': color }}
                  aria-label={`Set ${activeColour.label} to ${color}`}
                  aria-pressed={color.toLowerCase() === activeColourValue.toLowerCase()}
                  onClick={() => onApplyControlColor(activeColour, color)}
                >
                  {color.toLowerCase() === activeColourValue.toLowerCase() ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : null}
                </button>
              ))}
            </div>
          </div>

          <div className="editor-colour-palette-group is-document-colours">
            <span>Used in this section</span>
            <div className="editor-colour-palette-grid">
              {documentColours.map(color => (
                <button
                  key={color}
                  type="button"
                  style={{ '--palette-colour': color }}
                  aria-label={`Reuse ${color} for ${activeColour.label}`}
                  onClick={() => onApplyControlColor(activeColour, color)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  ) : null;

  const colourStudio = colourGroup ? renderColourStudio(colourControls) : null;

  return (
    <div className="editor-section-design-room">
      {!groupsInColourGroup && groups.map((group) => (
        <fieldset key={group.id} className="editor-section-setting-group">
          <legend>
            <span>{group.label}</span>
            <small>{group.helper}</small>
          </legend>
          <div className="editor-section-option-grid">
            {group.options.map((option) => {
              const selected = isOptionSelected(option, group, settings);
              const OptionIcon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={selected ? 'is-active' : ''}
                  aria-pressed={selected}
                  onClick={() => applyOption(group, option)}
                >
                  {OptionIcon ? <OptionIcon size={16} aria-hidden="true" /> : null}
                  <span>
                    <b>{option.label}</b>
                    {option.detail ? <small>{option.detail}</small> : null}
                  </span>
                  <i aria-hidden="true">{selected ? <Check size={12} strokeWidth={3} /> : null}</i>
                </button>
              );
            })}
          </div>
          {group.colourControls?.length > 0 ? (
            <div className="editor-inline-colour-studio editor-colour-studio">
              <div className="editor-inline-setting-heading">
                <span>{group.colourTitle || 'Affected colours'}</span>
                <small>{group.colourHelper || 'Set the solid colours used by this option.'}</small>
              </div>
              {renderColourStudio(group.colourControls)}
            </div>
          ) : null}
        </fieldset>
      ))}

      {fields.length > 0 ? (
        <fieldset className={`editor-section-setting-group ${colourInFieldGroup ? 'editor-colour-studio editor-combined-colour-field-group' : ''}`}>
          <legend>
            <span>{fieldGroupTitle}</span>
            <small>{fieldGroupHelper}</small>
          </legend>
          <div className="editor-section-field-grid">
            {fields.map((field) => (
              <label key={`${field.objectKey || 'root'}-${field.key}`} className={field.fullWidth ? 'is-full-width' : undefined}>
                <span>{field.label}</span>
                <input
                  type="text"
                  value={field.objectKey ? settings[field.objectKey]?.[field.key] || '' : settings[field.key] || ''}
                  placeholder={field.placeholder}
                  onChange={(event) => updateNestedField(field, event.target.value)}
                />
              </label>
            ))}
          </div>
          {colourInFieldGroup ? colourStudio : null}
        </fieldset>
      ) : null}

      {colourGroup && !colourInFieldGroup ? (
        <fieldset className="editor-section-setting-group editor-colour-studio">
          <legend>
            <span>{colourGroup.title || 'Colours'}</span>
            <small>Choose an element, then set its colour.</small>
          </legend>
          {groupsInColourGroup && groups.length > 0 ? (
            <div className="editor-colour-setting-groups">
              {groups.map((group) => (
                <div key={group.id} className="editor-section-setting-group is-inline-setting-group">
                  <div className="editor-inline-setting-heading">
                    <span>{group.label}</span>
                    <small>{group.helper}</small>
                  </div>
                  <div className="editor-section-option-grid">
                    {group.options.map((option) => {
                      const selected = isOptionSelected(option, group, settings);
                      const OptionIcon = option.icon;
                      return (
                        <button
                          key={String(option.value)}
                          type="button"
                          className={selected ? 'is-active' : ''}
                          aria-pressed={selected}
                          onClick={() => applyOption(group, option)}
                        >
                          {OptionIcon ? <OptionIcon size={16} aria-hidden="true" /> : null}
                          <span>
                            <b>{option.label}</b>
                            {option.detail ? <small>{option.detail}</small> : null}
                          </span>
                          <i aria-hidden="true">{selected ? <Check size={12} strokeWidth={3} /> : null}</i>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {colourStudio}
        </fieldset>
      ) : null}
    </div>
  );
}
