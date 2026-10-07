import { useState } from 'react';
import { createDemoWorkspace } from '../../../data/demoWorkspace';
import { PublicSurfaceRenderer } from '../components/PublicSurfaceRenderer';

/** Local-only acceptance fixtures. No writes, analytics, or transactions. */
function fixture(type) {
  const base = createDemoWorkspace();
  base.slug = `profile-review-${type}`;
  base.website = { ...base.website, markets: undefined };
  if (type === 'services') base.products = [];
  if (type === 'products') base.services = [];
  if (type === 'sparse') {
    base.brandName = 'Independent Studio';
    base.website = { pages: {}, homeSubtext: 'Consultations by appointment.', bookFaq: [], reviews: [] };
    base.logoUrl = ''; base.phone = ''; base.email = '';
    base.products = [];
    base.services = [{ id: 'one', name: 'Initial consultation', duration: 30, price: 350, currency: 'R', active: true, imageUrls: [] }];
  }
  if (type === 'empty') { base.products = []; base.services = []; }
  if (type === 'extensive') {
    base.brandName = 'The Independent Workshop for Everyday Objects, Lessons and Creative Services';
    base.products = Array.from({ length: 120 }, (_, i) => ({ ...base.products[i % base.products.length], id: `product-${i}`, name: `Thoughtfully made studio essentials in a beautifully considered collection ${i + 1}`, category: `Collection ${i % 8 + 1}` }));
    base.services = Array.from({ length: 100 }, (_, i) => ({ ...base.services[i % base.services.length], id: `service-${i}`, name: `Individual guidance and practical hands-on learning session ${i + 1}`, category: `Speciality ${i % 6 + 1}` }));
  }
  return base;
}

export default function ProfileReview() {
  const [type, setType] = useState('mixed');
  const [workspace, setWorkspace] = useState(() => fixture('mixed'));
  const [page, setPage] = useState('home');
  const [itemId, setItemId] = useState('');
  return <main className="native-ui bb-shell bg-white">
    <div style={{ padding: '12px 16px', background: '#f6f7f9', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <label>Local review scenario <select aria-label="Local review scenario" value={type} onChange={(e) => { setType(e.target.value); setWorkspace(fixture(e.target.value)); setPage('home'); setItemId(''); }}>
        {['mixed', 'services', 'products', 'sparse', 'empty', 'extensive'].map((id) => <option key={id}>{id}</option>)}
      </select></label><span>Isolated preview · no transactions or analytics</span>
    </div>
    <PublicSurfaceRenderer workspace={workspace} page={page} itemId={itemId} preview
      onOpenPage={(next) => { setPage(next); setItemId(''); }}
      onOpenItem={(id, kind) => { if (kind) setPage(kind); setItemId(id); }}
      onCloseItem={() => setItemId('')} />
  </main>;
}
