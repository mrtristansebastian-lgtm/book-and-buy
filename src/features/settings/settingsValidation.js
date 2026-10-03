export function validateTeamProfile(draft) {
  if (!String(draft.name || '').trim()) return 'Enter a name for this team profile.';
  const email = String(draft.email || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address, or leave it empty.';
  return '';
}

export function shippingAmount(raw, optional = false) {
  if (String(raw).trim() === '') return optional ? null : undefined;
  const amount = Number(raw);
  const cents = Math.round(amount * 100);
  return Number.isFinite(amount) && amount >= 0 && Number.isSafeInteger(cents) ? cents : undefined;
}
