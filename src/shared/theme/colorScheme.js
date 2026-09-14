/**
 * Color scheme preference — device-local, applied on <html>.
 */

const STORAGE_KEY = 'book-and-buy.color-scheme';

export function getColorScheme() {
  try {
    const value = String(localStorage.getItem(STORAGE_KEY) || '').trim().toLowerCase();
    if (value === 'dark' || value === 'light') return value;
  } catch {
    /* ignore */
  }
  return 'light';
}

export function applyColorScheme(scheme) {
  const next = scheme === 'dark' ? 'dark' : 'light';
  const root = document.documentElement;
  root.dataset.theme = next;
  root.style.colorScheme = next;
  return next;
}

export function setColorScheme(scheme) {
  const next = applyColorScheme(scheme);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  return next;
}

export function toggleColorScheme() {
  return setColorScheme(getColorScheme() === 'dark' ? 'light' : 'dark');
}
