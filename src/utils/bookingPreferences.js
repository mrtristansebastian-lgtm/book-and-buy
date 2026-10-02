export function parseCancellationNotice(value = '') {
  const match = String(value).trim().match(/^(\d{1,4})\s+(hours?|days?|weeks?)$/i);
  if (!match || Number(match[1]) < 1) return null;
  return { amount: Number(match[1]), unit: match[2].toLowerCase().replace(/s$/, '') + 's' };
}
