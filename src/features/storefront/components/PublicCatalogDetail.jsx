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
  findServiceVariant,
  getServiceActiveVariants,
  getServiceOpenSpots,
  serviceHasVariants
} from '../../../utils/services';
import { getCatalogCategory } from '../../../utils/catalogCategories';
import { getServiceScheduleType } from '../../../utils/scheduleTypes';
import { serviceLineKey } from '../../storefront/hooks/useCart';

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
  publicMode = false,
  onBack
}) {
  const cart = usePublicCart();
  const [panel, setPanel] = useState('detail');
  const [selections, setSelections] = useState({});
  const [slotSheetOpen, setSlotSheetOpen] = useState(false);
  const [serviceVariantId, setServiceVariantId] = useState('');
  const studioBack = typeof onBack === 'function';
  const catalogPage = kind === 'service' ? 'book' : 'buy';
  const catalogLabel = kind === 'service' ? 'Book' : 'Buy';

  const goBack = () => {
    if (studioBack) {
      onBack();
      return;
    }
    if (preview) return;
    navigate(publicPagePath(slug, catalogPage));
  };

  const options = useMemo(() => {
    if (kind !== 'product' || !item) return [];
    return (Array.isArray(item.options) ? item.options : [])
      .map(normalizeProductOption)
      .filter((option) => option.name && option.values.length);
  }, [item, kind]);

  const serviceVariants = useMemo(() => {
    if (kind !== 'service' || !item) return [];
    return getServiceActiveVariants(item);
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

  useEffect(() => {
    if (kind !== 'service' || !item) {
      setServiceVariantId('');
      return;
    }
    setServiceVariantId(serviceVariants[0]?.id || '');
  }, [item?.id, kind, serviceVariants]);

  const selectedProductVariant = useMemo(() => {
    if (kind !== 'product' || !item) return null;
    if (!productHasVariants(item)) return null;
    return findVariantBySelections(item, selections);
  }, [item, kind, selections]);

  const selectedServiceVariant = useMemo(() => {
    if (kind !== 'service' || !item || !serviceVariantId) return null;
    return findServiceVariant(item, serviceVariantId);
  }, [item, kind, serviceVariantId]);

  const images = collectImages(item, selectedProductVariant);

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
            onClick={goBack}
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
      ? formatServicePrice(item, selectedServiceVariant)
      : formatProductPrice(item, selectedProductVariant);
  const compareAt =
    kind === 'product' ? formatCompareAtPrice(item, selectedProductVariant) : '';
  const timingMeta =
    kind === 'service'
      ? formatServiceCardMeta(item, selectedServiceVariant)
      : '';
  const isSpotService =
    kind === 'service' && getServiceScheduleType(item) === 'class_session';
  const spotsLeft = isSpotService
    ? getServiceOpenSpots(item, workspace?.bookings || [])
    : null;
  const stock =
    kind === 'product' ? formatStockNote(item, selectedProductVariant) : '';
  const meta =
    kind === 'service'
      ? getCatalogCategory(item, 'Service')
      : getCatalogCategory(item, 'Product');

  const needsProductVariant = kind === 'product' && productHasVariants(item);
  const needsServiceVariant = kind === 'service' && serviceHasVariants(item);
  const purchasable =
    kind === 'service'
      ? !needsServiceVariant || Boolean(selectedServiceVariant)
      : !quote && isVariantPurchasable(item, selectedProductVariant);
  const lineKey =
    kind === 'service'
      ? serviceLineKey(item.id, selectedServiceVariant?.id || '')
      : `product:${item.id}:${selectedProductVariant?.id || 'base'}`;
  const inCart = cart.items.some((row) => row.lineKey === lineKey);
  const cartDisabled =
    kind === 'service'
      ? inCart || (needsServiceVariant && !selectedServiceVariant)
      : !purchasable || (needsProductVariant && !selectedProductVariant);

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
      if (isSpotService && !needsServiceVariant) {
        if (cart.addService(item, null, selectedServiceVariant)) setPanel('cart');
        return;
      }
      setSlotSheetOpen(true);
      return;
    }
    cart.addItem(item, 1, selectedProductVariant);
    setPanel('cart');
  };

  if (panel === 'cart') {
    return (
      <section
        className={`bb-public-detail bb-public-gutter ${
          preview && !studioBack ? 'pointer-events-none' : ''
        }`}
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
      className={`bb-public-detail bb-public-gutter ${
        preview && !studioBack ? 'pointer-events-none' : ''
      }`}
    >
      <div className="bb-public-measure-wide bb-public-detail-shell">
        <header className="bb-public-detail-toolbar">
          <button type="button" className="bb-ghost-btn" onClick={goBack}>
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

            {kind === 'service' && serviceVariants.length ? (
              <div className="bb-public-service-variants">
                <span className="bb-products-public-option-label">Options</span>
                <div className="bb-public-service-variant-list">
                  {serviceVariants.map((variant) => {
                    const active = serviceVariantId === variant.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        className={`bb-public-service-variant${
                          active ? ' is-active' : ''
                        }`}
                        onClick={() => setServiceVariantId(variant.id)}
                      >
                        <span className="bb-public-service-variant-name">
                          {variant.name}
                        </span>
                        {variant.description ? (
                          <span className="bb-public-service-variant-desc">
                            {variant.description}
                          </span>
                        ) : null}
                        <span className="bb-public-service-variant-meta">
                          {[
                            formatServicePrice(item, variant) || null,
                            variant.minDuration
                              ? `${variant.minDuration} min`
                              : null
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </button>
                    );
                  })}
                </div>
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
                    : needsServiceVariant && !selectedServiceVariant
                      ? 'Select an option'
                      : 'Add to cart'
                  : quote
                    ? 'Quote only'
                    : needsProductVariant && !selectedProductVariant
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
          initialVariantId={serviceVariantId}
          confirmLabel="Add to cart"
          onClose={() => setSlotSheetOpen(false)}
          onConfirm={(slot) => {
            const added = cart.addService(
              item,
              slot,
              slot?.variant || selectedServiceVariant
            );
            setSlotSheetOpen(false);
            if (added) setPanel('cart');
          }}
        />
      ) : null}
    </section>
  );
}
