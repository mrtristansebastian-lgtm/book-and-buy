import { EditableImage } from './editable';
import { AboutSection, FaqSection, VenueSection, WhatWeOfferSection, MapSection } from './home-sections';
import { profileCatalog } from '../profileModel';
import { navigate } from '../../../app/routing';
import { Button } from '../../../shared/ui/Button';

export function ProfileSetup({ workspace, updateWebsite, updateProfile }) {
  const website = workspace.website || {};
  const catalog = profileCatalog(workspace);
  const common = { website, editMode: true, patchWebsite: updateWebsite };
  const listPatch = (key, id, field, value) => updateWebsite({ [key]: (website[key] || []).map((row) => row.id === id ? { ...row, [field]: value } : row) });
  return <aside className="bb-profile-setup" aria-label="Profile setup">
    <header><span className="bb-profile-kicker">Your profile</span><h2>A little about your business</h2>
      <p>Your catalog is already connected. Add an introduction, then preview and publish when you’re ready. Photos and your story are optional.</p></header>
    <details open><summary>1. The essentials</summary><div className="bb-profile-setup-fields">
      <label>Business name<input className="native-control-input" value={workspace.brandName || ''} onChange={(e) => updateProfile({ brandName: e.target.value })} /></label>
      <label>Short introduction<textarea className="native-control-input" rows={3} value={website.homeSubtext || website.subcopy || workspace.tagline || ''}
        placeholder="What can customers come to you for?" onChange={(e) => updateWebsite({ homeSubtext: e.target.value, subcopy: e.target.value })} /></label>
      <p>Location and category come from Business settings. Contact details use your existing business information.</p>
      <Button action="edit" variant="secondary" onClick={() => navigate('/dashboard/settings')}>Business settings</Button>
    </div></details>
    <details><summary>2. What customers can do</summary><div className="bb-profile-setup-fields">
      <p>Customers browse services through Book and products through Buy. Prices and availability come from your existing items.</p>
      {['book', 'buy'].map((id) => <label className="bb-profile-setup-check" key={id}>
        <input type="checkbox" checked={website.pages?.[id] !== false && (id !== 'buy' || website.pages?.shop !== false)}
          onChange={(e) => updateWebsite({ pages: { ...website.pages, [id]: e.target.checked, ...(id === 'buy' ? { shop: e.target.checked } : {}) } })} />
        {id === 'book' ? `Book · ${catalog.services.length} services` : `Buy · ${catalog.products.length} products`}
      </label>)}
      <p>Empty catalogs are automatically hidden. Customers only see items available in their shopping country.</p>
      <div className="bb-profile-setup-links"><Button action="edit" variant="secondary" onClick={() => navigate('/dashboard/services')}>Services</Button><Button action="edit" variant="secondary" onClick={() => navigate('/dashboard/products')}>Products</Button></div>
    </div></details>
    <details><summary>3. Photos <small>Optional</small></summary><div className="bb-profile-setup-fields">
      <p>Profile photo · square. Cover · 3:1. You’ll see the exact crop before saving.</p>
      <EditableImage editMode compact preset="logo" storageFolder="brand" className="bb-setup-avatar" src={website.logoUrl || workspace.logoUrl || ''} alt="Profile photo" placeholderLabel="Add profile photo"
        onChange={(url) => { updateWebsite({ logoUrl: url }); updateProfile({ logoUrl: url }); }} />
      <EditableImage editMode preset="socialBanner" storageFolder="brand" className="bb-setup-cover" src={website.heroImageUrl || website.heroImage || ''} alt="Cover photo" placeholderLabel="Add cover photo" onChange={(url) => updateWebsite({ heroImageUrl: url, heroImage: '' })} />
      <p>Gallery photos use a consistent 3:2 frame and open at full size.</p>
      <VenueSection {...common} venueImages={website.venueImages || []} patchVenue={(id, field, value) => listPatch('venueImages', id, field, value)} />
    </div></details>
    <details><summary>4. Story & useful details <small>Optional</small></summary><div className="bb-profile-setup-fields">
      <p>Only add what helps a customer decide. Existing content stays here for you to keep or edit.</p>
      {[['about', 'Your story'], ['offerIntro', 'Business highlights'], ['gallery', 'Photos'], ['reviews', 'Reviews'], ['faq', 'FAQ'], ['map', 'Location']].map(([id, label]) =>
        <label className="bb-profile-setup-check" key={id}><input type="checkbox" checked={website.sections?.[id] !== false} onChange={(e) => updateWebsite({ sections: { ...website.sections, [id]: e.target.checked } })} />Show {label.toLowerCase()}</label>)}
      <AboutSection {...common} />
      <details><summary>Existing highlights</summary><WhatWeOfferSection {...common} reasons={website.reasons || []} patchReason={(id, field, value) => listPatch('reasons', id, field, value)} /></details>
      <FaqSection {...common} />
      <MapSection {...common} />
      <p>Reviews use the existing review source. Publishing never creates ratings or reviews.</p>
    </div></details>
    <details><summary>5. Footer & social links <small>Optional</small></summary><div className="bb-profile-setup-fields">
      <p>Client policies use your saved wording in Business settings.</p>
      <Button action="edit" variant="secondary" onClick={() => navigate('/dashboard/settings/policies')}>Edit client policies</Button>
      {['Instagram', 'Facebook', 'TikTok', 'YouTube', 'LinkedIn', 'X'].map(label => <label key={label}>{label}
        <input type="url" placeholder="https://" value={website.socialLinks?.[label.toLowerCase()] || ''}
          onChange={event => updateWebsite({ socialLinks: { ...website.socialLinks, [label.toLowerCase()]: event.target.value } })} />
      </label>)}
    </div></details>
  </aside>;
}
