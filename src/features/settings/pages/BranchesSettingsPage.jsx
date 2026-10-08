import { useMemo, useState } from 'react';
import { Building2, MapPin, Search, Phone, Mail, ArrowUpRight, Globe2, ShieldCheck } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { PlaceLocationField } from '../../../shared/ui/PlaceLocationField';
import { navigate, workspacePagePath } from '../../../app/routing';
import { MARKET_COUNTRIES } from '../../../config/marketCountries';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { validateBranches } from '../../../../functions/branchesDomain.js';
import './branches-settings.css';

const branchListPath = () => workspacePagePath('settings/locations/branches');
const newBranch = () => ({ id: `branch_${crypto.randomUUID().replaceAll('-', '')}`, name: '', address: '', googlePlaceId: '', locationLat: null, locationLng: null, countryCode: '', region: '', city: '', phone: '', email: '', mapLinkUrl: '', enabled: true, showOnWebsite: false, internalNote: '' });
const branchRows = website => Array.isArray(website.branches) ? website.branches : [];

function BranchEditor({ branch, creating }) {
  const { workspace, updateWebsite } = useWorkspace();
  const original = useMemo(() => JSON.stringify(branch), []);
  const [draft, setDraft] = useState(() => ({ ...branch }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pinReady = Number.isFinite(draft.locationLat) && Number.isFinite(draft.locationLng) && !(draft.locationLat === 0 && draft.locationLng === 0);
  const patch = changes => { setDraft(previous => ({ ...previous, ...changes })); setError(''); };
  const placeValue = useMemo(() => draft.address ? { label: draft.address, placeId: draft.googlePlaceId || '', lat: draft.locationLat ?? 0, lng: draft.locationLng ?? 0, countryCode: draft.countryCode || '', region: draft.region || '', city: draft.city || '' } : null, [draft]);
  const onPlace = place => patch(place ? { address: place.label || '', googlePlaceId: place.placeId || '',
    locationLat: Number.isFinite(place.lat) && Number.isFinite(place.lng) && !(place.lat === 0 && place.lng === 0) ? place.lat : null,
    locationLng: Number.isFinite(place.lat) && Number.isFinite(place.lng) && !(place.lat === 0 && place.lng === 0) ? place.lng : null,
    ...(place.placeId ? { countryCode: place.countryCode || '', region: place.region || '', city: place.city || '' } : {})
  } : { address: '', googlePlaceId: '', locationLat: null, locationLng: null });
  const submit = event => {
    event.preventDefault();
    if (busy) return;
    setError('');
    const rows = branchRows(workspace.website || {});
    const current = rows.find(row => row.id === draft.id);
    if (!creating && (!current || JSON.stringify(current) !== original)) { setError('This branch changed in another session. Return to your branches and open it again before saving.'); return; }
    if (creating && rows.some(row => row.id === draft.id)) { setError('This branch already exists. Return to your branches to edit it.'); return; }
    try {
      const branches = validateBranches(creating ? [...rows, draft] : rows.map(row => row.id === draft.id ? draft : row));
      setBusy(true);
      updateWebsite({ branches, ...(draft.showOnWebsite && draft.enabled ? { sections: { map: true } } : {}) });
      navigate(branchListPath());
    } catch (failure) { setError(failure.message || 'Check the branch details and try again.'); setBusy(false); }
  };
  const fields = [['city', 'City', 'Cape Town'], ['region', 'Province or region', 'Western Cape'], ['phone', 'Phone', '+27 …'], ['email', 'Email', 'hello@yourbusiness.com']];
  return <div className="bb-settings-content bb-branches-page bb-branch-editor">
    <form onSubmit={submit} className="bb-branch-form">
      <section className="bb-panel bb-branch-card">
        <div className="bb-branch-card-head"><span className="bb-branch-icon"><Building2 size={22} aria-hidden="true" /></span><div><h2>{creating ? 'A new place for your business' : 'Branch details'}</h2><p>A name, an address and a way to get in touch.</p></div></div>
        <label className="bb-settings-field bb-branch-field"><span>Branch name</span><input className="native-control-input" required maxLength={80} placeholder="e.g. City centre studio" value={draft.name} onChange={event => patch({ name: event.target.value })} /></label>
        <PlaceLocationField label="Branch address" placeholder="Search an address or enter it yourself" value={placeValue} onChange={onPlace} />
        <p className="bb-branch-field-hint">{pinReady ? 'Map pin added from your selected place.' : 'You can enter an address manually. Choose a suggested place to add its map pin.'}</p>
        <div className="bb-branch-field-grid">
          {fields.map(([field, label, placeholder]) => <label className="bb-settings-field bb-branch-field" key={field}><span>{label}<small>Optional</small></span><input className="native-control-input" type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'} autoComplete={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'off'} maxLength={field === 'email' ? 254 : field === 'phone' ? 40 : 100} placeholder={placeholder} value={draft[field] || ''} onChange={event => patch({ [field]: event.target.value })} /></label>)}
          <label className="bb-settings-field bb-branch-field"><span>Country<small>Optional</small></span><select className="native-control-input" value={draft.countryCode || ''} onChange={event => patch({ countryCode: event.target.value })}><option value="">Choose a country</option>{MARKET_COUNTRIES.map(country => <option value={country.code} key={country.code}>{country.label}</option>)}</select></label>
          <label className="bb-settings-field bb-branch-field"><span>Directions link<small>Optional</small></span><input className="native-control-input" type="url" maxLength={2048} placeholder="https://maps.google.com/…" value={draft.mapLinkUrl || ''} onChange={event => patch({ mapLinkUrl: event.target.value })} /></label>
        </div>
      </section>
      <section className="bb-panel bb-branch-card">
        <div className="bb-branch-card-head"><span className="bb-branch-icon"><Globe2 size={21} aria-hidden="true" /></span><div><h2>Availability &amp; visibility</h2><p>Choose when this branch is active and what customers see.</p></div></div>
        <label className="bb-branch-toggle"><span><strong>Active branch</strong><small>Keep a closed or upcoming branch on file by turning this off.</small></span><input type="checkbox" role="switch" checked={draft.enabled !== false} onChange={event => patch({ enabled: event.target.checked })} /><i aria-hidden="true" /></label>
        <label className="bb-branch-toggle"><span><strong>Show on your website</strong><small>Share this branch’s address and contact details in your Home location section. Only active branches appear.</small></span><input type="checkbox" role="switch" checked={draft.showOnWebsite === true} onChange={event => patch({ showOnWebsite: event.target.checked })} /><i aria-hidden="true" /></label>
      </section>
      <section className="bb-panel bb-branch-card bb-branch-note-card"><div className="bb-branch-card-head"><span className="bb-branch-icon"><ShieldCheck size={21} aria-hidden="true" /></span><div><h2>A note for your team</h2><p>Private to your business. It never appears on your website.</p></div></div><label className="bb-settings-field bb-branch-field"><span className="bb-control-sr-only">Internal branch note</span><textarea className="native-control-input" rows={3} maxLength={500} placeholder="Access instructions, a contact person, or anything useful…" value={draft.internalNote || ''} onChange={event => patch({ internalNote: event.target.value })} /></label></section>
      {error && <p className="bb-branch-error" role="alert">{error}</p>}
      <div className="bb-branch-actions"><Button action="cancel" onClick={() => navigate(branchListPath())}>Cancel</Button><Button type="submit" action="save" variant="primary" busy={busy} busyLabel="Saving branch…">{creating ? 'Add branch' : 'Save changes'}</Button></div>
      <p className="bb-branches-footnote">Branch details use your existing business settings. Bookings still use your business schedule.</p>
    </form>
  </div>;
}

export function BranchesSettingsPage({ detail = '' }) {
  const { workspace } = useWorkspace();
  const branches = branchRows(workspace.website || {});
  const [search, setSearch] = useState('');
  const [freshBranch] = useState(newBranch);
  const selected = branches.find(row => encodeURIComponent(row.id) === detail);
  if (detail === 'new') return <BranchEditor key={freshBranch.id} branch={freshBranch} creating />;
  if (selected) return <BranchEditor key={selected.id} branch={selected} creating={false} />;
  if (detail) return <div className="bb-settings-content bb-branches-page"><section className="bb-panel bb-branches-empty"><Building2 size={24} aria-hidden="true" /><h2>This branch is no longer available</h2><p>Return to your branches to choose another location.</p><Button action="back" onClick={() => navigate(branchListPath())}>Your branches</Button></section></div>;
  const filtered = branches.filter(row => `${row.name} ${row.address} ${row.city || ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <div className="bb-settings-content bb-branches-page">
    <section className="bb-panel bb-branch-card bb-branches-list-card">
      <div className="bb-branch-card-head"><span className="bb-branch-icon"><Building2 size={22} aria-hidden="true" /></span><div><h2>Your branches</h2><p>{branches.filter(branch => branch.enabled !== false).length} active · {branches.length} total</p></div></div>
      <div className="bb-branches-toolbar"><div className="bb-search-field bb-branches-search"><Search size={17} className="bb-search-field-icon" aria-hidden="true" /><input className="native-search-input" type="search" aria-label="Search your branches" placeholder="Search your branches…" value={search} onChange={event => setSearch(event.target.value)} /></div><Button action="add" variant="primary" disabled={branches.length >= 100} onClick={() => navigate(`${branchListPath()}/new`)}>Add branch</Button></div>
      <div className="bb-branches-list">{filtered.map(branch => <article className="bb-branch-row" key={branch.id}><span className="bb-branch-icon"><MapPin size={20} aria-hidden="true" /></span><div className="bb-branch-row-copy"><h3>{branch.name}</h3><p>{branch.address}</p><span className="bb-branch-row-status">{branch.enabled === false ? 'Inactive' : branch.showOnWebsite === true ? 'Active · Visible on your website' : 'Active · Private'}</span>{branch.phone || branch.email ? <div className="bb-branch-row-contact">{branch.phone && <span><Phone size={12} aria-hidden="true" />{branch.phone}</span>}{branch.email && <span><Mail size={12} aria-hidden="true" />{branch.email}</span>}</div> : null}</div><Button as="a" action="edit" href={`#${branchListPath()}/${encodeURIComponent(branch.id)}`} aria-label={`Edit ${branch.name} branch`}>Edit branch</Button></article>)}</div>
      {!filtered.length && <div className="bb-branches-empty"><Building2 size={27} aria-hidden="true" /><h3>{search ? 'No matching branches' : 'More places. The same business.'}</h3><p>{search ? 'Try another name, city or address.' : 'Add a studio, shop or office to keep your locations together.'}</p>{search && <button className="bb-branch-text-link" type="button" onClick={() => setSearch('')}>Clear search</button>}</div>}
    </section>
    <p className="bb-branches-footnote">Your primary venue stays in <a href={`#${workspacePagePath('settings/locations')}`}>Locations <ArrowUpRight size={12} aria-hidden="true" /></a>. New branches are private until you choose to show them.</p>
  </div>;
}
