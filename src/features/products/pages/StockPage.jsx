import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ArrowDownToLine, Boxes, Check, ChevronLeft, ChevronRight, Package, Pencil, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { FilterChip } from '../../../shared/ui/FilterChip';
import { PageBackButton } from '../../../shared/ui/PageBackButton';
import { useDetailDialog } from '../../../shared/ui/useDetailDialog';
import { navigate, workspacePagePath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { StockEditSheet, StockInfoSheet } from '../components/InventoryEditor';
import { ReportCategoryIcon } from '../../analytics/components/ReportCategoryIcon';
import { buildInventoryRows, flattenInventoryRows, inventoryCsv, paginatedInventory, selectInventoryUnits, summarizeInventory } from '../inventoryModel';
import { buildInventoryAdjustments } from '../inventoryAdjustments';
import '../styles/inventory.css';

const formatCount = value => new Intl.NumberFormat().format(typeof value === 'string' ? BigInt(value) : value);
const stockLabels = { healthy: 'In stock', low: 'Low stock', out: 'Out of stock', unset: 'Not tracked' };
const unitLabel = unit => [unit.name, unit.variantTitle].filter(Boolean).join(' · ');
const decodeId = value => { try { return decodeURIComponent(value || ''); } catch { return ''; } };

function useMobileInventory() {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 720px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 720px)');
    const change = () => setMobile(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  return mobile;
}

function PageSelection({ items, selected, onToggle }) {
  const ref = useRef(null);
  const count = items.filter(item => selected.has(item.id)).length;
  useEffect(() => { if (ref.current) ref.current.indeterminate = count > 0 && count < items.length; }, [count, items.length]);
  return <input ref={ref} type="checkbox" aria-label="Select all items on this page" checked={items.length > 0 && count === items.length} onChange={onToggle} disabled={!items.length} />;
}

function QuantityDialog({ units, onClose, onApply }) {
  const dialogRef = useDetailDialog(true, onClose, false);
  const [mode, setMode] = useState('set');
  const [value, setValue] = useState(units.length === 1 && units[0].quantity != null ? String(units[0].quantity) : '');
  const [error, setError] = useState('');
  const preview = useMemo(() => buildInventoryAdjustments(units, { mode, value }), [units, mode, value]);
  const apply = event => {
    event.preventDefault();
    if (!preview.ok) { setError(preview.error); return; }
    const result = onApply(preview.updates);
    if (result?.ok === false) { setError(result.error); return; }
    onClose();
  };
  return createPortal(
    <div className="native-ui bb-inventory-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="inventory-adjust-title">
      <div className="bb-inventory-dialog-backdrop" onClick={onClose} />
      <form className="bb-inventory-dialog-panel" onSubmit={apply}>
        <header><span className="bb-inventory-dialog-icon"><SlidersHorizontal size={22} /></span><div><h2 id="inventory-adjust-title">Adjust quantity</h2><p>{units.length === 1 ? unitLabel(units[0]) : `${formatCount(units.length)} selected stock items`}</p></div><button type="button" className="bb-inventory-icon-button" onClick={onClose} aria-label="Close quantity adjustment"><X size={18} /></button></header>
        <div className="bb-inventory-dialog-body">
          <div className="bb-inventory-mode" aria-label="Quantity adjustment type">{[['set', 'Set quantity'], ['add', 'Add stock'], ['remove', 'Remove stock']].map(([id, label]) => <button key={id} type="button" aria-pressed={mode === id} onClick={() => { setMode(id); setValue(''); setError(''); }}>{label}</button>)}</div>
          <label className="bb-inventory-adjust-field"><span>{mode === 'set' ? 'New quantity' : mode === 'add' ? 'Units to add' : 'Units to remove'}</span><input className="native-control-input" inputMode="numeric" autoFocus value={value} placeholder="Enter whole units" onChange={event => { setValue(event.target.value); setError(''); }} aria-describedby="inventory-adjust-help" /></label>
          <p id="inventory-adjust-help" className="bb-inventory-helper">{units.length > 1 ? `This ${mode === 'set' ? 'sets the quantity of' : mode === 'add' ? 'adds the same number to' : 'removes the same number from'} each selected item.` : 'Check the new quantity below before applying.'}</p>
          {preview.ok ? <div className="bb-inventory-preview"><div className="bb-inventory-preview-head"><span>Stock item</span><span>Before → After</span></div>{preview.previews.slice(0, 5).map(item => <div key={item.id}><span>{unitLabel(item)}</span><strong>{item.before == null ? 'Not tracked' : formatCount(item.before)} <span aria-hidden="true">→</span> {formatCount(item.after)}</strong></div>)}{units.length > 5 && <p>And {formatCount(units.length - 5)} more selected items.</p>}</div> : value && <p className="bb-inventory-error" role="alert">{preview.error}</p>}
          {error && <p className="bb-inventory-error" role="alert">{error}</p>}
        </div>
        <footer><Button action="cancel" onClick={onClose}>Cancel</Button><Button action="apply" variant="primary" type="submit" disabled={!preview.ok}>Apply {units.length > 1 ? `to ${formatCount(units.length)} items` : 'quantity'}</Button></footer>
      </form>
    </div>, document.body);
}

export function StockPage({ routeRest = [] }) {
  const { products = [], workspace, updateInventory, saveStatus, saveError, retrySave } = useWorkspace();
  const isMobile = useMobileInventory();
  const [query, setQuery] = useState('');
  const [filterId, setFilterId] = useState('all');
  const [sort, setSort] = useState('attention');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState(new Set());
  const [adjustUnits, setAdjustUnits] = useState(null);
  const [notice, setNotice] = useState('');
  const rows = useMemo(() => buildInventoryRows(products), [products]);
  const units = useMemo(() => flattenInventoryRows(rows), [rows]);
  const summary = useMemo(() => summarizeInventory(rows), [rows]);
  const [productId, setProductId] = useState(() => rows.find(row => row.attentionCount)?.id || rows[0]?.id || '');
  const chosenRow = rows.find(row => row.id === productId) || rows[0];
  const scopeUnits = useMemo(() => chosenRow ? flattenInventoryRows([chosenRow]) : [], [chosenRow]);
  const scopeSummary = useMemo(() => summarizeInventory(chosenRow ? [chosenRow] : []), [chosenRow]);
  const productOptions = useMemo(() => [...rows].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })), [rows]);
  const filtered = useMemo(() => selectInventoryUnits(scopeUnits, { query, filterId, sort }), [scopeUnits, query, filterId, sort]);
  const showStockState = id => {
    const first = selectInventoryUnits(units, { filterId: id })[0];
    if (first) setProductId(first.productId);
    setQuery(''); setFilterId(id);
  };
  useEffect(() => { if (!rows.some(row => row.id === productId)) setProductId(rows.find(row => row.attentionCount)?.id || rows[0]?.id || ''); }, [rows, productId]);
  const pagination = paginatedInventory(filtered, { page, pageSize });
  const selectedUnits = units.filter(unit => selected.has(unit.id));
  const mode = routeRest[0];
  const itemId = decodeId(routeRest[1]);
  const variantId = decodeId(routeRest[2]);
  const detailProduct = ['edit', 'info'].includes(mode) ? products.find(product => product.id === itemId) : null;
  const closeDetail = () => navigate(workspacePagePath('stock'));
  const openDetail = (product, detailMode, variant = '') => navigate(`${workspacePagePath('stock')}/${detailMode}/${encodeURIComponent(product.id)}${variant ? `/${encodeURIComponent(variant)}` : ''}`);

  useEffect(() => { setPage(1); setSelected(new Set()); }, [query, filterId, productId]);
  useEffect(() => { setSelected(prior => {
    const valid = new Set(units.map(unit => unit.id));
    const next = new Set([...prior].filter(id => valid.has(id)));
    return next.size === prior.size ? prior : next;
  }); }, [units]);
  useEffect(() => { if (!notice) return; const timeout = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timeout); }, [notice]);

  const applyUpdates = updates => {
    const result = updateInventory(updates);
    if (result.ok) setNotice('Inventory updated.');
    return result;
  };
  const toggleUnit = id => setSelected(prior => { const next = new Set(prior); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const togglePage = () => setSelected(prior => {
    const next = new Set(prior);
    const all = pagination.items.every(item => next.has(item.id));
    pagination.items.forEach(item => all ? next.delete(item.id) : next.add(item.id));
    return next;
  });
  const exportView = () => {
    const url = URL.createObjectURL(new Blob(['\uFEFF', inventoryCsv(filtered)], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url; link.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`${formatCount(filtered.length)} stock items exported.`);
  };
  const editor = detailProduct && mode === 'edit' ? <StockEditSheet product={detailProduct} initialVariantId={variantId} variant={isMobile ? 'page' : 'sheet'} onClose={closeDetail} onSave={applyUpdates} /> : null;
  const info = detailProduct && mode === 'info' ? <StockInfoSheet product={detailProduct} variant={isMobile ? 'page' : 'sheet'} onClose={closeDetail} onEdit={product => openDetail(product, 'edit')} /> : null;
  if (isMobile && detailProduct) return <div className="bb-inventory-detail-page">{editor || info}</div>;
  if (['edit', 'info'].includes(mode) && !detailProduct) return <div className="bb-inventory-empty"><Package size={30} /><h1>Stock item unavailable</h1><p>It may have been removed. Return to your inventory to choose another item.</p><Button action="back" onClick={closeDetail}>Back to inventory</Button></div>;

  const filters = [
    { id: 'all', label: 'All items', count: scopeSummary.unitCount },
    { id: 'attention', label: 'Needs attention', count: scopeSummary.attentionCount },
    { id: 'healthy', label: 'In stock', count: scopeSummary.counts.healthy },
    { id: 'low', label: 'Low stock', count: scopeSummary.counts.low },
    { id: 'out', label: 'Out of stock', count: scopeSummary.counts.out },
    { id: 'unset', label: 'Not tracked', count: scopeSummary.counts.unset },
    { id: 'nosku', label: 'No SKU', count: scopeSummary.missingSkuCount }
  ];
  return (
    <div className="bb-services-desk bb-inventory">
      <div className="bb-page-chrome"><header className="bb-services-desk-header"><div className="bb-services-desk-copy"><div className="bb-page-title-wrap"><PageBackButton /><span className="bb-page-title-main"><div className="bb-page-header-glow" aria-hidden="true" /><h1 className="bb-page-title bb-services-desk-title">Inventory</h1></span></div><p className="bb-inventory-lede">A clear view of your stock. Know what’s ready and what needs a top-up.</p></div><div className="bb-inventory-header-actions"><Button action="export" icon={ArrowDownToLine} onClick={exportView} disabled={!filtered.length}>Export view</Button><Button action="view" icon={Boxes} onClick={() => navigate(workspacePagePath('products'))}>Products</Button></div></header></div>
      <section className="bb-inventory-overview" aria-label="Inventory summary">
        <div className="bb-inventory-total"><span className="bb-inventory-overline"><ReportCategoryIcon category="inventory" /> Stock on your shelves</span><strong>{formatCount(summary.knownStockText)}</strong><span>{summary.quantityComplete ? 'units across your inventory' : `known units · ${formatCount(summary.counts.unset)} items not tracked`}</span><small>{formatCount(summary.productCount)} products · {formatCount(summary.unitCount)} stock items, including variants</small></div>
        <div className="bb-inventory-summary-metrics">{[
          { id: 'healthy', label: 'In stock', value: summary.counts.healthy, art: 'stock-healthy', tone: 'green', copy: 'Above your warning level' },
          { id: 'low', label: 'Running low', value: summary.counts.low, art: 'stock-low', tone: 'amber', copy: 'Ready for a top-up' },
          { id: 'out', label: 'Out of stock', value: summary.counts.out, art: 'stock-out', tone: 'rose', copy: 'Quantity is zero' }
        ].map(metric => <button type="button" key={metric.id} className={`bb-inventory-metric is-${metric.tone}`} onClick={() => showStockState(metric.id)} aria-label={`Show ${metric.label.toLowerCase()} items`}><span className="bb-inventory-metric-label"><ReportCategoryIcon category={metric.art} />{metric.label}</span><strong>{formatCount(metric.value)}</strong><span>{metric.copy}</span></button>)}</div>
      </section>
      <div className={`bb-inventory-health${summary.attentionCount ? ' has-alerts' : ''}`}><span className="bb-inventory-health-icon">{summary.attentionCount ? <AlertTriangle size={19} /> : <Check size={19} />}</span><div><strong>{summary.attentionCount ? `${formatCount(summary.attentionCount)} stock ${summary.attentionCount === 1 ? 'item needs' : 'items need'} restocking` : 'Your tracked stock is looking good'}</strong><span>{summary.attentionCount ? 'Each variant has its own warning, so the small details stay visible.' : 'Set a warning level on each item and we’ll flag it here when stock runs low.'}</span></div>{summary.attentionCount > 0 && <button type="button" onClick={() => showStockState('attention')}>Review items <ChevronRight size={15} /></button>}</div>
      {saveError ? <div className="bb-inventory-save-error" role="alert"><span>{saveError}</span><Button action="retry" onClick={retrySave}>Retry save</Button></div> : <p className="bb-inventory-persistence" aria-live="polite">{workspace.isDemo ? 'Demo changes stay on this device.' : saveStatus === 'saving' ? 'Saving changes…' : saveStatus === 'saved' ? 'Changes saved.' : 'Stock quantities are managed here.'}</p>}
      <section className="bb-inventory-register" aria-labelledby="inventory-register-title">
        <div className="bb-inventory-register-heading"><div><h2 id="inventory-register-title">Stock register</h2><p>Choose a product to manage its stock.</p></div><span>{formatCount(filtered.length)} {filtered.length === 1 ? 'item' : 'items'}{filtered.length !== scopeUnits.length ? ` of ${formatCount(scopeUnits.length)}` : ''}</span></div>
        <div className="bb-inventory-toolbar"><label className="bb-inventory-product-picker"><span>Product</span><select aria-label="Choose a product for stock register" value={chosenRow?.id || ''} onChange={event => { setProductId(event.target.value); setQuery(''); setFilterId('all'); }}>{!productOptions.length && <option value="">No products yet</option>}{productOptions.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label className="bb-inventory-search"><Search size={17} /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Variant name or SKU" aria-label="Search inventory" /></label><select aria-label="Sort inventory" value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}><option value="attention">Attention first</option><option value="name">Product name</option><option value="sku">SKU</option><option value="quantity-low">Quantity: low to high</option><option value="quantity-high">Quantity: high to low</option></select></div>
        <div className="bb-inventory-filters" aria-label="Stock filters">{filters.map(filter => <FilterChip key={filter.id} selected={filterId === filter.id} count={formatCount(filter.count)} onClick={() => setFilterId(filter.id)}>{filter.label}</FilterChip>)}</div>
        {selectedUnits.length > 0 && <div className="bb-inventory-selection" role="status"><span><Check size={16} />{formatCount(selectedUnits.length)} selected</span><div><Button action="edit" icon={SlidersHorizontal} variant="primary" onClick={() => setAdjustUnits(selectedUnits)}>Adjust selected</Button><button type="button" onClick={() => setSelected(new Set())}>Clear selection</button></div></div>}
        {!units.length ? <div className="bb-inventory-empty"><Package size={32} /><h3>Your stock starts here</h3><p>Add products, then manage quantities, variants and warning levels here.</p><Button action="add" variant="primary" onClick={() => navigate(workspacePagePath('products'))}>Add products</Button></div> : !filtered.length ? <div className="bb-inventory-empty"><Search size={28} /><h3>No stock items found</h3><p>Try a different search or clear the filters.</p><Button action="clear" onClick={() => { setQuery(''); setFilterId('all'); }}>Clear filters</Button></div> : <>
          <div className="bb-inventory-mobile-select"><PageSelection items={pagination.items} selected={selected} onToggle={togglePage} /><span>Select this page</span></div>
          <table className="bb-inventory-table"><caption className="bb-control-sr-only">Inventory quantities and warning levels</caption><thead><tr><th className="bb-inventory-check"><PageSelection items={pagination.items} selected={selected} onToggle={togglePage} /></th><th>Product / variant</th><th>SKU</th><th className="bb-inventory-quantity">Quantity</th><th>Warn at</th><th>Stock status</th><th><span className="bb-control-sr-only">Actions</span></th></tr></thead><tbody>{pagination.items.map(unit => <tr key={unit.id} className={`${selected.has(unit.id) ? 'is-selected ' : ''}is-${unit.stockState}`}>
            <td className="bb-inventory-check"><input type="checkbox" aria-label={`Select ${unitLabel(unit)}`} checked={selected.has(unit.id)} onChange={() => toggleUnit(unit.id)} /></td>
            <td className="bb-inventory-product-cell"><div className="bb-inventory-product"><span className="bb-inventory-thumbnail">{(unit.source.imageUrl || unit.source.imageUrls?.[0] || unit.product.imageUrls?.[0]) ? <img src={unit.source.imageUrl || unit.source.imageUrls?.[0] || unit.product.imageUrls?.[0]} alt="" loading="lazy" /> : <Package size={21} />}</span><div><button type="button" className="bb-inventory-product-name" onClick={() => openDetail(unit.product, 'info')}>{unit.variantTitle || unit.name}</button><span className="bb-inventory-variant">{unit.category || 'Product'}</span>{(unit.status !== 'active' || unit.available === false) && <small className="bb-inventory-publication">{unit.status !== 'active' ? unit.status : 'Unavailable to buy'}</small>}</div></div></td>
            <td className="bb-inventory-sku" data-label="SKU">{unit.sku || <span className="bb-inventory-muted">No SKU</span>}</td>
            <td className="bb-inventory-quantity" data-label="Quantity"><strong>{unit.quantity == null ? '—' : formatCount(unit.quantity)}</strong><small>{unit.quantity == null ? 'Not tracked' : 'units'}</small></td>
            <td className="bb-inventory-warning" data-label="Warn at">{formatCount(unit.lowStockThreshold)}<small> units</small></td>
            <td className="bb-inventory-status"><span className={`bb-inventory-badge is-${unit.stockState}`}><i aria-hidden="true" />{stockLabels[unit.stockState]}</span></td>
            <td className="bb-inventory-actions"><Button action="edit" icon={SlidersHorizontal} className="bb-inventory-adjust-button" onClick={() => setAdjustUnits([unit])} aria-label={`Adjust quantity for ${unitLabel(unit)}`}>Adjust</Button><button type="button" className="bb-inventory-icon-button" onClick={() => openDetail(unit.product, 'edit', unit.variantId)} aria-label={`Edit stock details for ${unitLabel(unit)}`} title="Edit stock details"><Pencil size={16} /></button></td>
          </tr>)}</tbody></table>
          <footer className="bb-inventory-pagination"><span>{formatCount(pagination.from)}–{formatCount(pagination.to)} of {formatCount(pagination.total)} items</span><label>Show <select aria-label="Stock items per page" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></label><div><button type="button" className="bb-inventory-icon-button" aria-label="Previous inventory page" disabled={pagination.page === 1} onClick={() => setPage(pagination.page - 1)}><ChevronLeft size={18} /></button><span>{pagination.page} / {pagination.pageCount}</span><button type="button" className="bb-inventory-icon-button" aria-label="Next inventory page" disabled={pagination.page === pagination.pageCount} onClick={() => setPage(pagination.page + 1)}><ChevronRight size={18} /></button></div></footer>
        </>}
      </section>
      <p className="bb-inventory-footnote">Quantities shown are the stock you’ve entered. Keep them up to date as items come in and go out.</p>
      {notice && <div className="bb-inventory-toast" role="status"><Check size={17} />{notice}</div>}
      {adjustUnits && <QuantityDialog units={adjustUnits} onClose={() => setAdjustUnits(null)} onApply={applyUpdates} />}
      {editor}{info}
    </div>
  );
}
