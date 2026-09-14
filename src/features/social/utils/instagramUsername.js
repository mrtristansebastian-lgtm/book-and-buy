/**
 * Instagram-style username rules (display handle / public slug).
 * @see https://help.instagram.com/ (usernames: letters, numbers, periods, underscores)
 */

export const IG_USERNAME_MIN = 1;
export const IG_USERNAME_MAX = 30;
export const IG_NAME_MAX = 30;

/** Normalize typed input toward a valid username candidate (lowercase, strip invalid). */
export function sanitizeUsernameInput(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, IG_USERNAME_MAX);
}

/**
 * @returns {{ ok: true, value: string } | { ok: false, error: string, value: string }}
 */
export function validateInstagramUsername(raw = '') {
  const value = sanitizeUsernameInput(raw);

  if (!value) {
    return { ok: false, error: 'Choose a username.', value };
  }
  if (value.length < IG_USERNAME_MIN || value.length > IG_USERNAME_MAX) {
    return {
      ok: false,
      error: `Usernames must be ${IG_USERNAME_MIN}–${IG_USERNAME_MAX} characters.`,
      value
    };
  }
  if (!/^[a-z0-9._]+$/.test(value)) {
    return {
      ok: false,
      error: 'Usernames can only use letters, numbers, underscores and periods.',
      value
    };
  }
  if (value.startsWith('.') || value.endsWith('.')) {
    return { ok: false, error: 'Usernames can’t start or end with a period.', value };
  }
  if (value.includes('..')) {
    return { ok: false, error: 'Usernames can’t have more than one period in a row.', value };
  }

  return { ok: true, value };
}

export function validateInstagramName(raw = '') {
  const value = String(raw || '').trim().slice(0, IG_NAME_MAX);
  if (!value) {
    return { ok: false, error: 'Add a name.', value };
  }
  return { ok: true, value };
}

export function formatUsernameDisplay(slug = '', fallbackName = '') {
  const fromSlug = sanitizeUsernameInput(slug);
  if (fromSlug) return fromSlug;
  return sanitizeUsernameInput(fallbackName) || 'business';
}
