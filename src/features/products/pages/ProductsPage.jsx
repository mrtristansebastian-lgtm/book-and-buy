import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import {
  collectProductCategories,
  createProductId,
  normalizeProduct
} from '../../../utils/products';
import { ProductCatalogCard } from '../components/ProductCatalogCard';
import { ProductEditorSheet } from '../components/ProductEditorSheet';

const emptyDraft = () => ({
  id: '',
  name: '',
  price: '',
  category: '',
  stockAvailable: '',
  stockLabel: '',
  hideStockOnCard: false,
  description: '',
  image: '',
  quoteBased: false,
  active: true
});

export function ProductsPage() {
  const {
    products,
    workspace,
    upsertProduct,
    removeProduct,
    setProductCategories
  } = useWorkspace();
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  const categories = useMemo(
    () => collectProductCategories(products, workspace.productCategories || []),
    [products, workspace.productCategories]
  );

  const openCreate = () => {
    setDraft(emptyDraft());
    setDraftOpen(true);
  };

  const openEdit = (product) => {
    setDraft({
      id: product.id,
      name: product.name || '',
      price: String(product.price ?? ''),
      category: product.category || '',
      stockAvailable: String(product.stockAvailable ?? ''),
      stockLabel: product.stockLabel || '',
      hideStockOnCard: Boolean(product.hideStockOnCard),
      description: product.description || '',
      image: product.imageUrls?.[0] || '',
      quoteBased: Boolean(product.quoteBased || product.priceType === 'quote'),
      active: product.active !== false
    });
    setDraftOpen(true);
  };

  const closeDraft = () => {
    setDraftOpen(false);
    setDraft(emptyDraft());
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
    closeDraft();
  };

  const addCategory = (label) => {
    const next = String(label || '').trim();
    if (!next) return;
    const merged = collectProductCategories(products, [
      ...(workspace.productCategories || []),
      next
    ]);
    setProductCategories?.(merged);
  };

  return (
    <div className="bb-services-desk">
      <header className="bb-services-desk-header">
        <div className="bb-services-desk-copy">
          <p className="bb-services-desk-eyebrow">Buy</p>
          <h1 className="bb-services-desk-title">Products</h1>
          <p className="bb-services-desk-lede">
            Your Buy catalog — same card language clients see on the public site.
          </p>
        </div>
        <button type="button" className="bb-primary-btn" onClick={openCreate}>
          <Plus size={16} /> Add product
        </button>
      </header>

      {products.length === 0 ? (
        <div className="bb-services-catalog-empty">
          No products yet. Add your first item.
        </div>
      ) : (
        <div className="bb-public-product-grid bb-services-catalog-grid">
          {products.map((product) => (
            <ProductCatalogCard
              key={product.id}
              product={product}
              onEdit={openEdit}
              onRemove={(item) => removeProduct(item.id)}
            />
          ))}
        </div>
      )}

      <ProductEditorSheet
        open={draftOpen}
        draft={draft}
        onChange={setDraft}
        onClose={closeDraft}
        onSave={saveDraft}
        onDelete={
          draft.id
            ? () => {
                removeProduct(draft.id);
                closeDraft();
              }
            : undefined
        }
        categories={categories}
        onAddCategory={addCategory}
      />
    </div>
  );
}
