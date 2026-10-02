import { useState } from 'react';
import { Globe2, Plus, ArrowUpRight, Truck } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { getMarkets, marketPatch, marketReadiness } from '../../../utils/markets';
import { CatalogAssignments } from './CatalogAssignments';
import { marketCountryName as countryName } from '../../../config/marketCountries';
import { MarketCountryPicker, MarketFlag } from '../components/MarketCountryPicker';

export function MarketsSettingsPage() {
  const { workspace, updateWebsite } = useWorkspace();
  const website = workspace.website || {};
  const markets = getMarkets(website);
  const [selected, setSelected] = useState(markets[0]?.id || '');
  const [country, setCountry] = useState('');
  const current = markets.find((market) => market.id === selected) || markets[0];
  const profiles = website.shippingProfiles || [];
  const readiness = current ? marketReadiness(workspace, current) : null;
  const patch = (changes) => updateWebsite(marketPatch(markets.map((market) => market.id === current.id ? { ...market, ...changes } : market)));
  const add = () => {
    if (!country || markets.some((market) => market.countryCode === country)) return;
    updateWebsite(marketPatch([...markets, { id: country, countryCode: country, enabled: false, catalogMode: 'all', productIds: [], variantKeys: [], serviceIds: [], shippingProfileIds: [] }]));
    setSelected(country); setCountry('');
  };
  return <div className="bb-settings-content bb-commerce-settings">
    <section className="bb-panel bb-commerce-intro"><Globe2 size={24} /><div><h2>Sell where your clients are</h2><p className="bb-muted">Control country availability, tailor your catalog and connect delivery options. New markets start disabled.</p></div><span className="bb-commerce-total">{markets.filter((market) => market.enabled).length} active</span></section>
    <section className="bb-panel bb-market-add"><MarketCountryPicker value={country} onChange={setCountry} markets={markets} /><button className="bb-btn" type="button" disabled={!country} onClick={add}><Plus size={16} /> Add market</button></section>
    <div className="bb-commerce-grid"><section className="bb-panel bb-market-index"><h2>Your markets</h2>{markets.length ? markets.map((market) => <button type="button" key={market.id} className={`bb-market-row${current?.id === market.id ? ' is-selected' : ''}`} aria-pressed={current?.id === market.id} onClick={() => setSelected(market.id)}><span className="bb-market-name"><MarketFlag code={market.countryCode} name={countryName(market.countryCode)} /><span>{countryName(market.countryCode)}</span></span><small>{market.enabled ? 'Active' : 'Disabled'}</small></button>) : <p className="bb-muted">Add your first country to get started. Until configured, your existing storefront remains unchanged.</p>}</section>
    {current && <section className="bb-panel bb-market-detail"><div className="bb-commerce-section-head"><div><small className="bb-commerce-eyebrow">MARKET SETTINGS</small><div className="bb-market-title"><MarketFlag code={current.countryCode} name={countryName(current.countryCode)} /><h2>{countryName(current.countryCode)}</h2></div></div><label className="bb-market-toggle"><input type="checkbox" checked={Boolean(current.enabled)} onChange={(event) => patch({ enabled: event.target.checked })} /> Enabled</label></div>
      {current.countryCode === '*' && <p className="bb-muted text-sm">Includes countries without their own market. A dedicated country market always takes priority, even when disabled.</p>}
      <div className={`bb-market-readiness${readiness.emptyCatalog || readiness.shippingIssues ? ' needs-attention' : ''}`} role="status">
        <strong>{readiness.emptyCatalog ? 'No visible catalog items' : `${readiness.productCount} products · ${readiness.serviceCount} services`}</strong>
        <p>{readiness.emptyCatalog ? 'This market has nothing for customers to browse. Select catalog items below or choose your full catalog.'
          : readiness.shippingIssues ? `${readiness.shippingIssues} ${readiness.shippingIssues === 1 ? 'product needs' : 'products need'} a valid, non-overlapping shipping profile before delivery checkout is available.`
          : readiness.productCount ? 'Catalog and delivery profiles are configured. Checkout validates delivery rates for each order.' : 'Services do not need a shipping profile.'}</p>
      </div>
      <CatalogAssignments value={current} products={workspace.products} services={workspace.services} includeServices onChange={patch} />
      <div className="bb-commerce-section-head"><div><h3><Truck size={17} /> Shipping profiles</h3><p className="bb-muted text-sm">Connect profiles for products sold in this country. Services do not require shipping.</p></div><a href="#/dashboard/settings/shipping">Create profile <ArrowUpRight size={14} /></a></div>
      {profiles.length ? profiles.map((profile) => <label className="bb-market-profile" key={profile.id}><input type="checkbox" checked={(current.shippingProfileIds || []).includes(profile.id)} onChange={(event) => patch({ shippingProfileIds: event.target.checked ? [...(current.shippingProfileIds || []), profile.id] : (current.shippingProfileIds || []).filter((id) => id !== profile.id) })} /><span>{profile.name}<small>{profile.enabled === false ? 'Disabled profile' : profile.productMode === 'selected' ? 'Selected products / variants' : 'All products'}</small></span></label>) : <p className="bb-commerce-empty">No shipping profiles yet. Create one in Shipping, then connect it here.</p>}
    </section>}</div>
  </div>;
}
