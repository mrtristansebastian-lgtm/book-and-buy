import { useMemo } from 'react';
import {
  BRAND_SWATCHES,
  STYLE_TOKEN_GRADIENT,
  isGradientToken,
  isSolidColorToken,
  patchStyleToken,
  readStyleToken
} from './styleTokens';
import { StylePopover } from './StylePopover';

/**
 * Color + optional gradient control hosted in StylePopover.
 */
export function EditableColor({
  open,
  anchorRef,
  website,
  patchWebsite,
  tokenId,
  title = 'Color',
  allowGradient = false,
  onClose,
  placement = 'near-target'
}) {
  const value = readStyleToken(website, tokenId);
  const usingGradient = allowGradient && isGradientToken(value);
  const solid = isSolidColorToken(value) ? value : '#101828';

  const swatches = useMemo(() => BRAND_SWATCHES, []);

  const setValue = (next) => {
    patchStyleToken(patchWebsite, tokenId, next);
  };

  return (
    <StylePopover
      open={open}
      anchorRef={anchorRef}
      placement={placement}
      title={title}
      onClose={onClose}
      className="bb-style-popover--color"
    >
      {allowGradient ? (
        <div className="bb-style-segmented" role="group" aria-label="Fill style">
          <button
            type="button"
            className={usingGradient ? 'is-active' : ''}
            aria-pressed={usingGradient}
            onClick={() => setValue(STYLE_TOKEN_GRADIENT)}
          >
            Brand gradient
          </button>
          <button
            type="button"
            className={!usingGradient ? 'is-active' : ''}
            aria-pressed={!usingGradient}
            onClick={() => setValue(solid)}
          >
            Fixed color
          </button>
        </div>
      ) : null}

      {!usingGradient ? (
        <>
          <div className="bb-style-swatches" role="list" aria-label="Brand colors">
            {swatches.map((hex) => (
              <button
                key={hex}
                type="button"
                className={`bb-style-swatch${solid.toLowerCase() === hex.toLowerCase() ? ' is-active' : ''}`}
                style={{ background: hex }}
                aria-label={hex}
                aria-pressed={solid.toLowerCase() === hex.toLowerCase()}
                onClick={() => setValue(hex)}
              />
            ))}
          </div>
          <label className="bb-style-custom-color">
            <span>Custom</span>
            <input
              type="color"
              value={solid}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
        </>
      ) : (
        <p className="bb-style-popover-note">Uses the animated brand accent gradient.</p>
      )}

      <button
        type="button"
        className="bb-style-reset"
        onClick={() => {
          setValue(null);
          onClose?.();
        }}
      >
        Reset to default
      </button>
    </StylePopover>
  );
}
