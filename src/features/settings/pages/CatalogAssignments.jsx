import { useState } from 'react';
import { Box, CalendarDays, ChevronDown, Search } from 'lucide-react';

export function CatalogAssignments({ products = [], services = [], value, onChange, includeServices = false }) {
  const [search, setSearch] = useState('');
  const toggle = (field, id) => {
    const selected = new Set(value[field] || []);
    if (selected.has(id)) selected.delete(id); else selected.add(id);
    onChange({ [field]: [...selected] });
  };
  const modeField = includeServices ? 'catalogMode' : 'productMode';
  const matches = (item) => item.name?.toLowerCase().includes(search.trim().toLowerCase());
  const visibleProducts = products.filter(matches);
  const visibleServices = includeServices ? services.filter(matches) : [];
  const selectionCount = (value.productIds || []).length + (value.serviceIds || []).length
    + (value.variantKeys || []).filter((key) => !(value.productIds || []).includes(key.split(':')[0])).length;
  return <div className="bb-market-catalog">
    <label className="bb-market-field">Catalog availability
      <select className="native-control-input" value={value[modeField] || 'all'} onChange={(event) => onChange({ [modeField]: event.target.value })}>
        <option value="all">All products{includeServices ? ' and services' : ''} — including new additions</option>
        <option value="selected">Only selected products{includeServices ? ', variants and services' : ' and variants'}</option>
      </select>
    </label>
    {value[modeField] === 'selected' && <>
      <div className="bb-catalog-picker-heading"><span>Choose your catalog</span><small>{selectionCount} selected</small></div>
      <div className="bb-search-field bb-catalog-search"><Search size={16} aria-hidden="true" /><input className="native-search-input" aria-label="Search catalog" placeholder={includeServices ? 'Search products or services…' : 'Search products…'} value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      <div className="bb-market-assignment-list">
        {visibleProducts.map((product) => <div className="bb-market-assignment" key={product.id}>
          <label className="bb-catalog-choice"><input type="checkbox" checked={(value.productIds || []).includes(product.id)} onChange={() => toggle('productIds', product.id)} /><span className="bb-catalog-kind" aria-hidden="true"><Box size={18} /></span><span className="bb-catalog-choice-copy"><strong>{product.name}</strong><small>{product.variants?.length ? `Includes all ${product.variants.length} variants` : 'Product'}</small></span></label>
          {(product.variants || []).length > 0 && <details className="bb-catalog-variants"><summary><span>Choose individual variants</span><span className="bb-catalog-variant-count">{product.variants.length}</span><ChevronDown size={15} aria-hidden="true" /></summary>{product.variants.map((variant) => <label className="bb-catalog-variant-choice" key={variant.id}>
            <input type="checkbox" disabled={(value.productIds || []).includes(product.id)} checked={(value.productIds || []).includes(product.id) || (value.variantKeys || []).includes(`${product.id}:${variant.id}`)} onChange={() => toggle('variantKeys', `${product.id}:${variant.id}`)} />
            <span>{variant.name || Object.values(variant.optionValues || {}).join(' / ') || variant.sku || variant.id}</span>
          </label>)}</details>}
        </div>)}
        {visibleServices.map((service) => <label className="bb-market-assignment bb-catalog-choice" key={service.id}>
          <input type="checkbox" checked={(value.serviceIds || []).includes(service.id)} onChange={() => toggle('serviceIds', service.id)} /><span className="bb-catalog-kind" aria-hidden="true"><CalendarDays size={18} /></span><span className="bb-catalog-choice-copy"><strong>{service.name}</strong><small>Service</small></span>
        </label>)}
        {!visibleProducts.length && !visibleServices.length && <p className="bb-catalog-empty">{search.trim() ? 'No matches. Try another product or service name.' : `Add products${includeServices ? ' or services' : ''} to your catalog first.`}</p>}
      </div>
      <p className="bb-muted text-sm">New catalog items stay excluded until you select them. Selecting a product includes all its variants.</p>
    </>}
  </div>;
}
