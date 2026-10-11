import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { resolveMarket, shippingQuote } from '../../../utils/markets';
import { MARKET_COUNTRIES } from '../../../config/marketCountries';

export function ShippingRatePreview({ workspace }) {
  const [country, setCountry] = useState('');
  const [chosen, setChosen] = useState([]);
  const [subtotal, setSubtotal] = useState('');
  const products = workspace.products || [];
  const options = products.flatMap((product) => product.variants?.length ? product.variants.map((variant) => ({ key: `${product.id}:${variant.id}`, productId: product.id, variantId: variant.id, label: `${product.name} · ${variant.title || variant.name || 'Option'}` })) : [{ key: product.id, productId: product.id, label: product.name }]);
  const result = useMemo(() => {
    if (!country || !chosen.length) return null;
    try { return shippingQuote(workspace.website || {}, country, options.filter((item) => chosen.includes(item.key)), Math.max(0, Math.round(Number(subtotal) * 100) || 0)); }
    catch (error) { return { error: error.message }; }
  }, [workspace.website, country, chosen, subtotal, products]);
  const countries = MARKET_COUNTRIES.filter((item) => resolveMarket(workspace.website || {}, item.code)?.enabled);
  return <section className="bb-panel bb-shipping-preview"><div><small className="bb-commerce-eyebrow">CHECK YOUR SETUP</small><h2>Preview a delivery fee</h2><p className="bb-muted">Uses the same shipping rules as checkout. Select a destination and sample basket; nothing is ordered or saved.</p></div>
    <div className="bb-commerce-field-grid"><label className="bb-market-field">Destination<select value={country} onChange={(event) => setCountry(event.target.value)}><option value="">Choose a market</option>{countries.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label><label className="bb-market-field">Merchandise subtotal ({workspace.currency || 'R'})<input className="native-control-input" type="number" min="0" step="0.01" placeholder="0.00" value={subtotal} onChange={(event) => setSubtotal(event.target.value)} /></label></div>
    <details className="bb-shipping-preview-products"><summary><span className="bb-shipping-basket-label">Sample basket</span><span>{chosen.length} selected</span><ChevronDown size={16} aria-hidden="true" /></summary>{options.map((item) => <label key={item.key}><input type="checkbox" checked={chosen.includes(item.key)} onChange={(event) => setChosen((previous) => event.target.checked ? [...previous, item.key] : previous.filter((key) => key !== item.key))} /><span>{item.label}</span></label>)}{!options.length && <p className="bb-muted">Add a product to test delivery fees.</p>}</details>
    <div className={`bb-shipping-preview-result${result?.error ? ' is-warning' : ''}`} role="status"><strong>{result?.error ? 'Setup needs attention' : result ? `${workspace.currency || 'R'} ${(result.amountInCents / 100).toFixed(2)} delivery` : 'Choose a destination and sample products'}</strong><span>{result?.error || (result ? `${result.profileIds.length} shipping profile${result.profileIds.length === 1 ? '' : 's'} applied, each charged once.` : 'Free-shipping thresholds apply to the merchandise subtotal.')}</span></div>
  </section>;
}
