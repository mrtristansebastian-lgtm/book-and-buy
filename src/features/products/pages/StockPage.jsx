import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
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

function StockProductRow({ product, open, onToggle, onSave }) {
  const [draft, setDraft] = useState(product);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setDraft(product);
  }, [product]);

  const hasVariants = productHasVariants(draft);
  const badge = stockBadge(draft);
  const status = normalizeProductStatus(draft);
  const imageSrc = draft.imageUrls?.[0] || '';

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
    window.setTimeout(() => setSavedFlash(false), 1200);
  };

  return (
    <article className={`bb-stock-row${open ? ' is-open' : ''}`}>
      <button type="button" className="bb-stock-row-head" onClick={onToggle}>
        <span className="bb-stock-thumb" aria-hidden="true">
          {imageSrc ? <img src={imageSrc} alt="" /> : null}
        </span>
        <span className="bb-stock-row-copy">
          <strong>{draft.name}</strong>
          <span>
            {[draft.category, status !== 'active' ? status : null]
              .filter(Boolean)
              .join(' · ') || 'Product'}
            {hasVariants
              ? ` · ${draft.variants.length} variants`
              : draft.sku
                ? ` · ${draft.sku}`
                : ''}
          </span>
        </span>
        <span className={`bb-stock-badge is-${badge.tone}`}>{badge.label}</span>
        <ChevronDown size={16} className="bb-stock-chevron" aria-hidden="true" />
      </button>

      {open ? (
        <div className="bb-stock-row-body">
          {hasVariants ? (
            <>
              <div className="bb-stock-product-meta">
                <InventoryFields
                  values={draft}
                  onChange={patch}
                  showLabel
                />
              </div>
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

          <div className="bb-stock-row-actions">
            {savedFlash ? (
              <span className="bb-stock-saved">Saved</span>
            ) : (
              <span className="bb-products-side-note">
                Changes apply to Buy stock notes after save.
              </span>
            )}
            <button type="button" className="bb-primary-btn" onClick={save}>
              Save stock
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function StockPage() {
  const { products, upsertProduct } = useWorkspace();
  const [query, setQuery] = useState('');
  const [filterId, setFilterId] = useState('all');
  const [openId, setOpenId] = useState('');

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

  return (
    <div className="bb-services-desk bb-stock-desk">
      <header className="bb-services-desk-header">
        <div className="bb-services-desk-copy">
          <p className="bb-services-desk-eyebrow">Buy</p>
          <h1 className="bb-services-desk-title">Stock</h1>
          <p className="bb-services-desk-lede">
            Quantities, SKUs, weight, and dimensions — keep Buy inventory tidy
            without cluttering product setup.
          </p>
        </div>
      </header>

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
      ) : (
        <>
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

          {filtered.length === 0 ? (
            <div className="bb-services-catalog-empty">
              No products match this filter.
            </div>
          ) : (
            <div className="bb-stock-list">
              {filtered.map((product) => (
                <StockProductRow
                  key={product.id}
                  product={product}
                  open={openId === product.id}
                  onToggle={() =>
                    setOpenId((prev) =>
                      prev === product.id ? '' : product.id
                    )
                  }
                  onSave={(next) => upsertProduct(next)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
