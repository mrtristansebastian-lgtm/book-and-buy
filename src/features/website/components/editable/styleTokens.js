export const STYLE_TOKEN_GRADIENT = 'gradient';

export const BRAND_SWATCHES = [
  '#101828',
  '#475467',
  '#ffffff',
  '#f2f4f7',
  '#e8b923',
  '#12f0cf',
  '#b9e3ff',
  '#ffd4f2',
  '#d3ff5f',
  '#7a5cff'
];

export function readStyleToken(website, key) {
  if (!key) return null;
  const value = website?.styleTokens?.[key];
  if (value == null || value === '') return null;
  return String(value);
}

export function isGradientToken(value) {
  return value === STYLE_TOKEN_GRADIENT || value == null || value === '';
}

export function isSolidColorToken(value) {
  return typeof value === 'string' && value.startsWith('#');
}

export function patchStyleToken(patchWebsite, key, value) {
  if (!patchWebsite || !key) return;
  patchWebsite({
    styleTokens: {
      [key]: value == null ? '' : value
    }
  });
}

export function styleTokenColor(value, fallback = '') {
  return isSolidColorToken(value) ? value : fallback;
}
