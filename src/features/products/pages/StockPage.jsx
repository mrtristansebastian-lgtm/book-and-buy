import { useEffect, useMemo, useState } from 'react';
import { Info, Pencil, Search, X } from 'lucide-react';
import { PageBackButton } from '../../../shared/ui/PageBackButton';
import { navigate } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import {
  getProductTotalStockQty,
  normalizeProduct,
  normalizeProductStatus,
  productHasVariants,
  productMissingSku
} from '../../../utils/products';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'low', label: 'Low stock' },
  { id: 'in', label: 'In stock' },
  { id: 'nosku', label: 'No SKU' }
];

const LOW_STOCK_MAX = 3;

function matchesFilter(product, filterId) {
  const total = getProductTotalStockQty(product);
  if (filterId === 'low') {
    return total != null && total <= LOW_STOCK_MAX;
  }
  if (filterId === 'in') {
    return total == null || total > LOW_STOCK_MAX;
  }
  if (filterId === 'nosku') {
    return productMissingSku(product);
  }
  return true;
}

function stockBadge(product) {
  const total = getProductTotalStockQty(product);
  if (total == null) return { label: 'Qty unset', tone: 'muted' };
  if (total <= 0) return { label: 'Out of stock', tone: 'warn' };
  if (total <= LOW_STOCK_MAX) return { label: `${total} left`, tone: 'warn' };
  return { label: `${total} in stock`, tone: 'ok' };
}

