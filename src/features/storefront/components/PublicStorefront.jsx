import { useMemo, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { useCart } from '../hooks/useCart';
import { formatCents, formatProductPrice, formatStockNote } from '../../../utils/products';
import { getPublicPaymentOptions } from '../../../utils/payments';
import { isFirebaseConfigured } from '../../../shared/firebase/client';
import { firebaseCallables } from '../../../shared/firebase/callables';
import { createPublicProductOrder } from '../../../utils/orders';

export function PublicStorefront({
  catalogWorkspace,
  workspaceName,
  title = 'Buy',
  subtext,
  preview = false,
  featuredProductId = '',
  hideIntro = false,
  publicMode = false
}) {
  const ctx = useWorkspace();
  const workspace = catalogWorkspace || ctx.workspace;
  const products = workspace.products || [];
  const paymentGateways = workspace.paymentGateways || ctx.paymentGateways;
  const cart = useCart();
  const [panel, setPanel] = useState('shop');
  const [submitNote, setSubmitNote] = useState('');
  const paymentOptions = useMemo(
    () => getPublicPaymentOptions({ paymentGateways }).options,
    [paymentGateways]
  );
  const [paymentMethod, setPaymentMethod] = useState(
    () => paymentOptions[0]?.gatewayType || 'cash'
  );
  const [details, setDetails] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientNote: ''
  });
  const [placed, setPlaced] = useState(null);

  const catalog = products.filter((product) => product.active !== false);
  const featured =
    catalog.find((product) => product.id === featuredProductId) || catalog[0] || null;
  const gridProducts = featuredProductId
    ? catalog.filter((product) => product.id !== featured?.id)
    : catalog;

  const sameOwnerContext =
    !publicMode ||
    workspace.slug === ctx.workspace.slug ||
    (workspace.ownerId && workspace.ownerId === ctx.workspace.ownerId);

  const submit = async () => {
    if (!cart.items.length || !details.clientName.trim()) return;
    setSubmitNote('');
    const items = cart.items;

    if (publicMode && isFirebaseConfigured() && workspace.slug) {
      try {
        const result = await firebaseCallables.createPublicProductOrder({
          slug: workspace.slug,
          items,
          client: details,
          paymentMethod
        });
        cart.clear();
        setPlaced(
          result && typeof result === 'object'
            ? result
            : createPublicProductOrder({
                workspaceSlug: workspace.slug,
                workspaceName: workspaceName || workspace.brandName,
                items,
                client: details,
                paymentMethod
              })
        );
        setPanel('done');
        return;
      } catch {
        /* fall through */
      }
    }

    if (sameOwnerContext) {
      const order = ctx.placeProductOrder({
        items,
        client: details,
        paymentMethod
      });
      cart.clear();
      setPlaced(order);
      setPanel('done');
      return;
    }

    const order = createPublicProductOrder({
      workspaceSlug: workspace.slug,
      workspaceName: workspaceName || workspace.brandName,
      items,
      client: details,
      paymentMethod
    });
    cart.clear();
    setPlaced(order);
    setSubmitNote(
      'Order saved on this device. Deploy order Functions so the owner receives live orders.'
    );
    setPanel('done');
  };

  if (panel === 'done' && placed) {
    return (
      <section className="bb-public-gutter py-10">
        <div className="bb-public-measure grid gap-4">
          <h1 className="bb-page-title text-4xl m-0">Order received</h1>
          <p className="bb-muted m-0">
            {workspaceName || workspace.brandName} will confirm fulfilment. Total{' '}
            {formatCents(placed.amountInCents, placed.currency)} via {placed.paymentMethod}.
          </p>
          {submitNote ? <p className="bb-muted m-0 text-sm">{submitNote}</p> : null}
          <button
            type="button"
            className="bb-primary-btn justify-self-start"
            onClick={() => {
              setPlaced(null);
              setSubmitNote('');
              setPanel('shop');
              setDetails({ clientName: '', clientEmail: '', clientPhone: '', clientNote: '' });
            }}
          >
            Keep shopping
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`bb-public-buy-section bb-public-gutter ${preview ? 'pointer-events-none' : ''}`}
    >
      <div className="bb-public-measure grid gap-7">
        {hideIntro ? (
          <div className="flex justify-end">
            <button
              type="button"
              className="bb-ink-btn"
              onClick={() => setPanel(panel === 'cart' ? 'shop' : 'cart')}
            >
              <ShoppingBag size={16} />
              Cart ({cart.count})
            </button>
          </div>
        ) : (
          <header className="bb-public-buy-header">
            <div className="grid gap-2 max-w-2xl">
              <h1 className="bb-page-title">{title}</h1>
              <p className="bb-public-lede m-0">
                {subtext ||
                  `Kitchen goods and take-home sets from ${workspaceName || workspace.brandName}.`}
              </p>
            </div>
            <button
              type="button"
              className="bb-ink-btn"
              onClick={() => setPanel(panel === 'cart' ? 'shop' : 'cart')}
            >
              <ShoppingBag size={16} />
              Cart ({cart.count})
            </button>
          </header>
        )}

        {panel === 'shop' && featured && featuredProductId ? (
          <article className="bb-public-product-card bb-public-product-card--featured">
            <div className="bb-public-product-media">
              {(featured.imageUrls?.[0] || featured.image) ? (
                <img src={featured.imageUrls?.[0] || featured.image} alt="" />
              ) : null}
            </div>
            <div className="bb-public-product-body">
              <p className="bb-public-service-meta">Featured</p>
              <h2>{featured.name}</h2>
              <p className="bb-public-product-desc">{featured.description}</p>
            </div>
            <div className="bb-public-product-aside">
              <p className="bb-public-product-price">
                {[formatProductPrice(featured), formatStockNote(featured)]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {featured.quoteBased || featured.priceType === 'quote' ? (
                <span className="bb-ghost-btn pointer-events-none">Quote only</span>
              ) : (
                <button
                  type="button"
                  className="bb-primary-btn"
                  onClick={() => cart.addItem(featured)}
                >
                  Add to cart
                </button>
              )}
            </div>
          </article>
        ) : null}

        {panel === 'shop' ? (
          <div className="bb-public-product-grid">
            {(featuredProductId ? gridProducts : catalog).map((product) => {
              const quote = product.quoteBased || product.priceType === 'quote';
              const imageSrc = product.imageUrls?.[0] || product.image || '';
              const priceLine = [formatProductPrice(product), formatStockNote(product)]
                .filter(Boolean)
                .join(' · ');
              return (
                <article key={product.id} className="bb-public-product-card">
                  <div className="bb-public-product-media">
                    {imageSrc ? <img src={imageSrc} alt="" /> : null}
                  </div>
                  <div className="bb-public-product-body">
                    <h2>{product.name}</h2>
                    <p className="bb-public-product-desc">{product.description}</p>
                    <p className="bb-public-product-price md:hidden">{priceLine}</p>
                  </div>
                  <div className="bb-public-product-aside">
                    <p className="bb-public-product-price hidden md:block">{priceLine}</p>
                    {quote ? (
                      <span className="bb-ghost-btn pointer-events-none">Quote only</span>
                    ) : (
                      <button
                        type="button"
                        className="bb-primary-btn"
                        onClick={() => cart.addItem(product)}
                      >
                        Add to cart
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-5 max-w-2xl">
            {cart.items.length === 0 ? (
              <div className="bb-public-empty grid gap-3 content-start text-left">
                <p className="bb-muted m-0">Your cart is empty.</p>
                <p className="bb-muted m-0 text-sm">
                  Add fixed-price products from the Buy catalog. Quote-based items are request-only.
                </p>
                <button
                  type="button"
                  className="bb-primary-btn justify-self-start"
                  onClick={() => setPanel('shop')}
                >
                  Continue shopping
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-3">
                  {cart.items.map((item) => (
                    <article
                      key={item.productId}
                      className="bb-public-product-card p-4 grid sm:grid-cols-[72px_1fr_auto] gap-3 items-center"
                    >
                      <div className="h-16 rounded-lg overflow-hidden bg-black/5">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="grid gap-1">
                        <strong>{item.name}</strong>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="bb-ghost-btn px-3 py-1"
                            onClick={() => cart.setQuantity(item.productId, item.quantity - 1)}
                          >
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            className="bb-ghost-btn px-3 py-1"
                            onClick={() => cart.setQuantity(item.productId, item.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="font-semibold">
                        {formatCents(item.unitPriceCents * item.quantity, item.currency)}
                      </div>
                    </article>
                  ))}
                </div>

                <div className="bb-public-product-card p-5 grid gap-3">
                  <div className="flex justify-between font-semibold">
                    <span>Subtotal</span>
                    <span>{formatCents(cart.subtotalCents, cart.currency)}</span>
                  </div>
                  <input
                    className="native-control-input px-4"
                    placeholder="Your name"
                    value={details.clientName}
                    onChange={(event) =>
                      setDetails((prev) => ({ ...prev, clientName: event.target.value }))
                    }
                  />
                  <input
                    className="native-control-input px-4"
                    placeholder="Email"
                    value={details.clientEmail}
                    onChange={(event) =>
                      setDetails((prev) => ({ ...prev, clientEmail: event.target.value }))
                    }
                  />
                  <input
                    className="native-control-input px-4"
                    placeholder="Phone"
                    value={details.clientPhone}
                    onChange={(event) =>
                      setDetails((prev) => ({ ...prev, clientPhone: event.target.value }))
                    }
                  />
                  <textarea
                    className="native-control-input px-4 py-3"
                    rows={2}
                    placeholder="Note (optional)"
                    value={details.clientNote}
                    onChange={(event) =>
                      setDetails((prev) => ({ ...prev, clientNote: event.target.value }))
                    }
                  />
                  <div className="grid gap-2">
                    <span className="text-sm font-semibold">Payment method</span>
                    <div className="bb-segment flex-wrap">
                      {(paymentOptions.length
                        ? paymentOptions
                        : [{ gatewayType: 'cash', name: 'Cash' }]
                      ).map((method) => (
                        <button
                          key={method.gatewayType || method.id}
                          type="button"
                          aria-pressed={paymentMethod === (method.gatewayType || method.id)}
                          onClick={() => setPaymentMethod(method.gatewayType || method.id)}
                        >
                          {method.name}
                        </button>
                      ))}
                    </div>
                    {(() => {
                      const selected =
                        paymentOptions.find((option) => option.gatewayType === paymentMethod) ||
                        null;
                      if (selected?.instructions) {
                        return <p className="bb-muted m-0 text-xs">{selected.instructions}</p>;
                      }
                      if (['stripe', 'paystack', 'card'].includes(paymentMethod)) {
                        return (
                          <p className="bb-muted m-0 text-xs">
                            Card checkout via {selected?.name || paymentMethod}. The studio confirms
                            the order; online capture lands with Firebase payments.
                          </p>
                        );
                      }
                      if (paymentMethod === 'manual_eft') {
                        return (
                          <p className="bb-muted m-0 text-xs">
                            Pay by EFT using the studio’s bank details. Mark as paid after transfer.
                          </p>
                        );
                      }
                      return (
                        <p className="bb-muted m-0 text-xs">
                          Pay in cash when you collect or at the studio.
                        </p>
                      );
                    })()}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="bb-ghost-btn" onClick={() => setPanel('shop')}>
                      Keep shopping
                    </button>
                    <button
                      type="button"
                      className="bb-primary-btn"
                      disabled={!details.clientName.trim()}
                      onClick={submit}
                    >
                      Place order
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
