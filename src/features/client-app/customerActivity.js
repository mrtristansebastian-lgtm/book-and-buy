/** Read-only wording for customer history; persisted values remain untouched. */
export function activityStatusLabel(status = '') {
  const key = String(status || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const labels = {
    manual_pending: 'Awaiting payment',
    awaiting_payment: 'Awaiting payment',
    awaiting_eft: 'Awaiting payment',
    reschedule_requested: 'Reschedule requested',
    waitlist: 'Waitlisted'
  };
  if (Object.prototype.hasOwnProperty.call(labels, key)) return labels[key];
  const text = key.replace(/_/g, ' ');
  return text ? text[0].toUpperCase() + text.slice(1) : '';
}

export function customerOrderTitle(order) {
  const names = (order?.items || []).map((item) => String(item.name || item.productName || '').trim()).filter(Boolean);
  if (!names.length) return 'Product order';
  return names.length === 1 ? names[0] : `${names[0]} + ${names.length - 1} more`;
}

export function customerOrderSummary(order) {
  return (order?.items || []).map((item) => {
    const name = String(item.name || item.productName || '').trim();
    if (!name) return '';
    const quantity = Number(item.quantity);
    return Number.isFinite(quantity) && quantity > 0 ? `${quantity} × ${name}` : name;
  }).filter(Boolean).join(' · ');
}
