import { fontStylePresets } from '../../../config/appConfig';
import { getFontFamily } from '../../../data/fonts';

export function TypographyRoom({ settings, onApplyPreset }) {
  return (
    <>
      <div className="cinema-control-title">
        <span>Font style</span>
        <small>Apply a polished preset designed to keep the page balanced.</small>
      </div>
      <div className="cinema-font-grid">
        {fontStylePresets.map(preset => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onApplyPreset(preset)}
            className={(settings.headingFontFamily || settings.fontFamily) === (preset.headingFontFamily || preset.fontFamily) ? 'is-active' : ''}
            aria-label={`${preset.label}: ${preset.note}`}
            title={`${preset.label} - ${preset.note}`}
          >
            <span
              className="cinema-font-preview-glyph"
              style={{ fontFamily: getFontFamily(preset.headingFontFamily || preset.fontFamily) }}
              aria-hidden="true"
            >Aa</span>
            <span className="cinema-font-preview-copy">
              <strong style={{ fontFamily: getFontFamily(preset.headingFontFamily || preset.fontFamily) }}>{preset.label}</strong>
              <small style={{ fontFamily: getFontFamily(preset.bodyFontFamily || preset.fontFamily) }}>{preset.note}</small>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
