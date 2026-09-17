import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageBackButton } from '../../../shared/ui/PageBackButton';
import { navigate } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import {
  collectProductCategories,
  createProductId,
  normalizeProduct,
  productHasVariants
} from '../../../utils/products';
import { ProductCatalogCard } from '../components/ProductCatalogCard';
import { ProductEditorSheet } from '../components/ProductEditorSheet';
import { ProductInfoSheet } from '../components/ProductInfoSheet';

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

export function ProductsPage({ routeRest = [] }) {
  const {
    products,
    workspace,
    upsertProduct,
    removeProduct,
    setProductCategories
  } = useWorkspace();
  const isMobile = useIsMobileEditor();
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [viewProduct, setViewProduct] = useState(null);

  const mode = routeRest[0] || '';
  const editId = routeRest[1] || '';
  const pageEdit =
    isMobile && (mode === 'new' || (mode === 'edit' && Boolean(editId)));
  const pageView = isMobile && mode === 'view' && Boolean(editId);

  const categories = useMemo(
    () => collectProductCategories(products, workspace.productCategories || []),
    [products, workspace.productCategories]
  );

  useEffect(() => {
    if (!pageEdit) return;
    if (mode === 'new') {
      setDraft(emptyDraft());
      setDraftOpen(true);
      return;
    }
    if (mode === 'edit' && editId) {
      const existing = products.find((item) => item.id === editId);
      if (existing) {
        setDraft(toDraft(existing));
        setDraftOpen(true);
      } else {
        navigate('/dashboard/products');
      }
    }
  }, [pageEdit, mode, editId, products]);

  useEffect(() => {
    if (!pageView) return;
    const existing = products.find((item) => item.id === editId);
    if (existing) {
      setViewProduct(existing);
    } else {
      navigate('/dashboard/products');
    }
  }, [pageView, editId, products]);

  const openCreate = () => {
    if (isMobile) {
      navigate('/dashboard/products/new');
      return;
    }
    setDraft(emptyDraft());
    setDraftOpen(true);
  };

  const openEdit = (product) => {
    if (isMobile) {
      navigate(`/dashboard/products/edit/${product.id}`);
      return;
    }
    setViewProduct(null);
    setDraft(toDraft(product));
    setDraftOpen(true);
  };

  const openView = (product) => {
    if (isMobile) {
      navigate(`/dashboard/products/view/${product.id}`);
      return;
    }
    setViewProduct(product);
  };

  const closeDraft = () => {
    setDraftOpen(false);
    setDraft(emptyDraft());
    if (pageEdit) navigate('/dashboard/products');
  };

  const closeView = () => {
    setViewProduct(null);
    if (pageView) navigate('/dashboard/products');
  };

  const openEditFromView = (product) => {
    if (isMobile) {
      navigate(`/dashboard/products/edit/${product.id}`);
      return;
    }
    setViewProduct(null);
    setDraft(toDraft(product));
    setDraftOpen(true);
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

  const liveViewProduct = viewProduct
    ? products.find((item) => item.id === viewProduct.id) || viewProduct
    : null;

  if (pageView && liveViewProduct) {
    return (
      <ProductInfoSheet
        product={liveViewProduct}
        onClose={closeView}
        onEdit={openEditFromView}
        variant="page"
      />
    );
  }

  if (pageEdit && draftOpen) {
    return (
      <ProductEditorSheet
        open
        variant="page"
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
    );
  }

  return (
    <div className="bb-services-desk">
      <header className="bb-services-desk-header">
        <div className="bb-services-desk-copy">
          <div className="bb-page-title-wrap">
            <PageBackButton />
            <span className="bb-page-title-main">
              <div className="bb-page-header-glow" aria-hidden="true" />
              <h1 className="bb-page-title bb-services-desk-title">Products</h1>
            </span>
          </div>
        </div>
        <button type="button" className="bb-page-action" onClick={openCreate}>
          <Plus size={14} strokeWidth={2.35} aria-hidden="true" />
          Add product
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
              onView={openView}
              onEdit={openEdit}
              onRemove={(item) => removeProduct(item.id)}
              tapToView={isMobile}
            />
          ))}
        </div>
      )}

      {!isMobile ? (
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
      ) : null}

      {!isMobile && liveViewProduct ? (
        <ProductInfoSheet
          product={liveViewProduct}
          onClose={closeView}
          onEdit={openEditFromView}
        />
      ) : null}
    </div>
  );
}
