import { useState } from 'react';
import { Truck, Plus } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { getMarkets } from '../../../utils/markets';
import { CatalogAssignments } from './CatalogAssignments';
import { ShippingRatePreview } from '../components/ShippingRatePreview';
import { MarketFlag } from '../components/MarketCountryPicker';
import { ShippingAmountField } from '../components/ShippingAmountField';

export function ShippingSettingsPage() {
  const { workspace, updateWebsite } = useWorkspace();
  const website = workspace.website || {};
  const profiles = website.shippingProfiles || [];
  const [selected, setSelected] = useState(profiles[0]?.id || '');
  const profile = profiles.find((item) => item.id === selected) || profiles[0];
  const connectedMarkets = profile ? getMarkets(website).filter((market) => (market.shippingProfileIds || []).includes(profile.id)) : [];
  const patch = (changes) => updateWebsite({ shippingProfiles: profiles.map((item) => item.id === profile.id ? { ...item, ...changes } : item) });
  const add = () => {
    const id = crypto.randomUUID();
    let number = 1;
    while (profiles.some((item) => item.name === `Shipping profile ${number}`)) number += 1;
    updateWebsite({ shippingProfiles: [...profiles, { id, name: `Shipping profile ${number}`, customerFacingName: 'Standard delivery', enabled: false, productMode: 'all', productIds: [], variantKeys: [], rateCents: 0, freeAboveCents: null, deliveryEstimate: '' }] });
    setSelected(id);
  };
  return <div className="bb-settings-content bb-commerce-settings">
    <section className="bb-panel bb-commerce-intro"><Truck size={24} /><div><h2>Delivery, thoughtfully configured</h2><p className="bb-muted">Create reusable flat-rate or free shipping profiles. Assign your products, then connect each profile in Markets.</p></div><button className="bb-btn" type="button" onClick={add}><Plus size={16} /> Add profile</button></section>
    <div className="bb-commerce-grid"><section className="bb-panel bb-market-index"><h2>Shipping profiles</h2>{profiles.map((item) => <button className={`bb-market-row${item.id === profile?.id ? ' is-selected' : ''}`} type="button" key={item.id} aria-pressed={item.id === profile?.id} onClick={() => setSelected(item.id)}><span>{item.name}</span><small>{item.enabled ? 'Active' : 'Disabled'}</small></button>)}{!profiles.length && <p className="bb-muted">No profiles yet. Start with your standard delivery option.</p>}</section>
    {profile && <section className="bb-panel bb-market-detail"><div className="bb-commerce-section-head"><div><small className="bb-commerce-eyebrow">SHIPPING PROFILE</small><h2>{profile.name}</h2></div><label className="bb-market-toggle"><input type="checkbox" checked={profile.enabled !== false} onChange={(event) => patch({ enabled: event.target.checked })} /> Enabled</label></div>
      <div className="bb-commerce-field-grid">
        <label className="bb-market-field">Profile name<input className="native-control-input" maxLength={80} value={profile.name} onChange={(event) => patch({ name: event.target.value })} /><small className="bb-muted">Internal name. Only your team sees this in Shipping and Markets.</small></label>
        <label className="bb-market-field">Customer-facing name<input className="native-control-input" maxLength={80} placeholder="e.g. Standard delivery" value={profile.customerFacingName || ''} onChange={(event) => patch({ customerFacingName: event.target.value })} /><small className="bb-muted">Shown at checkout. Leave blank to use “Delivery”.</small></label>
      </div>
      <div className="bb-shipping-rate-mode"><strong>Delivery charge</strong><button type="button" aria-pressed={profile.rateCents === 0} onClick={() => patch({ rateCents: 0, freeAboveCents: null })}>Free delivery</button><span>{profile.rateCents === 0 ? 'Free for every order using this profile. Enter a rate below for flat-rate delivery.' : 'Flat rate, charged once per order using this profile.'}</span></div>
      <div className="bb-commerce-field-grid">
        <ShippingAmountField key={`${profile.id}-rate`} label={`Shipping rate (${workspace.currency || 'R'})`} cents={profile.rateCents} hint="Set to 0 for free shipping. Amounts save when you leave the field." onChange={(rateCents) => patch({ rateCents })} />
        <ShippingAmountField key={`${profile.id}-threshold`} label="Free shipping above (optional)" cents={profile.freeAboveCents} optional hint="Applies to the merchandise subtotal. Amounts save when you leave the field." onChange={(freeAboveCents) => patch({ freeAboveCents })} />
      </div>
      <label className="bb-market-field">Delivery estimate<input className="native-control-input" maxLength={100} placeholder="e.g. 3–5 business days" value={profile.deliveryEstimate || ''} onChange={(event) => patch({ deliveryEstimate: event.target.value })} /></label>
      <CatalogAssignments value={profile} products={workspace.products} onChange={patch} />
      <div className="bb-commerce-section-head"><h3>Connected markets</h3><a href="#/dashboard/settings/markets">Manage markets ↗</a></div>
      <div className="bb-shipping-connected-markets">{connectedMarkets.length ? connectedMarkets.map((market) => <a key={market.id} href="#/dashboard/settings/markets"><MarketFlag code={market.countryCode} /><span>{market.countryCode === '*' ? 'Rest of world' : new Intl.DisplayNames(['en'], { type: 'region' }).of(market.countryCode)}</span><small>{market.enabled && profile.enabled !== false ? 'Connected' : 'Inactive'}</small></a>) : <div className="bb-settings-explainer"><strong>Not connected to a market</strong><p>Enable this profile and connect it in Markets before clients can use it for delivery.</p><a href="#/dashboard/settings/markets">Connect in Markets →</a></div>}</div>
      <p className="bb-commerce-empty">Specific-product profiles override an all-product default. If an order uses several profiles, each profile’s rate is charged once. Avoid assigning the same product to multiple specific profiles.</p>
    </section>}</div>
    <ShippingRatePreview workspace={workspace} />
  </div>;
}
