/** Costs come from the business catalog at checkout, never browser-supplied totals. */
export function catalogUnitCostCents(item, variant = null) {
  const configured = variant?.cost != null && String(variant.cost).trim() !== '' ? variant.cost : item?.cost;
  if (configured == null || String(configured).trim() === '') return null;
  const text = String(configured).trim();
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
  const cents = Math.round(Number(text) * 100);
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
}

/** A repeated paid notification must not move revenue into a later reporting period. */
export function paymentConfirmationSnapshot(current, now = Date.now()) {
  const paidAt = typeof current?.paidAt === 'number' && Number.isFinite(current.paidAt) && current.paidAt > 0 ? current.paidAt : null;
  if (current?.paymentStatus === 'refunded') return { paymentStatus: 'refunded', ...(paidAt != null ? { paidAt } : {}) };
  if (paidAt != null) return { paymentStatus: 'paid', paidAt };
  // A legacy receipt already marked paid has no recoverable original payment date.
  return current?.paymentStatus === 'paid' ? { paymentStatus: 'paid' } : { paymentStatus: 'paid', paidAt: now,
    ...(typeof current?.amountInCents === 'number' && Number.isSafeInteger(current.amountInCents) && current.amountInCents >= 0 ? { amountPaidInCents: current.amountInCents } : {}) };
}

/** Business costs are private, including in public checkout and client booking replies. */
export function clientTransactionSnapshot(record) {
  const { costBasisInCents, serviceCostInCents, unitCostInCents, ...publicRecord } = record;
  if (Array.isArray(publicRecord.items)) publicRecord.items = publicRecord.items.map(({ unitCostInCents, lineCostInCents, costBasisInCents, ...item }) => item);
  return publicRecord;
}
