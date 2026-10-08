import { useState } from 'react';
import { Globe2, Search, ChevronRight, Truck, ArrowUpRight, Package, CircleCheck, CircleAlert } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { navigate, workspacePagePath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { getMarkets, marketPatch, marketReadiness } from '../../../utils/markets';
import { CatalogAssignments } from './CatalogAssignments';
import { marketCountryName as countryName } from '../../../config/marketCountries';
import { MarketCountryPicker, MarketFlag } from '../components/MarketCountryPicker';
import './markets-settings.css';

export function MarketsSettingsPage({ detail = '' }) {
  const { workspace, updateWebsite } = useWorkspace();
  const website = workspace.website || {};
  const markets = getMarkets(website);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const current = markets.find(market => encodeURIComponent(market.id) === detail);
  const profiles = website.shippingProfiles || [];
  const marketPath = id => workspacePagePath(`settings/markets/${encodeURIComponent(id)}`);
  const patch = changes => updateWebsite(marketPatch(markets.map(market => market.id === current.id ? { ...market, ...changes } : market)));
  const add = async () => {
    if (creating || !country || markets.some(market => market.countryCode === country)) return;
    setCreating(true); setError('');
    try {
      await updateWebsite(marketPatch([...markets, { id: country, countryCode: country, enabled: false, catalogMode: 'all', productIds: [], variantKeys: [], serviceIds: [], shippingProfileIds: [] }]));
      navigate(marketPath(country));
    } catch (failure) { setError(failure.message || 'This market could not be added. Please retry.'); setCreating(false); }
  };

  if (detail === 'new') return <div className="bb-settings-content bb-commerce-settings bb-markets-page bb-market-setup">
    <section className="bb-panel bb-market-setup-card">
      <div className="bb-markets-card-head"><span className="bb-markets-icon"><Globe2 size={22} aria-hidden="true" /></span><div><h2>A new place to grow</h2><p>Search for a country or choose the rest of the world.</p></div></div>
      <MarketCountryPicker value={country} onChange={setCountry} markets={markets} label="Country or region" />
      {country && <div className="bb-market-selected-country"><MarketFlag code={country} name={countryName(country)} /><div><strong>{countryName(country)}</strong><span>Starts disabled while you set it up</span></div><CircleCheck size={18} aria-hidden="true" /></div>}
      <p className="bb-market-setup-note">Next, choose the products and services available here and connect delivery profiles. Enable the market when you’re ready.</p>
      {error && <p role="alert" className="bb-market-error">{error}</p>}
      <div className="bb-market-setup-actions"><Button action="cancel" onClick={() => navigate(workspacePagePath('settings/markets'))}>Cancel</Button><Button action="add" variant="primary" disabled={!country || markets.some(market => market.countryCode === country)} busy={creating} busyLabel="Adding market…" onClick={add}>Add market</Button></div>
    </section>
  </div>;

  if (detail && !current) return <div className="bb-settings-content bb-commerce-settings bb-markets-page"><section className="bb-panel bb-markets-empty"><Globe2 size={24} aria-hidden="true" /><h2>This market is no longer available</h2><p>Return to your markets to choose another country.</p><Button action="back" onClick={() => navigate(workspacePagePath('settings/markets'))}>Your markets</Button></section></div>;

  if (current) {
    const readiness = marketReadiness(workspace, current);
    const attention = readiness.emptyCatalog || readiness.shippingIssues;
    return <div className="bb-settings-content bb-commerce-settings bb-markets-page bb-market-settings-page">
      <section className="bb-panel bb-market-state-card">
        <div className="bb-markets-card-head"><span className="bb-market-country-mark"><MarketFlag code={current.countryCode} name={countryName(current.countryCode)} /></span><div><h2>Market availability</h2><p>{current.enabled ? 'Customers in this market can browse your available catalog.' : 'This market is disabled while you prepare it.'}</p></div><label className="bb-market-switch"><input type="checkbox" role="switch" aria-label={`Enable ${countryName(current.countryCode)} market`} checked={Boolean(current.enabled)} onChange={event => patch({ enabled: event.target.checked })} /><span aria-hidden="true" /></label></div>
        {current.countryCode === '*' && <p className="bb-market-world-note">Covers countries without their own market. A country’s dedicated market takes priority, even when disabled.</p>}
        <div className={`bb-market-health${attention ? ' needs-attention' : ''}`} role="status">{attention ? <CircleAlert size={17} aria-hidden="true" /> : <CircleCheck size={17} aria-hidden="true" />}<div><strong>{readiness.emptyCatalog ? 'Choose what’s available' : `${readiness.productCount} products · ${readiness.serviceCount} services`}</strong><p>{readiness.emptyCatalog ? 'Select items below or use your full catalog.' : readiness.shippingIssues ? `${readiness.shippingIssues} ${readiness.shippingIssues === 1 ? 'product needs' : 'products need'} a valid delivery profile before delivery checkout is available.` : readiness.productCount ? 'Delivery profiles are connected. Rates are checked at checkout.' : 'Services are ready without delivery profiles.'}</p></div></div>
      </section>
      <section className="bb-panel bb-market-catalog-card"><div className="bb-markets-card-head"><span className="bb-markets-icon"><Package size={21} aria-hidden="true" /></span><div><h2>Your catalog</h2><p>Choose what customers in this market can book or buy.</p></div></div><CatalogAssignments key={current.id} value={current} products={workspace.products} services={workspace.services} includeServices onChange={patch} /></section>
      <section className="bb-panel bb-market-shipping-card"><div className="bb-markets-card-head"><span className="bb-markets-icon"><Truck size={21} aria-hidden="true" /></span><div><h2>Delivery</h2><p>Connect shipping profiles for products. Services don’t need one.</p></div><a className="bb-market-text-link" href={`#${workspacePagePath('settings/shipping')}`}>Manage profiles <ArrowUpRight size={14} aria-hidden="true" /></a></div>
        {profiles.length ? <div className="bb-market-delivery-options">{profiles.map(profile => <label className="bb-market-profile" key={profile.id}><input type="checkbox" checked={(current.shippingProfileIds || []).includes(profile.id)} onChange={event => patch({ shippingProfileIds: event.target.checked ? [...(current.shippingProfileIds || []), profile.id] : (current.shippingProfileIds || []).filter(id => id !== profile.id) })} /><span><strong>{profile.name}</strong><small>{profile.enabled === false ? 'Disabled profile' : profile.productMode === 'selected' ? 'Selected products and variants' : 'All products'}</small></span></label>)}</div> : <div className="bb-market-delivery-empty"><p>No delivery profiles yet.</p><a className="bb-market-text-link" href={`#${workspacePagePath('settings/shipping')}`}>Create a shipping profile <ChevronRight size={15} aria-hidden="true" /></a></div>}
      </section>
    </div>;
  }

  const filtered = markets.filter(market => `${countryName(market.countryCode)} ${market.countryCode}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <div className="bb-settings-content bb-commerce-settings bb-markets-page">
    <section className="bb-panel bb-markets-list-card">
      <div className="bb-markets-list-heading"><div><h2>Your markets</h2><p>{markets.filter(market => market.enabled).length} active · {markets.length} total</p></div><Globe2 size={22} aria-hidden="true" /></div>
      <div className="bb-markets-toolbar"><div className="bb-search-field bb-markets-search"><Search size={17} className="bb-search-field-icon" aria-hidden="true" /><input className="native-search-input" type="search" aria-label="Search your markets" placeholder="Search your markets…" value={search} onChange={event => setSearch(event.target.value)} /></div><Button action="add" variant="primary" onClick={() => navigate(workspacePagePath('settings/markets/new'))}>Add market</Button></div>
      <div className="bb-markets-list">{filtered.map(market => {
        const readiness = marketReadiness(workspace, market);
        return <article className="bb-market-list-row" key={market.id}><span className="bb-market-country-mark"><MarketFlag code={market.countryCode} name={countryName(market.countryCode)} /></span><div className="bb-market-list-copy"><h3>{countryName(market.countryCode)}</h3><p>{readiness.productCount} products · {readiness.serviceCount} services</p></div><StatusBadge status={market.enabled ? 'active' : 'inactive'}>{market.enabled ? 'Active' : 'Disabled'}</StatusBadge><Button as="a" action="edit" href={`#${marketPath(market.id)}`} aria-label={`Edit ${countryName(market.countryCode)} market`} className="bb-market-edit">Edit market</Button></article>;
      })}</div>
      {!filtered.length && <div className="bb-markets-empty"><Globe2 size={24} aria-hidden="true" /><h3>{search ? 'No matching markets' : 'Your next market starts here'}</h3><p>{search ? 'Try another country name or country code.' : 'Add a country to choose its catalog and delivery options.'}</p>{search && <button className="bb-market-text-link" type="button" onClick={() => setSearch('')}>Clear search</button>}</div>}
    </section>
    <p className="bb-markets-footnote">New markets start disabled. Catalog and delivery settings apply as soon as your changes save.</p>
  </div>;
}
