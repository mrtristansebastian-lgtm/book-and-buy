import { Button } from '../../../shared/ui/Button';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Image as ImageIcon, ShoppingBag } from 'lucide-react';
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
import { isFirebaseConfigured } from '../../../shared/firebase/client';
import { firebaseCallables } from '../../../shared/firebase/callables';
import { mergePublicCommerceWorkspace } from '../../../utils/publicCommerceCheckout';

function collectImages(item = {}, variant = null) {
  if (!item) return [];
  const urls = Array.isArray(item.imageUrls)
    ? item.imageUrls.map((url) => String(url || '').trim()).filter(Boolean)
    : [];
  const list = [...urls];
  const variantUrl = String(variant?.imageUrl || '').trim();
  if (variantUrl) list.unshift(variantUrl);
  if (list.length) return [...new Set(list)];
  const single = String(item.image || item.imageUrl || '').trim();
  return single ? [single] : [];
}

/**
 * Shared public product / service detail page.
 * kind: 'product' | 'service'
 */
export function PublicCatalogDetail({
  kind = 'product',
  item: initialItem,
  workspace: initialWorkspace,
  workspaceName,
  slug,
  preview = false,
  publicMode = false,
  onBack,
  checkoutTestMode = false
}) {
  const cart = usePublicCart();
  const [panel, setPanel] = useState('detail');
  const [selections, setSelections] = useState({});
  const [slotSheetOpen, setSlotSheetOpen] = useState(false);
  const [serviceVariantId, setServiceVariantId] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const liveCommerce = publicMode && !preview && !checkoutTestMode;
  const [liveState, setLiveState] = useState({ status: 'loading', catalog: null, error: '' });
  const [availability, setAvailability] = useState({ status: 'loading', available: false, error: '' });
  const [refresh, setRefresh] = useState(0);
  const countryCode = initialWorkspace?.website?.buyerCountryCode || '';
  const businessSlug = slug || initialWorkspace?.slug || '';
  const workspace = mergePublicCommerceWorkspace(initialWorkspace, liveState.catalog);
  const item = liveCommerce && liveState.status === 'ready'
    ? (kind === 'service' ? workspace.services : workspace.products)?.find((row) => row.id === initialItem?.id) || null
    : initialItem;
  const studioBack = typeof onBack === 'function';
  const catalogPage = kind === 'service' ? 'book' : 'buy';
  const catalogLabel = kind === 'service' ? 'Book' : 'Buy';

  useEffect(() => {
    if (!liveCommerce) return undefined;
    let stopped = false;
    setLiveState({ status: 'loading', catalog: null, error: '' });
    if (!isFirebaseConfigured() || !businessSlug) {
      setLiveState({ status: 'error', catalog: null, error: 'The current business catalog is unavailable. Please try again later.' });
      return undefined;
    }
    firebaseCallables.getPublicCommerceContext({ slug: businessSlug, countryCode })
      .then((catalog) => { if (!stopped) setLiveState({ status: 'ready', catalog, error: '' }); })
      .catch((error) => { if (!stopped) setLiveState({ status: 'error', catalog: null, error: error?.message || 'Could not load the current catalog.' }); });
    return () => { stopped = true; };
  }, [liveCommerce, businessSlug, countryCode, refresh]);

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

  useEffect(() => {
    if (!liveCommerce || liveState.status !== 'ready' || kind !== 'service' || !item || getServiceScheduleType(item) !== 'class_session') return undefined;
    let stopped = false;
    setAvailability({ status: 'loading', available: false, error: '' });
    firebaseCallables.getPublicServiceAvailability({ slug: businessSlug, countryCode, serviceId: item.id,
      variantId: selectedServiceVariant?.id || '', dateKey: item.sessionStartDate })
      .then((slots) => { if (!stopped) setAvailability({ status: 'ready', available: Array.isArray(slots) && slots.some((slot) => slot.available !== false), error: '' }); })
      .catch((error) => { if (!stopped) setAvailability({ status: 'error', available: false, error: error?.message || 'Could not check seat availability.' }); });
    return () => { stopped = true; };
  }, [liveCommerce, liveState.status, kind, item, selectedServiceVariant?.id, businessSlug, countryCode, refresh]);

  const images = collectImages(item, selectedProductVariant);
  const imageListKey = images.join('\n');
  const activeImageIndex = Math.min(selectedImageIndex, Math.max(0, images.length - 1));

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [item?.id, selectedProductVariant?.id, imageListKey]);

  if ((liveCommerce && liveState.status !== 'ready') || !item) {
    return (
      <section className="bb-public-detail bb-public-gutter bb-catalog-detail">
        <div className="bb-public-measure grid gap-4 py-10">
          <p className="bb-muted m-0">
            {liveCommerce && liveState.status === 'loading' ? 'Checking the current catalog…'
              : liveCommerce && liveState.error ? liveState.error
              : workspace?.website?.catalogAvailability === 'country-required'
              ? 'Choose your shopping country above to check availability.'
              : `${kind === 'service' ? 'Service' : 'Product'} is not available. It may have been removed or may not be sold in your country.`}
          </p>
          {liveCommerce && liveState.status === 'error' ? <Button action="refresh" variant="secondary" type="button" onClick={() => setRefresh((value) => value + 1)}>Refresh catalog</Button> : null}
          <Button action="back" variant="secondary"
            type="button"
            className="bb-ghost-btn justify-self-start"
            onClick={goBack}
          >
            Back to {catalogLabel}
          </Button>
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
  const hasBookingRecords = Array.isArray(workspace?.bookings);
  const spotCount = isSpotService && !liveCommerce
    ? hasBookingRecords
      ? getServiceOpenSpots(item, workspace.bookings)
      : Math.max(1, Number(item.capacity) || 1)
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
    liveCommerce && isSpotService && (availability.status !== 'ready' || !availability.available) ? true : kind === 'service'
      ? inCart || (needsServiceVariant && !selectedServiceVariant)
      : !purchasable || (needsProductVariant && !selectedProductVariant);

  const cartButton = (
    <Button action="cart" variant="secondary"
      type="button"
      className="bb-public-catalog-cart bb-public-detail-cart-toggle"
      onClick={() => setPanel(panel === 'cart' ? 'detail' : 'cart')}
      aria-pressed={panel === 'cart'}
      aria-label={`Cart, ${cart.count} ${cart.count === 1 ? 'item' : 'items'}`}
    >
      <ShoppingBag size={15} />
      <span>Cart</span>
      <span className="bb-public-catalog-cart-count">{cart.count}</span>
    </Button>
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
        className={`bb-public-detail bb-public-gutter bb-catalog-detail ${
          preview && !studioBack ? 'pointer-events-none' : ''
        }`}
      >
        <div className="bb-public-measure-wide grid gap-6">
          <div className="flex justify-end">{cartButton}</div>
          <PublicCartCheckout
            testMode={checkoutTestMode}
            catalogWorkspace={workspace}
            workspaceName={workspaceName || workspace.brandName}
            publicMode={publicMode}
            lockedPreview={preview}
            onBack={() => setPanel('detail')}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className={`bb-public-detail bb-public-gutter bb-catalog-detail is-${kind} ${
        preview && !studioBack ? 'pointer-events-none' : ''
      }`}
    >
      <div className="bb-public-measure-wide bb-public-detail-shell">
        <header className="bb-public-detail-toolbar">
          <Button action="back" variant="secondary" type="button" className="bb-ghost-btn bb-public-detail-back" onClick={goBack}>
            <ArrowLeft size={16} />
            Back to {catalogLabel}
          </Button>
          {cartButton}
        </header>

        <div className="bb-public-detail-layout">
          <div className="bb-public-detail-gallery" role="group" aria-label={`${item.name} images`}>
            {images.length ? (
              <>
                <figure className="bb-public-detail-frame">
                  <img src={images[activeImageIndex]} alt={`${item.name}, image ${activeImageIndex + 1}`} />
                  {images.length > 1 ? (
                    <>
                      <button
                        type="button"
                        className="bb-public-detail-gallery-arrow is-previous"
                        aria-label="Previous image"
                        onClick={() => setSelectedImageIndex((activeImageIndex - 1 + images.length) % images.length)}
                      >
                        <ChevronLeft size={20} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="bb-public-detail-gallery-arrow is-next"
                        aria-label="Next image"
                        onClick={() => setSelectedImageIndex((activeImageIndex + 1) % images.length)}
                      >
                        <ChevronRight size={20} aria-hidden="true" />
                      </button>
                      <span className="bb-public-detail-image-count" aria-hidden="true">
                        {activeImageIndex + 1} / {images.length}
                      </span>
                    </>
                  ) : null}
                </figure>
                {images.length > 1 ? (
                  <div className="bb-public-detail-thumbnails" role="group" aria-label="Choose an image">
                    {images.map((src, index) => (
                      <button
                        key={`${src}-${index}`}
                        type="button"
                        className={`bb-public-detail-thumbnail${activeImageIndex === index ? ' is-active' : ''}`}
                        aria-label={`Show image ${index + 1} of ${images.length}`}
                        aria-pressed={activeImageIndex === index}
                        onClick={() => setSelectedImageIndex(index)}
                      >
                        <img src={src} alt="" loading="lazy" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="bb-public-detail-frame is-empty">
                <ImageIcon size={36} strokeWidth={1.4} aria-hidden="true" />
                <span>No image available</span>
              </div>
            )}
          </div>

          <aside className="bb-public-detail-copy">
            <header className="bb-public-detail-identity">
              <p className="bb-public-service-meta">{meta}</p>
              <h1 className="bb-public-detail-title">{item.name}</h1>
            </header>

            <div className="bb-public-detail-price-group">
              <p className="bb-public-detail-price" aria-label={`Price: ${price || 'Not listed'}`}>
                {compareAt ? <s className="bb-products-compare-at">{compareAt}</s> : null}
                <span>{price || '—'}</span>
              </p>
              {stock ? <p className="bb-public-detail-availability">{stock}</p> : null}
            </div>

            {timingMeta || spotCount != null ? (
              <div className="bb-public-detail-facts">
                {timingMeta ? <div className="bb-public-detail-fact">
                  <span className="bb-public-product-stat-label">
                    {isSpotService ? 'When' : 'Duration'}
                  </span>
                  <span className="bb-public-detail-fact-value">{timingMeta}</span>
                </div> : null}
                {spotCount != null ? (
                  <span className="bb-public-detail-spots-left">
                    <strong>{spotCount}</strong>{' '}
                    {spotCount === 1 ? 'spot' : 'spots'} {hasBookingRecords ? 'left' : 'per session'}
                  </span>
                ) : null}
              </div>
            ) : null}
            {liveCommerce && isSpotService ? (
              <p className="bb-public-detail-availability" role="status">
                {availability.status === 'loading' ? 'Checking seat availability…'
                  : availability.error || (availability.available ? 'Seats currently available' : 'This session has no available seats.')}
              </p>
            ) : null}

            {kind === 'product' && options.length ? (
              <div className="bb-products-public-options">
                {options.map((option) => (
                  <fieldset key={option.id || option.name} className="bb-products-public-option">
                    <legend className="bb-products-public-option-label">
                      {option.name}
                    </legend>
                    <div className="bb-products-public-values">
                      {option.values.map((value) => {
                        const active = selections[option.name] === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={active}
                            aria-label={`${option.name}: ${value}`}
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
                  </fieldset>
                ))}
              </div>
            ) : null}

            {kind === 'service' && serviceVariants.length ? (
              <fieldset className="bb-public-service-variants">
                <legend className="bb-products-public-option-label">Options</legend>
                <div className="bb-public-service-variant-list">
                  {serviceVariants.map((variant) => {
                    const active = serviceVariantId === variant.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        aria-pressed={active}
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
              </fieldset>
            ) : null}

            <Button action="addToCart" variant="primary"
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
            </Button>

            {item.description ? (
              <section className="bb-public-detail-body" aria-label={`About ${item.name}`}>
                <h2 className="bb-public-detail-section-label">About</h2>
                <p>{item.description}</p>
              </section>
            ) : null}
          </aside>
        </div>
      </div>

      {kind === 'service' ? (
        <PublicServiceSlotSheet
          open={slotSheetOpen}
          service={item}
          workspace={workspace}
          publicMode={liveCommerce}
          slug={businessSlug}
          countryCode={countryCode}
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
