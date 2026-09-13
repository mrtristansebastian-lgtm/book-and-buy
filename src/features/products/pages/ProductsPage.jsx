import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import {
  collectProductCategories,
  createProductId,
  normalizeProduct,
  productHasVariants
} from '../../../utils/products';
import { ProductCatalogCard } from '../components/ProductCatalogCard';
import { ProductEditorSheet } from '../components/ProductEditorSheet';

const emptyDraft = () => ({
  id: '',
  name: '',
  price: '',
  compareAtPrice: '',
  currency: 'R',
  category: '',
  productType: '',
  vendor: '',
  tags: [],
  collections: [],
  description: '',
  imageUrls: [],
  options: [],
  variants: [],
  quoteBased: false,
  status: 'active',
  active: true
});

const toDraft = (product = {}) => {
  const normalized = normalizeProduct(product);
  return {
    id: normalized.id,
    name: normalized.name || '',
    price: String(normalized.price ?? ''),
    compareAtPrice: String(normalized.compareAtPrice ?? ''),
    currency: normalized.currency || 'R',
    category: normalized.category || '',
    productType: normalized.productType || '',
    vendor: normalized.vendor || '',
    tags: normalized.tags || [],
    collections: normalized.collections || [],
    description: normalized.description || '',
    imageUrls: normalized.imageUrls || [],
    options: normalized.options || [],
    variants: normalized.variants || [],
    quoteBased: Boolean(normalized.quoteBased),
    status: normalized.status || 'active',
    active: normalized.active !== false,
    // Inventory fields travel with the draft so Stock edits survive catalog saves
    sku: normalized.sku || '',
    stockAvailable: String(normalized.stockAvailable ?? ''),
    stockLabel: normalized.stockLabel || '',
    hideStockOnCard: Boolean(normalized.hideStockOnCard),
    weight: String(normalized.weight ?? ''),
    weightUnit: normalized.weightUnit || 'g',
    length: String(normalized.length ?? ''),
    width: String(normalized.width ?? ''),
    height: String(normalized.height ?? ''),
    dimensionUnit: normalized.dimensionUnit || 'cm',
    size: normalized.size || ''
  };
};

const mergeInventoryFromExisting = (draft, existing) => {
  if (!existing) {
    return {
      ...draft,
      sku: draft.sku || '',
      stockAvailable: draft.stockAvailable ?? '',
      stockLabel: draft.stockLabel || '',
      hideStockOnCard: Boolean(draft.hideStockOnCard),
      weight: draft.weight ?? '',
      weightUnit: draft.weightUnit || 'g',
      length: draft.length ?? '',
      width: draft.width ?? '',
      height: draft.height ?? '',
      dimensionUnit: draft.dimensionUnit || 'cm',
      size: draft.size || ''
    };
  }

  const draftVariants = Array.isArray(draft.variants) ? draft.variants : [];
  const existingById = new Map(
    (existing.variants || []).map((variant) => [variant.id, variant])
  );
  const existingByTitle = new Map(
    (existing.variants || []).map((variant) => [
      String(variant.title || '').toLowerCase(),
      variant
    ])
  );

  const variants = draftVariants.map((variant) => {
    const prior =
      existingById.get(variant.id) ||
      existingByTitle.get(String(variant.title || '').toLowerCase());
    if (!prior) return variant;
    return {
      ...variant,
      sku: variant.sku || prior.sku || '',
      stockAvailable:
        variant.stockAvailable !== '' && variant.stockAvailable != null
          ? variant.stockAvailable
          : prior.stockAvailable ?? '',
      weight:
        variant.weight !== '' && variant.weight != null
          ? variant.weight
          : prior.weight ?? '',
      weightUnit: variant.weightUnit || prior.weightUnit || 'g',
      length:
        variant.length !== '' && variant.length != null
          ? variant.length
          : prior.length ?? '',
      width:
        variant.width !== '' && variant.width != null
          ? variant.width
          : prior.width ?? '',
      height:
        variant.height !== '' && variant.height != null
          ? variant.height
          : prior.height ?? '',
      dimensionUnit:
        variant.dimensionUnit || prior.dimensionUnit || 'cm',
      size: variant.size || prior.size || ''
    };
  });

  return {
    ...draft,
    sku: existing.sku || draft.sku || '',
    stockAvailable: existing.stockAvailable ?? draft.stockAvailable ?? '',
    stockLabel: existing.stockLabel || draft.stockLabel || '',
    hideStockOnCard:
      typeof draft.hideStockOnCard === 'boolean'
        ? draft.hideStockOnCard
        : Boolean(existing.hideStockOnCard),
    weight: existing.weight ?? draft.weight ?? '',
    weightUnit: existing.weightUnit || draft.weightUnit || 'g',
    length: existing.length ?? draft.length ?? '',
    width: existing.width ?? draft.width ?? '',
    height: existing.height ?? draft.height ?? '',
    dimensionUnit: existing.dimensionUnit || draft.dimensionUnit || 'cm',
    size: existing.size || draft.size || '',
    variants: productHasVariants({ ...draft, variants })
      ? variants
      : []
  };
};

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
    setDraft(toDraft(product));
    setDraftOpen(true);
  };

  const closeDraft = () => {
    setDraftOpen(false);
    setDraft(emptyDraft());
  };

  const saveDraft = () => {
    if (!String(draft.name || '').trim()) return;
    const nextCategory = String(draft.category || '').trim();
    if (nextCategory) {
      const merged = collectProductCategories(products, [
        ...(workspace.productCategories || []),
        nextCategory
      ]);
      setProductCategories?.(merged);
    }
    const existing = products.find((item) => item.id === draft.id);
    const merged = mergeInventoryFromExisting(draft, existing);
    upsertProduct(
      normalizeProduct({
        ...merged,
        id: draft.id || createProductId(),
        priceType: draft.quoteBased ? 'quote' : 'fixed'
      })
    );
    closeDraft();
  };

  return (
    <div className="bb-services-desk">
      <header className="bb-services-desk-header">
        <div className="bb-services-desk-copy">
          <div className="bb-page-title-wrap">
            <div className="bb-page-header-glow" aria-hidden="true" />
            <h1 className="bb-page-title bb-services-desk-title">Products</h1>
          </div>
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
      />
    </div>
  );
}
