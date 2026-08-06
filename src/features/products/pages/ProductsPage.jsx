import { useMemo, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { PeriodSegmentedControl } from '../../../shared/ui/PeriodSegmentedControl';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { ProductOrdersDesk } from '../components/ProductOrdersDesk';
import {
  createProductId,
  formatProductPrice,
  formatStockNote,
  normalizeProduct
} from '../../../utils/products';

const emptyDraft = () => ({
  id: '',
  name: '',
  price: '',
  category: '',
  stockAvailable: '',
  description: '',
  image: '',
  quoteBased: false,
  active: true
});

export function ProductsPage() {
  const { products, orders, upsertProduct, removeProduct } = useWorkspace();
  const [mode, setMode] = useState('catalog');
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  const pendingCount = useMemo(
    () => orders.filter((order) => order.status === 'pending').length,
    [orders]
  );

  const openEdit = (product) => {
    setDraft({
      id: product.id,
      name: product.name || '',
      price: String(product.price ?? ''),
      category: product.category || '',
      stockAvailable: String(product.stockAvailable ?? ''),
      description: product.description || '',
      image: product.imageUrls?.[0] || '',
      quoteBased: Boolean(product.quoteBased || product.priceType === 'quote'),
      active: product.active !== false
    });
    setDraftOpen(true);
  };

  const saveDraft = () => {
    if (!draft.name.trim()) return;
    upsertProduct(
      normalizeProduct({
        ...draft,
        id: draft.id || createProductId(),
        priceType: draft.quoteBased ? 'quote' : 'fixed',
        imageUrls: draft.image ? [draft.image] : []
      })
    );
    setDraft(emptyDraft());
    setDraftOpen(false);
  };

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="bb-page-title text-3xl m-0">Products</h1>
          <p className="bb-muted m-0">Catalog and order fulfilment for Buy.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PeriodSegmentedControl
            ariaLabel="Products mode"
            value={mode}
            onChange={setMode}
            options={[
              { id: 'catalog', label: 'Catalog' },
              { id: 'orders', label: 'Orders', count: pendingCount }
            ]}
          />
          {mode === 'catalog' ? (
            <button
              type="button"
              className="bb-primary-btn"
              onClick={() => {
                setDraft(emptyDraft());
                setDraftOpen(true);
              }}
            >
              <Plus size={16} /> Add product
            </button>
          ) : null}
        </div>
      </header>

      {mode === 'catalog' ? (
        <section className="grid gap-3 md:grid-cols-2">
          {products.length === 0 ? (
            <div className="bb-panel p-6 bb-muted md:col-span-2">No products yet.</div>
          ) : (
            products.map((product) => (
              <article key={product.id} className="bb-panel overflow-hidden grid">
                <div className="h-44 bg-black/5">
                  {product.imageUrls?.[0] ? (
                    <img src={product.imageUrls[0]} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="p-4 grid gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid gap-1 min-w-0">
                      <h2 className="bb-page-title text-xl m-0">{product.name}</h2>
                      <p className="bb-muted m-0 text-sm line-clamp-2">{product.description}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button type="button" className="bb-ghost-btn" onClick={() => openEdit(product)}>
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="bb-ghost-btn"
                        onClick={() => removeProduct(product.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <p className="m-0 text-sm font-semibold text-ink">
                    {[formatProductPrice(product), formatStockNote(product)].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </article>
            ))
          )}
        </section>
      ) : (
        <ProductOrdersDesk />
      )}

      {draftOpen ? (
        <div className="fixed inset-0 z-40 bg-black/30 grid place-items-end md:place-items-center p-4">
          <div className="bb-panel w-full max-w-lg p-5 grid gap-3">
            <h2 className="bb-page-title text-2xl m-0">{draft.id ? 'Edit product' : 'New product'}</h2>
            <input
              className="native-control-input px-4"
              placeholder="Product name"
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="native-control-input px-4"
                placeholder="Price"
                disabled={draft.quoteBased}
                value={draft.price}
                onChange={(event) => setDraft((prev) => ({ ...prev, price: event.target.value }))}
              />
              <input
                className="native-control-input px-4"
                placeholder="Stock note"
                value={draft.stockAvailable}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, stockAvailable: event.target.value }))
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={draft.quoteBased}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, quoteBased: event.target.checked }))
                }
              />
              Quote-based (no cart price)
            </label>
            <input
              className="native-control-input px-4"
              placeholder="Category"
              value={draft.category}
              onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))}
            />
            <input
              className="native-control-input px-4"
              placeholder="Image URL"
              value={draft.image}
              onChange={(event) => setDraft((prev) => ({ ...prev, image: event.target.value }))}
            />
            <textarea
              className="native-control-input px-4 py-3"
              rows={3}
              placeholder="Description"
              value={draft.description}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, description: event.target.value }))
              }
            />
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, active: event.target.checked }))
                }
              />
              Visible on public Buy page
            </label>
            <div className="flex gap-2 justify-end">
              <button type="button" className="bb-ghost-btn" onClick={() => setDraftOpen(false)}>
                Cancel
              </button>
              <button type="button" className="bb-primary-btn" onClick={saveDraft}>
                Save product
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
