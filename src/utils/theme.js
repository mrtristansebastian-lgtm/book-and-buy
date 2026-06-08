export const normalizeHexColor = (color, fallback = '#000000') => {
  if (!color || typeof color !== 'string') return fallback;
  const clean = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(clean)) return clean.toUpperCase();
  if (/^#[0-9a-fA-F]{8}$/.test(clean)) return clean.slice(0, 7).toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(clean)) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`.toUpperCase();
  }
  return fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const parseColor = (color) => {
  if (!color || typeof color !== 'string') return null;
  const clean = color.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(clean)) {
    return {
      r: parseInt(`${clean[1]}${clean[1]}`, 16),
      g: parseInt(`${clean[2]}${clean[2]}`, 16),
      b: parseInt(`${clean[3]}${clean[3]}`, 16),
      a: 1
    };
  }
  if (/^#[0-9a-fA-F]{6}$/.test(clean) || /^#[0-9a-fA-F]{8}$/.test(clean)) {
    const hasAlpha = clean.length === 9;
    return {
      r: parseInt(clean.slice(1, 3), 16),
      g: parseInt(clean.slice(3, 5), 16),
      b: parseInt(clean.slice(5, 7), 16),
      a: hasAlpha ? parseInt(clean.slice(7, 9), 16) / 255 : 1
    };
  }
  const rgba = clean.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+)\s*)?\)$/i);
  if (rgba) {
    return {
      r: clamp(Math.round(Number(rgba[1])), 0, 255),
      g: clamp(Math.round(Number(rgba[2])), 0, 255),
      b: clamp(Math.round(Number(rgba[3])), 0, 255),
      a: rgba[4] === undefined ? 1 : clamp(Number(rgba[4]), 0, 1)
    };
  }
  return null;
};

const toHexPair = (value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');

export const getColorInputValue = (color, fallback = '#000000') => {
  const parsed = parseColor(color) || parseColor(fallback);
  if (!parsed) return normalizeHexColor(fallback, '#000000');
  return `#${toHexPair(parsed.r)}${toHexPair(parsed.g)}${toHexPair(parsed.b)}`.toUpperCase();
};

export const getColorAlphaPercent = (color, fallback = 100) => {
  if (typeof color === 'string' && color.trim().toLowerCase() === 'transparent') return 0;
  const parsed = parseColor(color);
  if (!parsed) return fallback;
  return Math.round(clamp(parsed.a, 0, 1) * 100);
};

export const withColorAlpha = (color, alphaPercent, fallback = '#000000') => {
  const parsed = parseColor(color) || parseColor(fallback);
  if (!parsed) return fallback;
  const alpha = clamp(Number(alphaPercent), 0, 100);
  const hex = `#${toHexPair(parsed.r)}${toHexPair(parsed.g)}${toHexPair(parsed.b)}`.toUpperCase();
  if (alpha >= 100) return hex;
  if (alpha <= 0) return 'transparent';
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${(alpha / 100).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')})`;
};

export const normalizeCssColor = (color, fallback = '#000000') => {
  if (typeof color === 'string' && color.trim().toLowerCase() === 'transparent') return 'transparent';
  return withColorAlpha(color, getColorAlphaPercent(color, 100), fallback);
};
