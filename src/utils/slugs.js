export const normalizeHandle = (value = '') => (
  value
    .trim()
    .replace(/^https?:\/\/(www\.)?/i, '')
    .replace(/^(instagram\.com|tiktok\.com|facebook\.com|fb\.com)\//i, '')
    .replace(/^@/, '')
    .replace(/\/$/, '')
);

export const buildBookingSlug = (businessName = '', instagram = '') => {
  const source = normalizeHandle(instagram) || businessName || 'my-business';
  return source
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 42) || 'my-business';
};
