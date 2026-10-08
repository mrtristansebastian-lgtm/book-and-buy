import { useState } from 'react';
import { Truck, Search, Package, Globe2, ChevronDown, ChevronRight, ArrowUpRight, CircleAlert, Check } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { FilterChip } from '../../../shared/ui/FilterChip';
import { navigate, workspacePagePath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { getMarkets, marketPatch } from '../../../utils/markets';
import { marketCountryName } from '../../../config/marketCountries';
import { CatalogAssignments } from './CatalogAssignments';
import { ShippingRatePreview } from '../components/ShippingRatePreview';
import { MarketFlag } from '../components/MarketCountryPicker';
import { ShippingAmountField } from '../components/ShippingAmountField';
import './markets-settings.css';
import './shipping-settings.css';
const STEPS = [{ id: 'details', label: 'Details' }, { id: 'rates', label: 'Rates' }, { id: 'products', label: 'Products' }, { id: 'markets', label: 'Markets' }];

export function ShippingSettingsPage({ detail = '' }) {
  const { workspace, updateWebsite } = useWorkspace();
  const website = workspace.website || {};
  const profiles = website.shippingProfiles || [];
  const [search, setSearch] = useState('');
  const [step, setStep] = useState('details');
  const [draft, setDraft] = useState(() => ({ id: crypto.randomUUID(), name: '', customerFacingName: 'Standard delivery', enabled: false, productMode: 'all', productIds: [], variantKeys: [], rateCents: 0, freeAboveCents: null, deliveryEstimate: '' }));
  const [selectedMarkets, setSelectedMarkets] = useState([]);
  const [amountErrors, setAmountErrors] = useState({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const isNew = detail === 'new';
  const profile = isNew ? draft : profiles.find(item => encodeURIComponent(item.id) === detail);
  const profilePath = id => workspacePagePath(`settings/shipping/${encodeURIComponent(id)}`);
  const connectedMarkets = profile ? getMarkets(website).filter(market => (market.shippingProfileIds || []).includes(profile.id)) : [];
  const patch = changes => isNew ? setDraft(previous => ({ ...previous, ...changes })) : updateWebsite({ shippingProfiles: profiles.map(item => item.id === profile.id ? { ...item, ...changes } : item) });
  const add = async () => {
    if (!draft.name.trim() || Object.values(amountErrors).some(Boolean) || creating) return;
    setCreating(true); setError('');
    try {
      await updateWebsite({ shippingProfiles: [...profiles, { ...draft, name: draft.name.trim(), customerFacingName: draft.customerFacingName.trim() }], ...(selectedMarkets.length ? marketPatch(getMarkets(website).map(market => selectedMarkets.includes(market.id) ? { ...market, shippingProfileIds: [...new Set([...(market.shippingProfileIds || []), draft.id])] } : market)) : {}) });
      navigate(profilePath(draft.id));
    } catch (failure) { setError(failure.message || 'The profile could not be added. Please retry.'); setCreating(false); }
  };
  const fee = item => item.rateCents === 0 ? 'Free delivery' : `${workspace.currency || 'R'} ${(Number(item.rateCents || 0) / 100).toFixed(2)} per order`;
  const stepIndex = STEPS.findIndex(item => item.id === step);
  const goStep = target => {
    const targetIndex = STEPS.findIndex(item => item.id === target);
    if (targetIndex < 0) return;
    if (isNew && targetIndex > stepIndex && !draft.name.trim()) { setError('Add a profile name before continuing.'); setStep('details'); return; }
    if (step === 'rates' && Object.values(amountErrors).some(Boolean)) { setError('Enter valid delivery amounts before changing steps.'); return; }
    setError(''); setStep(target);
  };

  if (detail && !profile) return <div className="bb-settings-content bb-commerce-settings bb-markets-page"><section className="bb-panel bb-markets-empty"><Truck size={24} aria-hidden="true" /><h2>This profile is no longer available</h2><p>Return to Shipping to choose another profile.</p><Button action="back" onClick={() => navigate(workspacePagePath('settings/shipping'))}>Shipping profiles</Button></section></div>;

  if (profile) return <div className="bb-settings-content bb-commerce-settings bb-markets-page bb-shipping-page">
    <div className="bb-shipping-step-layout">
      <nav className="bb-services-setup-rail" aria-label="Shipping setup steps">
        <ol className="bb-services-setup-rail-list">
          {STEPS.map((item, index) => <li className={`bb-services-setup-rail-item is-${index === stepIndex ? 'current' : index < stepIndex ? 'done' : 'upcoming'}`} key={item.id}>
            <button className="bb-services-setup-rail-btn" type="button" disabled={creating || (isNew && index > stepIndex)} aria-current={index === stepIndex ? 'step' : undefined} onClick={() => goStep(item.id)}>
              <span className="bb-services-setup-rail-dot" aria-hidden="true">{index < stepIndex ? <Check size={12} strokeWidth={2.6} /> : index + 1}</span>
              <span className="bb-services-setup-rail-label">{item.label}</span>
            </button>
          </li>)}
        </ol>
      </nav>
      <div className="bb-shipping-step-stage">
    <section className="bb-panel bb-shipping-step-panel" hidden={step !== 'details'}><div className="bb-markets-card-head"><span className="bb-markets-icon"><Truck size={22} aria-hidden="true" /></span><div><h2>Profile details</h2><p>{profile.enabled !== false ? 'Available to the markets it’s connected to.' : 'Disabled while you set up your delivery option.'}</p></div><label className="bb-market-switch"><input type="checkbox" role="switch" aria-label="Enable shipping profile" checked={profile.enabled !== false} onChange={event => patch({ enabled: event.target.checked })} /><span aria-hidden="true" /></label></div>
      <div className="bb-commerce-field-grid bb-shipping-name-fields"><label className="bb-market-field">Profile name<input className="native-control-input" maxLength={80} placeholder="e.g. Local delivery" aria-required={isNew || undefined} value={profile.name} onChange={event => patch({ name: event.target.value })} /><small>Only you see this name.</small></label><label className="bb-market-field">Customer-facing name<input className="native-control-input" maxLength={80} placeholder="Standard delivery" value={profile.customerFacingName || ''} onChange={event => patch({ customerFacingName: event.target.value })} /><small>Shown at checkout. Leave blank to use “Delivery”.</small></label></div>
    </section>
    <section className="bb-panel bb-shipping-rates-card bb-shipping-step-panel" hidden={step !== 'rates'}><div className="bb-markets-card-head"><span className="bb-markets-icon"><Package size={21} aria-hidden="true" /></span><div><h2>Rates & delivery</h2><p>A clear, simple fee for each order using this profile.</p></div></div>
      <div className="bb-shipping-fee-summary"><span>{fee(profile)}</span><FilterChip selected={profile.rateCents === 0} onClick={() => patch({ rateCents: 0, freeAboveCents: null })}>Make delivery free</FilterChip></div>
      <div className="bb-commerce-field-grid"><ShippingAmountField key={`${profile.id}-rate`} label={`Shipping rate (${workspace.currency || 'R'})`} cents={profile.rateCents} hint={isNew ? 'Use 0 for free delivery. Added with your profile.' : 'Use 0 for free delivery. Saves when you leave the field.'} onValidityChange={valid => setAmountErrors(previous => ({ ...previous, rate: !valid }))} onChange={rateCents => patch({ rateCents })} /><ShippingAmountField key={`${profile.id}-threshold`} label="Free shipping above (optional)" cents={profile.freeAboveCents} optional hint="Based on the product subtotal, before delivery." onValidityChange={valid => setAmountErrors(previous => ({ ...previous, threshold: !valid }))} onChange={freeAboveCents => patch({ freeAboveCents })} /></div>
      <label className="bb-market-field bb-shipping-estimate">Delivery estimate<input className="native-control-input" maxLength={100} placeholder="e.g. 3–5 business days" value={profile.deliveryEstimate || ''} onChange={event => patch({ deliveryEstimate: event.target.value })} /></label>
    </section>
    <section className="bb-panel bb-market-catalog-card bb-shipping-step-panel" hidden={step !== 'products'}><div className="bb-markets-card-head"><span className="bb-markets-icon"><Package size={21} aria-hidden="true" /></span><div><h2>Products</h2><p>Choose which products use this delivery option.</p></div></div><CatalogAssignments key={profile.id} value={profile} products={workspace.products} onChange={patch} /></section>
    <section className="bb-panel bb-shipping-markets-card bb-shipping-step-panel" hidden={step !== 'markets'}><div className="bb-markets-card-head"><span className="bb-markets-icon"><Globe2 size={21} aria-hidden="true" /></span><div><h2>Connected markets</h2><p>Link this profile to the countries you deliver to.</p></div><a className="bb-market-text-link" href={`#${workspacePagePath('settings/markets')}`}>Manage markets <ArrowUpRight size={14} aria-hidden="true" /></a></div>
      {isNew && getMarkets(website).length ? <div className="bb-market-delivery-options">{getMarkets(website).map(market => <label className="bb-market-profile" key={market.id}><input type="checkbox" checked={selectedMarkets.includes(market.id)} onChange={event => setSelectedMarkets(previous => event.target.checked ? [...previous, market.id] : previous.filter(id => id !== market.id))} /><MarketFlag code={market.countryCode} /><span>{marketCountryName(market.countryCode)}</span></label>)}</div> : connectedMarkets.length ? <div className="bb-shipping-market-list">{connectedMarkets.map(market => <a key={market.id} href={`#${workspacePagePath(`settings/markets/${encodeURIComponent(market.id)}`)}`}><MarketFlag code={market.countryCode} /><span>{marketCountryName(market.countryCode)}</span><StatusBadge status={market.enabled && profile.enabled !== false ? 'connected' : 'inactive'}>{market.enabled && profile.enabled !== false ? 'Connected' : 'Inactive'}</StatusBadge><ChevronRight size={15} aria-hidden="true" /></a>)}</div> : <div className="bb-market-health needs-attention"><CircleAlert size={17} aria-hidden="true" /><div><strong>No markets connected yet</strong><p>Open a market, choose this profile in Delivery, then enable both when you’re ready.</p></div></div>}
    </section>
    {!isNew && step === 'rates' && <details className="bb-panel bb-shipping-check"><summary><div><strong>Check a delivery fee</strong><p>Try a sample basket using the same rules as checkout.</p></div><ChevronDown size={17} aria-hidden="true" /></summary><ShippingRatePreview workspace={workspace} /></details>}
    {error && <p className="bb-market-error" role="alert">{error}</p>}
      </div>
    </div>
    <footer className="bb-shipping-wizard-footer"><Button action="back" disabled={stepIndex === 0 || creating} onClick={() => goStep(STEPS[stepIndex - 1].id)}>Back</Button><span className="bb-shipping-step-count" aria-live="polite">Step {stepIndex + 1} of {STEPS.length}</span>{stepIndex < STEPS.length - 1 ? <Button action="next" variant="primary" onClick={() => goStep(STEPS[stepIndex + 1].id)}>Next</Button> : isNew ? <Button action="add" variant="primary" disabled={!draft.name.trim() || Object.values(amountErrors).some(Boolean)} busy={creating} busyLabel="Adding profile…" onClick={add}>Add profile</Button> : <Button action="done" variant="primary" onClick={() => navigate(workspacePagePath('settings/shipping'))}>Done</Button>}</footer>
    <p className="bb-markets-footnote">A specific product profile takes priority over your default. Each applied profile is charged once per order.</p>
  </div>;

  const filtered = profiles.filter(item => `${item.name} ${item.customerFacingName || ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <div className="bb-settings-content bb-commerce-settings bb-markets-page bb-shipping-page">
    <section className="bb-panel bb-markets-list-card"><div className="bb-markets-list-heading"><div><h2>Delivery profiles</h2><p>Simple rates, reusable across your markets.</p></div><Truck size={22} aria-hidden="true" /></div>
      <div className="bb-markets-toolbar"><div className="bb-search-field bb-markets-search"><Search size={17} className="bb-search-field-icon" aria-hidden="true" /><input className="native-search-input" type="search" aria-label="Search shipping profiles" placeholder="Search profiles…" value={search} onChange={event => setSearch(event.target.value)} /></div><Button action="add" variant="primary" onClick={() => navigate(workspacePagePath('settings/shipping/new'))}>Add profile</Button></div>
      <div className="bb-markets-list">{filtered.map(item => <article className="bb-market-list-row" key={item.id}><span className="bb-market-country-mark"><Truck size={20} aria-hidden="true" /></span><div className="bb-market-list-copy"><h3>{item.name}</h3><p>{item.customerFacingName || 'Delivery'} · {fee(item)}</p></div><StatusBadge status={item.enabled !== false ? 'active' : 'inactive'}>{item.enabled !== false ? 'Active' : 'Disabled'}</StatusBadge><Button as="a" action="edit" className="bb-market-edit" href={`#${profilePath(item.id)}`} aria-label={`Edit ${item.name} profile`}>Edit profile</Button></article>)}</div>
      {!filtered.length && <div className="bb-markets-empty"><Truck size={27} aria-hidden="true" /><h3>{search ? 'No matching profiles' : 'A thoughtful delivery experience starts here'}</h3><p>{search ? 'Try another profile or checkout name.' : 'Add a delivery profile, choose its products and connect it to your markets.'}</p>{search && <button type="button" className="bb-market-text-link" onClick={() => setSearch('')}>Clear search</button>}</div>}
    </section><p className="bb-markets-footnote">New profiles start disabled. Your customers see only the delivery options available for their order.</p>
  </div>;
}
