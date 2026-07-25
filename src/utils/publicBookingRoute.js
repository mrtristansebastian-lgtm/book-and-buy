export const guestModeStorageKey = 'build-a-booking-guest-mode';
export const exampleModeStorageKey = 'build-a-booking-example-mode-v2';
export const exampleModeDisabledStorageKey = 'build-a-booking-example-mode-disabled-v1';
export const guestPublicPreviewStorageKey = 'build-a-booking-guest-public-preview-v2';
export const guestPublicPreviewStorageVersion = 4;
export const legacyExampleModeStorageKey = 'build-a-booking-example-mode-v1';
export const legacyGuestPublicPreviewStorageKey = 'build-a-booking-guest-public-preview-v1';

export const safeLocalGet = (key) => {
  try {
    return typeof window !== 'undefined' ? window.localStorage?.getItem(key) || null : null;
  } catch {
    return null;
  }
};

export const getPublicBookingSlug = () => {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  const querySlug = url.searchParams.get('book') || url.searchParams.get('workspace');
  if (querySlug) return querySlug.trim().toLowerCase();
  const hashBookMatch = url.hash.match(/^#\/book\/([^/?#]+)/i);
  if (hashBookMatch?.[1]) return decodeURIComponent(hashBookMatch[1]).trim().toLowerCase();
  const [, section, slug] = url.pathname.split('/');
  if (section === 'book' && slug) return slug.trim().toLowerCase();
  return '';
};
