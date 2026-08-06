import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { useCart } from '../hooks/useCart';
import { formatCents, formatProductPrice, formatStockNote } from '../../../utils/products';

export function PublicStorefront({ workspaceName }) {
  const { products, placeProductOrder, workspace } = useWorkspace();
  const cart = useCart();
  const [panel, setPanel] = useState('shop');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [details, setDetails] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientNote: ''
  });
  const [placed, setPlaced] = useState(null);

  const catalog = products.filter((product) => product.active !== false);

  const submit = () => {
    if (!cart.items.length || !details.clientName.trim()) return;
    const order = placeProductOrder({
      items: cart.items,
      client: details,
      paymentMethod
    });
    cart.clear();
    setPlaced(order);
    setPanel('done');
  };

  if (panel === 'done' && placed) {
    return (
      <section className="px-5 md:px-10 py-10 grid gap-4 max-w-2xl">
        <h1 className="bb-page-title text-4xl m-0">Order received</h1>
        <p className="bb-muted m-0">
          {workspaceName || workspace.brandName} will confirm fulfilment.
          Total {formatCents(placed.amountInCents, placed.currency)} via {placed.paymentMethod}.
        </p>
        <button
          type="button"
          className="bb-primary-btn justify-self-start"
          onClick={() => {
            setPlaced(null);
            setPanel('shop');
            setDetails({ clientName: '', clientEmail: '', clientPhone: '', clientNote: '' });
          }}
        >
          Keep shopping
        </button>
      </section>
    );
  }

  return (
    <section className="px-5 md:px-10 py-8 grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-2">
          <h1 className="bb-page-title text-4xl m-0">Shop</h1>
          <p className="bb-muted m-0">Kitchen goods and take-home sets from {workspaceName || workspace.brandName}.</p>
        </div>
        <button type="button" className="bb-ink-btn" onClick={() => setPanel(panel === 'cart' ? 'shop' : 'cart')}>
          <ShoppingBag size={16} />
          Cart ({cart.count})
        </button>
      </header>

      {panel === 'shop' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.map((product) => {
            const quote = product.quoteBased || product.priceType === 'quote';
            return (
              <article key={product.id} className="bb-panel overflow-hidden grid">
                <div className="h-48 bg-black/5">
                  {product.imageUrls?.[0] ? (
                    <img src={product.imageUrls[0]} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="p-4 grid gap-2 content-start">
                  <h2 className="bb-page-title text-xl m-0">{product.name}</h2>
                  <p className="bb-muted m-0 text-sm">{product.description}</p>
                  <p className="m-0 text-sm font-semibold">
                    {[formatProductPrice(product), formatStockNote(product)].filter(Boolean).join(' · ')}
                  </p>
                  {quote ? (
                    <p className="bb-muted m-0 text-sm">Contact the studio for a quote.</p>
                  ) : (
                    <button
                      type="button"
                      className="bb-primary-btn justify-self-start"
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
            <div className="bb-panel p-6 bb-muted">Your cart is empty.</div>
          ) : (
            <>
              <div className="grid gap-3">
                {cart.items.map((item) => (
                  <article key={item.productId} className="bb-panel p-4 grid sm:grid-cols-[72px_1fr_auto] gap-3 items-center">
                    <div className="h-16 rounded-lg overflow-hidden bg-black/5">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
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

              <div className="bb-panel p-4 grid gap-3">
                <div className="flex justify-between font-semibold">
                  <span>Subtotal</span>
                  <span>{formatCents(cart.subtotalCents, cart.currency)}</span>
                </div>
                <input
                  className="native-control-input px-4"
                  placeholder="Your name"
                  value={details.clientName}
                  onChange={(event) => setDetails((prev) => ({ ...prev, clientName: event.target.value }))}
                />
                <input
                  className="native-control-input px-4"
                  placeholder="Email"
                  value={details.clientEmail}
                  onChange={(event) => setDetails((prev) => ({ ...prev, clientEmail: event.target.value }))}
                />
                <input
                  className="native-control-input px-4"
                  placeholder="Phone"
                  value={details.clientPhone}
                  onChange={(event) => setDetails((prev) => ({ ...prev, clientPhone: event.target.value }))}
                />
                <textarea
                  className="native-control-input px-4 py-3"
                  rows={2}
                  placeholder="Note (optional)"
                  value={details.clientNote}
                  onChange={(event) => setDetails((prev) => ({ ...prev, clientNote: event.target.value }))}
                />
                <div className="bb-segment">
                  {[
                    { id: 'cash', label: 'Cash' },
                    { id: 'manual_eft', label: 'Manual EFT' },
                    { id: 'card', label: 'Card' }
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      aria-pressed={paymentMethod === method.id}
                      onClick={() => setPaymentMethod(method.id)}
                    >
                      {method.label}
                    </button>
                  ))}
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
    </section>
  );
}