function InventoryFields({
  values,
  onChange,
  showLabel = false,
  showAvailable = false
}) {
  const dimUnit = values.dimensionUnit || 'cm';

  return (
    <div className="bb-stock-editor">
      <div className="bb-stock-section">
        <p className="bb-stock-section-label">Inventory</p>
        <div className="bb-stock-grid bb-stock-grid--2">
          <label className="bb-products-field">
            <span>SKU</span>
            <input
              className="native-control-input bb-services-control"
              value={values.sku || ''}
              placeholder="SKU-001"
              onChange={(event) => onChange({ sku: event.target.value })}
            />
          </label>
          <label className="bb-products-field">
            <span>Quantity</span>
            <input
              className="native-control-input bb-services-control"
              inputMode="numeric"
              value={values.stockAvailable ?? ''}
              placeholder="0"
              onChange={(event) =>
                onChange({
                  stockAvailable: event.target.value.replace(/[^\d]/g, '')
                })
              }
            />
          </label>
          <label className="bb-products-field bb-stock-span">
            <span>Cost (your cost)</span>
            <input
              className="native-control-input bb-services-control"
              inputMode="decimal"
              value={values.cost ?? ''}
              placeholder="0.00"
              onChange={(event) =>
                onChange({
                  cost: event.target.value.replace(/[^\d.]/g, '')
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
                    weight: event.target.value.replace(/[^\d.]/g, '')
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
                  length: event.target.value.replace(/[^\d.]/g, '')
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
                  width: event.target.value.replace(/[^\d.]/g, '')
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
                    height: event.target.value.replace(/[^\d.]/g, '')
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

function StockProductCard({ product, onInfo, onEdit }) {
  const badge = stockBadge(product);
  const status = normalizeProductStatus(product);
  const imageSrc = product.imageUrls?.[0] || '';
  const hasVariants = productHasVariants(product);

  return (
    <article className={`bb-stock-crate${badge.tone === 'warn' ? ' is-low' : ''}`}>
      <div className="bb-stock-crate-scene">
        <span className="bb-stock-crate-side" aria-hidden="true" />
        <span className="bb-stock-crate-bottom" aria-hidden="true" />
        <div className="bb-stock-crate-body">
          <div className="bb-stock-crate-media">
            {imageSrc ? <img src={imageSrc} alt="" /> : <span className="bb-stock-crate-media-empty" />}
          </div>
          <div className="bb-stock-crate-stamp">
            <strong>{product.name}</strong>
            <span>
              {[product.category, status !== 'active' ? status : null]
                .filter(Boolean)
                .join(' · ') || 'Product'}
              {hasVariants
                ? ` · ${product.variants.length} variants`
                : product.sku
                  ? ` · ${product.sku}`
                  : ''}
            </span>
          </div>
          <span className={`bb-stock-crate-qty is-${badge.tone}`}>{badge.label}</span>
          <div className="bb-stock-crate-actions">
            <button
              type="button"
              className="bb-stock-crate-action"
              onClick={() => onInfo?.(product)}
            >
              <Info size={15} strokeWidth={2.2} />
              <span>Info</span>
            </button>
            <button
              type="button"
              className="bb-stock-crate-action is-edit"
              onClick={() => onEdit?.(product)}
            >
              <Pencil size={15} strokeWidth={2.2} />
              <span>Edit</span>
            </button>
          </div>
        </div>
      </div>
    </article>
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

function useIsMobileEditor() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 899px)').matches
      : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 899px)');
    const onChange = () => setMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return mobile;
}

function StockInfoSheet({ product, onClose, onEdit, variant = 'sheet' }) {
  if (!product) return null;
  const badge = stockBadge(product);
  const status = normalizeProductStatus(product);
  const hasVariants = productHasVariants(product);
  const imageSrc = product.imageUrls?.[0] || '';
  const isPage = variant === 'page';

  return (
    <div
      className={`bb-services-sheet${isPage ? ' is-page' : ''}`}
      role={isPage ? 'region' : 'dialog'}
      aria-modal={isPage ? undefined : true}
      aria-labelledby="stock-info-title"
    >
      {isPage ? null : <div className="bb-services-sheet-backdrop" onClick={onClose} />}
      <div className="bb-services-sheet-panel">
        <header className="bb-services-sheet-head">
          <div>
            <p className="bb-services-sheet-eyebrow">Stock</p>
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
                <span className={`bb-stock-crate-qty is-${badge.tone}`}>{badge.label}</span>
                <p className="bb-muted m-0">
                  {[product.category, status]
                    .filter(Boolean)
                    .join(' · ') || 'Product'}
                  {product.sku ? ` · ${product.sku}` : ''}
                </p>
              </div>
            </div>

            <dl className="bb-stock-info-facts">
              <div>
                <dt>SKU</dt>
                <dd>{product.sku || '—'}</dd>
              </div>
              <div>
                <dt>Quantity</dt>
                <dd>
                  {getProductTotalStockQty(product) == null
                    ? 'Unset'
                    : getProductTotalStockQty(product)}
                </dd>
              </div>
              <div>
                <dt>Weight</dt>
                <dd>{formatWeight(product)}</dd>
              </div>
              <div>
                <dt>Dimensions</dt>
                <dd>{formatDims(product)}</dd>
              </div>
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
                <p className="bb-stock-section-label">Variants</p>
                <ul className="bb-stock-info-variant-list">
                  {(product.variants || []).map((variant) => (
                    <li key={variant.id}>
                      <strong>
                        {variant.title ||
                          Object.values(variant.optionValues || {}).join(' / ') ||
                          'Variant'}
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
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
        <footer className="bb-services-sheet-footer">
          <div className="bb-services-sheet-footer-actions">
            <button type="button" className="bb-ghost-btn" onClick={onClose}>
              Close
            </button>
            {onEdit ? (
              <button type="button" className="bb-primary-btn" onClick={() => onEdit(product)}>
                <Pencil size={15} strokeWidth={2.2} />
                Edit stock
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  );
}

function StockEditSheet({ product, onClose, onSave, variant = 'sheet' }) {
  const [draft, setDraft] = useState(product);
  const [savedFlash, setSavedFlash] = useState(false);
  const isPage = variant === 'page';

  useEffect(() => {
    setDraft(product);
  }, [product]);

  if (!product) return null;

  const hasVariants = productHasVariants(draft);
  const patch = (partial) => setDraft((prev) => ({ ...prev, ...partial }));
  const patchVariant = (variantId, partial) => {
    setDraft((prev) => ({
      ...prev,
      variants: (prev.variants || []).map((variant) =>
        variant.id === variantId ? { ...variant, ...partial } : variant
      )
    }));
  };

  const save = () => {
    onSave?.(normalizeProduct(draft));
    setSavedFlash(true);
    window.setTimeout(() => {
      setSavedFlash(false);
      onClose?.();
    }, 700);
  };

  return (
    <div
      className={`bb-services-sheet${isPage ? ' is-page' : ''}`}
      role={isPage ? 'region' : 'dialog'}
      aria-modal={isPage ? undefined : true}
      aria-labelledby="stock-edit-title"
    >
      {isPage ? null : <div className="bb-services-sheet-backdrop" onClick={onClose} />}
      <div className="bb-services-sheet-panel bb-services-sheet-panel--setup">
        <header className="bb-services-sheet-head">
          <div>
            <p className="bb-services-sheet-eyebrow">Stock</p>
            <h2 id="stock-edit-title" className="bb-services-sheet-title">
              Edit stock
            </h2>
            <p className="bb-services-sheet-lede">{draft.name}</p>
          </div>
          <button type="button" className="bb-ghost-btn bb-services-sheet-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="bb-services-sheet-body">
          {hasVariants ? (
            <>
              <InventoryFields values={draft} onChange={patch} showLabel />
              <div className="bb-stock-variant-list">
                {(draft.variants || []).map((variant) => (
                  <div key={variant.id} className="bb-stock-variant-card">
                    <h4 className="bb-stock-variant-title">
                      {variant.title ||
                        Object.values(variant.optionValues || {}).join(' / ')}
                    </h4>
                    <InventoryFields
                      values={variant}
                      onChange={(partial) => patchVariant(variant.id, partial)}
                      showAvailable
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <InventoryFields values={draft} onChange={patch} showLabel />
          )}
        </div>
        <footer className="bb-services-sheet-footer">
          <span className="bb-products-side-note">
            {savedFlash ? 'Saved' : 'Changes apply to Buy stock notes after save.'}
          </span>
          <div className="bb-services-sheet-footer-actions">
            <button type="button" className="bb-ghost-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="bb-primary-btn" onClick={save}>
              Save stock
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function StockPage({ routeRest = [] }) {
  const { products, upsertProduct } = useWorkspace();
  const isMobile = useIsMobileEditor();
  const [query, setQuery] = useState('');
  const [filterId, setFilterId] = useState('all');
  const [infoProduct, setInfoProduct] = useState(null);
  const [editProduct, setEditProduct] = useState(null);

  const mode = routeRest[0] || '';
  const itemId = routeRest[1] || '';
  const pageInfo = isMobile && mode === 'info' && Boolean(itemId);
  const pageEdit = isMobile && mode === 'edit' && Boolean(itemId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (products || []).filter((product) => {
      if (!matchesFilter(product, filterId)) return false;
      if (!q) return true;
      const hay = [
        product.name,
        product.sku,
        product.category,
        ...(product.variants || []).flatMap((variant) => [
          variant.sku,
          variant.title
        ])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [products, query, filterId]);

  useEffect(() => {
    if (!pageInfo && !pageEdit) return;
    const found = (products || []).find((item) => item.id === itemId);
    if (!found) {
      navigate('/dashboard/stock');
      return;
    }
    if (pageInfo) setInfoProduct(found);
    if (pageEdit) setEditProduct(found);
  }, [pageInfo, pageEdit, itemId, products]);

  const openInfo = (product) => {
    if (isMobile) {
      navigate(`/dashboard/stock/info/${product.id}`);
      return;
    }
    setInfoProduct(product);
  };

  const openEdit = (product) => {
    if (isMobile) {
      navigate(`/dashboard/stock/edit/${product.id}`);
      return;
    }
    setEditProduct(product);
  };

  const closeInfo = () => {
    setInfoProduct(null);
    if (pageInfo) navigate('/dashboard/stock');
  };

  const closeEdit = () => {
    setEditProduct(null);
    if (pageEdit) navigate('/dashboard/stock');
  };

  const liveEditProduct = editProduct
    ? (products || []).find((item) => item.id === editProduct.id) || editProduct
    : null;
  const liveInfoProduct = infoProduct
    ? (products || []).find((item) => item.id === infoProduct.id) || infoProduct
    : null;

  const openEditFromInfo = (product) => {
    if (isMobile) {
      navigate(`/dashboard/stock/edit/${product.id}`);
      return;
    }
    setInfoProduct(null);
    setEditProduct(product);
  };

  if (pageInfo && liveInfoProduct) {
    return (
      <StockInfoSheet
        product={liveInfoProduct}
        onClose={closeInfo}
        onEdit={openEditFromInfo}
        variant="page"
      />
    );
  }

  if (pageEdit && liveEditProduct) {
    return (
      <StockEditSheet
        product={liveEditProduct}
        onClose={closeEdit}
        onSave={(next) => upsertProduct(next)}
        variant="page"
      />
    );
  }

  return (
    <div className="bb-services-desk bb-stock-desk">
      <div className="bb-page-chrome">
        <header className="bb-services-desk-header">
          <div className="bb-services-desk-copy">
            <div className="bb-page-title-wrap">
              <PageBackButton />
              <span className="bb-page-title-main">
                <div className="bb-page-header-glow" aria-hidden="true" />
                <h1 className="bb-page-title bb-services-desk-title">Stock</h1>
              </span>
            </div>
          </div>
        </header>

        {products.length > 0 ? (
          <div className="bb-stock-toolbar">
            <label className="bb-stock-search bb-search-field">
              <Search size={15} className="bb-search-field-icon" aria-hidden="true" />
              <input
                type="search"
                className="native-search-input"
                value={query}
                placeholder="Search products or SKUs"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="bb-products-chips" role="tablist" aria-label="Stock filters">
              {FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  role="tab"
                  aria-selected={filterId === filter.id}
                  className={`bb-products-chip${
                    filterId === filter.id ? ' is-active' : ''
                  }`}
                  onClick={() => setFilterId(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {products.length === 0 ? (
        <div className="bb-services-catalog-empty">
          No products yet.{' '}
          <button
            type="button"
            className="bb-stock-link"
            onClick={() => navigate('/dashboard/products')}
          >
            Add products
          </button>{' '}
          first, then set stock here.
        </div>
      ) : filtered.length === 0 ? (
        <div className="bb-services-catalog-empty">
          No products match this filter.
        </div>
      ) : (
        <div className="bb-stock-room">
          {filtered.map((product) => (
            <StockProductCard
              key={product.id}
              product={product}
              onInfo={openInfo}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      {!isMobile && liveInfoProduct ? (
        <StockInfoSheet
          product={liveInfoProduct}
          onClose={closeInfo}
          onEdit={openEditFromInfo}
        />
      ) : null}
      {!isMobile && liveEditProduct ? (
        <StockEditSheet
          product={liveEditProduct}
          onClose={closeEdit}
          onSave={(next) => upsertProduct(next)}
        />
      ) : null}
    </div>
  );
}
