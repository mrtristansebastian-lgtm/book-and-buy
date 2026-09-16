import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { navigate, publicPagePath } from '../../../app/routing';
import { usePublicCart } from '../../storefront/PublicCartContext';
import { PublicCartCheckout } from '../../storefront/components/PublicCartCheckout';
import { PublicServiceSlotSheet } from '../../booking/components/PublicServiceSlotSheet';
import {
  findVariantBySelections,
  formatCompareAtPrice,
  formatProductPrice,
  formatStockNote,
  isVariantPurchasable,
  normalizeProductOption,
  productHasVariants
} from '../../../utils/products';
import {
  formatServiceCardMeta,
  formatServicePrice,
  getServiceOpenSpots
} from '../../../utils/services';
import { getCatalogCategory } from '../../../utils/catalogCategories';
import { getServiceScheduleType } from '../../../utils/scheduleTypes';

function collectImages(item = {}, variant = null) {
  const urls = Array.isArray(item.imageUrls)
    ? item.imageUrls.map((url) => String(url || '').trim()).filter(Boolean)
    : [];
  const list = [...urls];
  const variantUrl = String(variant?.imageUrl || '').trim();
  if (variantUrl) list.unshift(variantUrl);
  if (list.length) return [...new Set(list)];
  const single = String(item.image || '').trim();
  return single ? [single] : [];
}

/**
 * Shared public product / service detail page.
 * kind: 'product' | 'service'
 */
