import { parseInventoryQuantity } from './inventoryModel.js';

/** Prepare an all-or-nothing quantity change against the exact records shown. */
export function buildInventoryAdjustments(units = [], { mode = 'set', value = '' } = {}) {
  const fail = (error) => ({ ok: false, error });
  if (!Array.isArray(units) || !units.length) return fail('Choose at least one inventory item.');
  if (!['set', 'add', 'remove'].includes(mode)) return fail('Choose how you want to change the quantity.');
  const amount = parseInventoryQuantity(value);
  if (amount == null) return fail('Enter a whole quantity of zero or more.');

  const updates = [];
  const previews = [];
  const seen = new Set();
  for (const unit of units) {
    if (!unit || typeof unit.productId !== 'string' || !unit.productId.trim()
      || !unit.source || typeof unit.source !== 'object'
      || (unit.hasVariants && !unit.variantId)
      || (unit.variantId != null && (typeof unit.variantId !== 'string' || !unit.variantId.trim()))) {
      return fail('This inventory item is no longer available. Refresh the page and try again.');
    }
    const variantId = unit.variantId || null;
    const target = JSON.stringify([unit.productId, variantId]);
    if (seen.has(target)) return fail('Each inventory item can only be changed once per batch.');
    seen.add(target);

    // Capture the raw value for the write boundary's stale-quantity check.
    const expectedStockAvailable = unit.source.stockAvailable;
    const before = parseInventoryQuantity(expectedStockAvailable);
    const title = [unit.name || 'This item', unit.variantTitle].filter(Boolean).join(' · ');
    if (mode !== 'set' && before == null) {
      return fail(`${title} needs a starting quantity. Use Set quantity first.`);
    }
    if (mode === 'remove' && amount > before) {
      return fail(`${title} only has ${before} ${before === 1 ? 'unit' : 'units'}. Enter ${before} or less.`);
    }
    const after = mode === 'set' ? amount : mode === 'add' ? before + amount : before - amount;
    if (!Number.isSafeInteger(after) || after < 0) {
      return fail(`That would make ${title}'s quantity too large. Enter a smaller adjustment.`);
    }
    updates.push({
      productId: unit.productId,
      variantId,
      expectedStockAvailable,
      patch: { stockAvailable: String(after) }
    });
    previews.push({
      id: unit.id,
      name: unit.name,
      variantTitle: unit.variantTitle || '',
      before,
      after
    });
  }
  return { ok: true, updates, previews };
}
