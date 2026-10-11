import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { useDetailDialog } from '../../../shared/ui/useDetailDialog';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { buildInventoryUpdates, normalizeProductStatus, productHasVariants } from '../../../utils/products';
import { buildInventoryRows } from '../inventoryModel';

function stockBadge(product) {
  const row = buildInventoryRows([product])[0];
  if (row.attentionCount) return { label: `${row.attentionCount} ${row.attentionCount === 1 ? 'item needs' : 'items need'} attention`, tone: 'warn' };
  if (!row.quantityComplete) return { label: 'Quantity not fully tracked', tone: 'muted' };
  return { label: `${row.knownStockText} in stock`, tone: 'ok' };
}

function InventoryFields({
  values,
  onChange,
  showLabel = false,
  showAvailable = false,
  showQuantity = true,
  warningDefault = 3
}) {
  const dimUnit = values.dimensionUnit || 'cm';
  const { workspace } = useWorkspace();

  return (
    <div className="bb-stock-editor">
      <div className="bb-stock-section">
        <p className="bb-stock-section-label">Inventory</p>
        <div className="bb-stock-grid bb-stock-grid--2">
          {showQuantity ? <label className="bb-products-field">
            <span>SKU</span>
            <input
              className="native-control-input bb-services-control"
              value={values.sku || ''}
              placeholder="SKU-001"
              onChange={(event) => onChange({ sku: event.target.value })}
            />
          </label> : null}
          {showQuantity ? <label className="bb-products-field">
            <span>Quantity</span>
            <input
              className="native-control-input bb-services-control"
              inputMode="numeric"
              value={values.stockAvailable ?? ''}
              placeholder="Leave blank if not tracked"
              onChange={(event) =>
                onChange({
                  stockAvailable: event.target.value
                })
              }
            />
          </label> : null}
          <label className="bb-products-field bb-stock-span">
            <span>Low-stock warning</span>
            <input className="native-control-input bb-services-control" inputMode="numeric" value={values.lowStockThreshold ?? ''} placeholder={String(warningDefault)} onChange={event => onChange({ lowStockThreshold: event.target.value })} />
            <small className="bb-inventory-field-help">Warn when quantity is at or below this number. Blank uses {warningDefault}.</small>
          </label>
          <label className="bb-products-field bb-stock-span">
            <span>Your cost ({workspace.currency || 'R'})</span>
            <input
              className="native-control-input bb-services-control"
              inputMode="decimal"
              value={values.cost ?? ''}
              placeholder="0.00"
              onChange={(event) =>
                onChange({
                  cost: event.target.value
                })
              }
            />
          </label>
        </div>
      </div>

      <div className="bb-stock-section">
        <p className="bb-stock-section-label">Shipping</p>
        <div className="bb-stock-grid bb-stock-grid--shipping">
          <label className="bb-products-field">
            <span>Weight</span>
            <div className="bb-stock-unit-field">
              <input
                className="native-control-input bb-services-control native-control-nest"
                inputMode="decimal"
                value={values.weight ?? ''}
                placeholder="0"
                onChange={(event) =>
                  onChange({
                    weight: event.target.value
                  })
                }
              />
              <select
                className="native-control-input bb-services-control bb-stock-unit-select native-control-nest"
                value={values.weightUnit || 'g'}
                aria-label="Weight unit"
                onChange={(event) =>
                  onChange({ weightUnit: event.target.value })
                }
              >
                <option value="g">g</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </label>
          <label className="bb-products-field">
            <span>Length</span>
            <input
              className="native-control-input bb-services-control"
              inputMode="decimal"
              value={values.length ?? ''}
              placeholder="0"
              onChange={(event) =>
                onChange({
                  length: event.target.value
                })
              }
            />
          </label>
          <label className="bb-products-field">
            <span>Width</span>
            <input
              className="native-control-input bb-services-control"
              inputMode="decimal"
              value={values.width ?? ''}
              placeholder="0"
              onChange={(event) =>
                onChange({
                  width: event.target.value
                })
              }
            />
          </label>
          <label className="bb-products-field">
            <span>Height</span>
            <div className="bb-stock-unit-field">
              <input
                className="native-control-input bb-services-control native-control-nest"
                inputMode="decimal"
                value={values.height ?? ''}
                placeholder="0"
                onChange={(event) =>
                  onChange({
                    height: event.target.value
                  })
                }
              />
              <select
                className="native-control-input bb-services-control bb-stock-unit-select native-control-nest"
                value={dimUnit}
                aria-label="Dimension unit"
                onChange={(event) =>
                  onChange({ dimensionUnit: event.target.value })
                }
              >
                <option value="cm">cm</option>
                <option value="mm">mm</option>
                <option value="in">in</option>
              </select>
            </div>
          </label>
        </div>
      </div>

      {showLabel || showAvailable ? (
        <div className="bb-stock-section">
          <p className="bb-stock-section-label">Display</p>
          {showLabel ? (
            <div className="bb-stock-grid">
              <label className="bb-products-field bb-stock-span">
                <span>Custom stock label</span>
                <input
                  className="native-control-input bb-services-control"
                  value={values.stockLabel || ''}
                  placeholder="e.g. By arrangement"
                  onChange={(event) =>
                    onChange({ stockLabel: event.target.value })
                  }
                />
              </label>
              <label className="bb-products-check bb-stock-span">
                <input
                  type="checkbox"
                  checked={Boolean(values.hideStockOnCard)}
                  onChange={(event) =>
                    onChange({ hideStockOnCard: event.target.checked })
                  }
                />
                <span>Hide stock on Buy card</span>
              </label>
            </div>
          ) : null}
          {showAvailable ? (
            <label className="bb-products-check">
              <input
                type="checkbox"
                checked={values.available !== false}
                onChange={(event) =>
                  onChange({ available: event.target.checked })
                }
              />
              <span>Available to buy</span>
            </label>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function formatDims(item) {
  const unit = item.dimensionUnit || 'cm';
  const parts = [item.length, item.width, item.height]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);
  if (!parts.length) return '—';
  return `${parts.join(' × ')} ${unit}`;
}

function formatWeight(item) {
  const value = String(item.weight ?? '').trim();
  if (!value) return '—';
  return `${value} ${item.weightUnit || 'g'}`;
}

export function StockInfoSheet({ product, onClose, onEdit, variant = 'sheet' }) {
  const dialogRef = useDetailDialog(Boolean(product), onClose, variant === 'page');
  if (!product) return null;
  const badge = stockBadge(product);
  const stockRow = buildInventoryRows([product])[0];
  const status = normalizeProductStatus(product);
  const hasVariants = productHasVariants(product);
  const imageSrc = product.imageUrls?.[0] || '';
  const isPage = variant === 'page';

  const content = (
    <div
      className={`native-ui bb-services-sheet bb-catalog-detail${isPage ? ' is-page' : ''}`}
      ref={dialogRef}
      role={isPage ? 'region' : 'dialog'}
      aria-modal={isPage ? undefined : true}
      aria-labelledby="stock-info-title"
    >
      {isPage ? null : <div className="bb-services-sheet-backdrop" onClick={onClose} />}
      <div className="bb-services-sheet-panel">
        <header className="bb-services-sheet-head">
          <div>
            <p className="bb-services-sheet-eyebrow">Inventory</p>
            <h2 id="stock-info-title" className="bb-services-sheet-title">
              {product.name}
            </h2>
            <p className="bb-services-sheet-lede">Inventory overview for this product.</p>
          </div>
          <button type="button" className="bb-ghost-btn bb-services-sheet-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="bb-services-sheet-body">
          <div className="bb-stock-info">
            <div className="bb-stock-info-hero">
              <div className="bb-stock-info-media">
                {imageSrc ? <img src={imageSrc} alt="" /> : null}
              </div>
              <div className="bb-stock-info-copy">
                <span className="bb-stock-total-pill">{badge.label}</span>
                <p className="bb-muted m-0">
                  {[product.category, status]
                    .filter(Boolean)
                    .join(' · ') || 'Product'}
                  {product.sku ? ` · ${product.sku}` : ''}
                </p>
              </div>
            </div>

            <dl className="bb-stock-info-facts">
              {!hasVariants && <div>
                <dt>SKU</dt>
                <dd>{product.sku || '—'}</dd>
              </div>}
              <div>
                <dt>Quantity</dt>
                <dd>
                  {stockRow.quantityComplete ? stockRow.knownStockText : `${stockRow.knownStockText} known · ${stockRow.counts.unset} not tracked`}
                </dd>
              </div>
              {!hasVariants && <div>
                <dt>Weight</dt>
                <dd>{formatWeight(product)}</dd>
              </div>}
              {!hasVariants && <div>
                <dt>Dimensions</dt>
                <dd>{formatDims(product)}</dd>
              </div>}
              <div>
                <dt>Stock label</dt>
                <dd>{product.stockLabel || '—'}</dd>
              </div>
              <div>
                <dt>Buy card</dt>
                <dd>{product.hideStockOnCard ? 'Stock hidden' : 'Stock visible'}</dd>
              </div>
            </dl>

            {hasVariants ? (
              <div className="bb-stock-info-variants">
                <p className="bb-stock-section-label">Options</p>
                <ul className="bb-stock-info-variant-list">
                  {(product.variants || []).map((variant) => (
                    <li key={variant.id}>
                      <strong>
                        {variant.title ||
                          Object.values(variant.optionValues || {}).join(' / ') ||
                          'Option'}
                      </strong>
                      <span>
                        {[
                          variant.sku ? `SKU ${variant.sku}` : null,
                          variant.stockAvailable !== '' && variant.stockAvailable != null
                            ? `Qty ${variant.stockAvailable}`
                            : 'Qty unset',
                          variant.available === false ? 'Unavailable' : null
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                      <span>{[formatWeight(variant) !== '—' ? formatWeight(variant) : null, formatDims(variant) !== '—' ? formatDims(variant) : null].filter(Boolean).join(' · ')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
        <footer className="bb-services-sheet-footer">
          <div className="bb-services-sheet-footer-actions">
            <Button action="close" variant="secondary" type="button" className="bb-ghost-btn" onClick={onClose}>
              Close
            </Button>
            {onEdit ? (
              <Button action="adjust" icon={SlidersHorizontal} variant="secondary" type="button" className="bb-primary-btn" onClick={() => onEdit(product)}>
                Adjust stock
              </Button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  );
  return isPage ? content : createPortal(content, document.body);
}

export function StockEditSheet({ product, initialVariantId, onClose, onSave, variant = 'sheet' }) {
  const [draft, setDraft] = useState(product);
  const [activeVariantId, setActiveVariantId] = useState(() => initialVariantId === 'product' || product?.variants?.some(item => item.id === initialVariantId) ? initialVariantId : product?.variants?.[0]?.id || 'product');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const originalRef = useRef(product);
  const dialogRef = useDetailDialog(Boolean(product), onClose, false);
  const isPage = variant === 'page';

  useEffect(() => {
    setDraft(product);
    originalRef.current = product;
    setError('');
    setActiveVariantId(initialVariantId === 'product' || product?.variants?.some(item => item.id === initialVariantId) ? initialVariantId : product?.variants?.[0]?.id || 'product');
  }, [product?.id, initialVariantId]);

  if (!product) return null;

  const hasVariants = productHasVariants(draft);
  const activeVariant = draft.variants?.find((item) => item.id === activeVariantId);
  const patch = (partial) => { setError(''); setDraft((prev) => ({ ...prev, ...partial })); };
  const patchVariant = (variantId, partial) => {
    setError('');
    setDraft((prev) => ({
      ...prev,
      variants: (prev.variants || []).map((variant) =>
        variant.id === variantId ? { ...variant, ...partial } : variant
      )
    }));
  };

  const save = async () => {
    if (saving) return; setSaving(true); setError('');
    try {
      const result = await onSave?.(buildInventoryUpdates(draft, originalRef.current));
      if (result?.ok === false) throw new Error(result.error || 'Changes could not be applied.');
      onClose?.();
    } catch (error) { setError(error.message); } finally { setSaving(false); }
  };

  const content = (
    <div
      className={`native-ui bb-services-sheet bb-stock-edit-sheet${isPage ? ' is-page bb-inventory-editor-fullpage' : ''}`}
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-edit-title"
    >
      {isPage ? null : <div className="bb-services-sheet-backdrop" onClick={onClose} />}
      <div className="bb-services-sheet-panel bb-services-sheet-panel--setup">
        <header className="bb-services-sheet-head">
          <div>
            <p className="bb-services-sheet-eyebrow">Inventory</p>
            <h2 id="stock-edit-title" className="bb-services-sheet-title">
              Adjust stock
            </h2>
            <p className="bb-services-sheet-lede">{draft.name}</p>
          </div>
          <button type="button" className="bb-ghost-btn bb-services-sheet-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="bb-services-sheet-body">
          {hasVariants ? (
            <div className="bb-stock-edit-layout">
              <nav className="bb-stock-variant-nav" aria-label="Choose stock to adjust">
                <p className="bb-stock-section-label">{draft.variants.length} options</p>
                <label className="bb-stock-variant-picker"><span>Choose an option</span><select className="native-control-input" value={activeVariantId} onChange={event => setActiveVariantId(event.target.value)}>{draft.variants.map(item => <option key={item.id} value={item.id}>{item.title || Object.values(item.optionValues || {}).join(' / ') || 'Option'}{item.sku ? ` · ${item.sku}` : ''}</option>)}<option value="product">Product defaults</option></select></label>
              </nav>
              <section className="bb-stock-active-editor" aria-label="Inventory details">
                <header><h3>{activeVariant ? activeVariant.title || Object.values(activeVariant.optionValues || {}).join(' / ') : 'Product defaults'}</h3><p>{activeVariant ? 'Manage inventory and shipping for this variant.' : 'Variant quantities are tracked separately. Manage the product’s stock display, warning level and shipping details here.'}</p></header>
                <InventoryFields values={activeVariant || draft} onChange={activeVariant ? (partial) => patchVariant(activeVariant.id, partial) : patch} showAvailable={!!activeVariant} showLabel={!activeVariant} showQuantity={!!activeVariant} warningDefault={activeVariant ? draft.lowStockThreshold ?? 3 : 3} />
              </section>
            </div>
          ) : (
            <InventoryFields values={draft} onChange={patch} showLabel />
          )}
        </div>
        <footer className="bb-services-sheet-footer">
          <span className={`bb-products-side-note${error ? ' is-error' : ''}`} role={error ? 'alert' : undefined}>
            {error || 'Save your stock updates when you’re ready.'}
          </span>
          <div className="bb-services-sheet-footer-actions">
            <Button action="cancel" variant="secondary" type="button" className="bb-ghost-btn" onClick={onClose}>
              Cancel
            </Button>
            <Button action="save" variant="primary" type="button" className="bb-primary-btn" busy={saving} onClick={save}>
              Save changes
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
  return createPortal(content, document.body);
}