export function PublicCatalogDetail({
  kind = 'product',
  item,
  workspace,
  workspaceName,
  slug,
  preview = false,
  publicMode = false
}) {
  const cart = usePublicCart();
  const [panel, setPanel] = useState('detail');
  const [selections, setSelections] = useState({});
  const [slotSheetOpen, setSlotSheetOpen] = useState(false);

  const options = useMemo(() => {
    if (kind !== 'product' || !item) return [];
    return (Array.isArray(item.options) ? item.options : [])
      .map(normalizeProductOption)
      .filter((option) => option.name && option.values.length);
  }, [item, kind]);

  useEffect(() => {
    if (preview) return undefined;
    window.scrollTo(0, 0);
    return undefined;
  }, [item?.id, preview]);

  useEffect(() => {
    if (kind !== 'product' || !item) {
      setSelections({});
      return;
    }
    const next = {};
    options.forEach((option) => {
      next[option.name] = option.values[0] || '';
    });
    setSelections(next);
  }, [item?.id, kind, options]);

  const catalogPage = kind === 'service' ? 'book' : 'buy';
  const catalogLabel = kind === 'service' ? 'Book' : 'Buy';

  const selectedVariant = useMemo(() => {
    if (kind !== 'product' || !item) return null;
    if (!productHasVariants(item)) return null;
    return findVariantBySelections(item, selections);
  }, [item, kind, selections]);

  const images = collectImages(item, selectedVariant);

  if (!item) {
    return (
      <section className="bb-public-detail bb-public-gutter">
        <div className="bb-public-measure grid gap-4 py-10">
          <p className="bb-muted m-0">
            {kind === 'service' ? 'Service' : 'Product'} not found.
          </p>
          <button
            type="button"
            className="bb-ghost-btn justify-self-start"
            onClick={() => {
              if (preview) return;
              navigate(publicPagePath(slug, catalogPage));
            }}
          >
            <ArrowLeft size={16} />
            Back to {catalogLabel}
          </button>
        </div>
      </section>
    );
  }

  const quote =
    kind === 'product'
      ? item.quoteBased || item.priceType === 'quote'
      : item.priceType === 'quote';
  const price =
    kind === 'service'
      ? formatServicePrice(item)
      : formatProductPrice(item, selectedVariant);
  const compareAt =
    kind === 'product' ? formatCompareAtPrice(item, selectedVariant) : '';
  const timingMeta = kind === 'service' ? formatServiceCardMeta(item) : '';
  const isSpotService =
    kind === 'service' && getServiceScheduleType(item) === 'class_session';
  const spotsLeft = isSpotService
    ? getServiceOpenSpots(item, workspace?.bookings || [])
    : null;
  const stock =
    kind === 'product' ? formatStockNote(item, selectedVariant) : '';
  const meta =
    kind === 'service'
      ? getCatalogCategory(item, 'Service')
      : getCatalogCategory(item, 'Product');

  const needsVariant = kind === 'product' && productHasVariants(item);
  const purchasable =
    kind === 'service'
      ? true
      : !quote && isVariantPurchasable(item, selectedVariant);
  const lineKey =
    kind === 'service'
      ? `service:${item.id}`
      : `product:${item.id}:${selectedVariant?.id || 'base'}`;
  const inCart = cart.items.some((row) => row.lineKey === lineKey);
  const cartDisabled =
    kind === 'service' ? inCart : !purchasable || (needsVariant && !selectedVariant);

  const cartButton = (
    <button
      type="button"
      className="bb-public-catalog-cart"
      onClick={() => setPanel(panel === 'cart' ? 'detail' : 'cart')}
    >
      <ShoppingBag size={15} />
      <span>Cart</span>
      <span className="bb-public-catalog-cart-count">{cart.count}</span>
    </button>
  );

  const addToCart = () => {
    if (cartDisabled) return;
    if (kind === 'service') {
      if (isSpotService) {
        if (cart.addService(item)) setPanel('cart');
        return;
      }
      setSlotSheetOpen(true);
      return;
    }
    cart.addItem(item, 1, selectedVariant);
    setPanel('cart');
  };

  if (panel === 'cart') {
    return (
      <section
        className={`bb-public-detail bb-public-gutter ${preview ? 'pointer-events-none' : ''}`}
      >
        <div className="bb-public-measure-wide grid gap-6">
          <div className="flex justify-end">{cartButton}</div>
          <PublicCartCheckout
            catalogWorkspace={workspace}
            workspaceName={workspaceName || workspace.brandName}
            publicMode={publicMode}
            onBack={() => setPanel('detail')}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className={`bb-public-detail bb-public-gutter ${preview ? 'pointer-events-none' : ''}`}
    >
      <div className="bb-public-measure-wide bb-public-detail-shell">
        <header className="bb-public-detail-toolbar">
          <button
            type="button"
            className="bb-ghost-btn"
            onClick={() => {
              if (preview) return;
              navigate(publicPagePath(slug, catalogPage));
            }}
          >
            <ArrowLeft size={16} />
            Back to {catalogLabel}
          </button>
          {cartButton}
        </header>

        <div className="bb-public-detail-layout">
          <div className="bb-public-detail-gallery" aria-label={`${item.name} images`}>
            {images.length ? (
              images.map((src, index) => (
                <figure key={`${src}-${index}`} className="bb-public-detail-frame">
                  <img src={src} alt={index === 0 ? item.name || '' : ''} />
                </figure>
              ))
            ) : (
              <div className="bb-public-detail-frame is-empty" aria-hidden="true" />
            )}
          </div>

          <aside className="bb-public-detail-copy">
            <p className="bb-public-service-meta">{meta}</p>
            <h1 className="bb-public-detail-title">{item.name}</h1>

            <div className="bb-public-detail-facts">
              <div className="bb-public-detail-fact">
                <span className="bb-public-product-stat-label">Price</span>
                <span className="bb-public-detail-price">
                  {compareAt ? (
                    <>
                      <s className="bb-products-compare-at">{compareAt}</s>
                      {price || '—'}
                    </>
                  ) : (
                    price || '—'
                  )}
                </span>
              </div>
              {timingMeta ? (
                <div className="bb-public-detail-fact">
                  <span className="bb-public-product-stat-label">
                    {isSpotService ? 'When' : 'Duration'}
                  </span>
                  <span className="bb-public-detail-price">{timingMeta}</span>
                  {spotsLeft != null ? (
                    <span className="bb-public-detail-spots-left">
                      <strong>{spotsLeft}</strong>{' '}
                      {spotsLeft === 1 ? 'spot left' : 'spots left'}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {stock ? (
                <div className="bb-public-detail-fact">
                  <span className="bb-public-product-stat-label">Availability</span>
                  <span className="bb-public-detail-price">{stock}</span>
                </div>
              ) : null}
            </div>

            {kind === 'product' && options.length ? (
              <div className="bb-products-public-options">
                {options.map((option) => (
                  <div key={option.id || option.name} className="bb-products-public-option">
                    <span className="bb-products-public-option-label">
                      {option.name}
                    </span>
                    <div className="bb-products-public-values">
                      {option.values.map((value) => {
                        const active = selections[option.name] === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            className={`bb-products-public-value${
                              active ? ' is-active' : ''
                            }`}
                            onClick={() =>
                              setSelections((prev) => ({
                                ...prev,
                                [option.name]: value
                              }))
                            }
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {item.description ? (
              <div className="bb-public-detail-body">
                <h2 className="bb-public-detail-section-label">About</h2>
                <p>{item.description}</p>
              </div>
            ) : null}

            <button
              type="button"
              className="bb-public-product-cart-btn bb-public-detail-cart-btn"
              disabled={cartDisabled}
              onClick={addToCart}
            >
              <ShoppingBag size={15} strokeWidth={2.35} />
              <span>
                {kind === 'service'
                  ? inCart
                    ? 'In cart'
                    : 'Add to cart'
                  : quote
                    ? 'Quote only'
                    : needsVariant && !selectedVariant
                      ? 'Select options'
                      : !purchasable
                        ? 'Unavailable'
                        : 'Add to cart'}
              </span>
            </button>
          </aside>
        </div>
      </div>

      {kind === 'service' ? (
        <PublicServiceSlotSheet
          open={slotSheetOpen}
          service={item}
          workspace={workspace}
          bookings={workspace?.bookings || []}
          confirmLabel="Add to cart"
          onClose={() => setSlotSheetOpen(false)}
          onConfirm={(slot) => {
            const added = cart.addService(item, slot);
            setSlotSheetOpen(false);
            if (added) setPanel('cart');
          }}
        />
      ) : null}
    </section>
  );
}
